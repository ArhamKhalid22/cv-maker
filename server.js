const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const natural = require('natural');
// const { OpenAI } = require('openai'); // Removed per user request
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI Key helper removed

function getGeminiKey(req) {
  const headerKey = req.headers['x-gemini-key'];
  return (headerKey && String(headerKey).trim()) || (process.env.GEMINI_API_KEY || '');
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

// Middleware
app.use(cors());
app.use((req, res, next) => {
  // Helps identity providers reliably read the origin during FedCM/OAuth flows
  res.setHeader('Referrer-Policy', 'origin-when-cross-origin');
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store for generated PDFs
// Store for generated PDFs (Use /tmp for serverless/readonly envs)
const os = require('os');
const pdfsDir = path.join(os.tmpdir(), 'generated-pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir);
}

function normalizeSkillName(s) {
  const raw = String(s || '').trim();
  if (!raw) return '';
  // Frontend sometimes sends "Skill - Description"
  const split = raw.split(' - ');
  return (split[0] || raw).trim();
}

function uniqueNonEmptyStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const v of (arr || [])) {
    const s = String(v || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function sanitizeSkillItems(items) {
  if (!Array.isArray(items)) return items;
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const rawName = typeof it === 'string' ? it : it?.name;
    const rawDesc = typeof it === 'string' ? '' : it?.description;

    const name = normalizeSkillName(rawName);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let description = String(rawDesc || '').replace(/\s+/g, ' ').trim();
    // Avoid runaway repetition if model puts "Proficient in <name>" inside description
    if (description) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      description = description.replace(new RegExp(`^proficient\\s+in\\s+${escaped}\\s*(?:[-–—:]\\s*)?`, 'i'), '').trim();
      description = description.replace(/(\bwith practical experience\b)(?:\s+\1)+/gi, '$1');
    }

    out.push({ name, description });
  }
  return out;
}

function sanitizeJobTitle(title) {
  const t = String(title || '').trim();
  if (!t) return '';
  if (/professional\s+candidate/i.test(t)) return '';
  if (/target\s+role/i.test(t)) return '';
  if (/relevant\s+role/i.test(t)) return '';
  return t;
}

function sanitizeCoverLetterText(text) {
  let t = String(text || '');
  // Remove the known bad generic phrase if it slips through (AI or local).
  t = t.replace(/Professional Candidate position/gi, 'the advertised position');
  t = t.replace(/Professional Candidate/gi, 'the advertised position');
  return t;
}

// Suggested cover letter generator for when AI is unavailable
function generateSuggestedCoverLetter(title, skills, education, userName = "[Your Name]") {
  const cleanTitle = sanitizeJobTitle(title) || 'the advertised position';
  const cleanSkills = (skills || []).map(normalizeSkillName).filter(Boolean);
  const skillsList = cleanSkills.slice(0, 4).join(', ');
  const edu = education.length > 0 ? education[0] : 'my academic and professional background';

  // Make fallback regeneration produce fresh variations per click
  const hooks = [
    `I’m reaching out to apply for ${cleanTitle}.`,
    `I’m excited to submit my application for ${cleanTitle}.`,
    `I’m applying for ${cleanTitle} because it matches how I like to work: practical, detail-focused, and results-driven.`,
    `Please consider my application for ${cleanTitle}.`
  ];
  const valueProps = [
    `I’ve built a solid foundation through ${edu}${skillsList ? ` and hands-on work with ${skillsList}` : ''}.`,
    `My background in ${edu}${skillsList ? `, along with experience in ${skillsList}` : ''}, aligns well with what you’re looking for.`,
    `I bring a mix of fundamentals from ${edu}${skillsList ? ` plus practical skills in ${skillsList}` : ''}.`
  ];
  const motivations = [
    `What appeals to me is the chance to contribute to a team that values quality and momentum.`,
    `I’m drawn to the role because it looks like a place where ownership and clear execution matter.`,
    `I’m interested in this role because it blends problem-solving with real-world impact.`
  ];
  const closings = [
    `If it’s helpful, I’d be glad to share examples of projects and walk through how I approached them.`,
    `I’d welcome the opportunity to discuss how I can contribute in this role.`,
    `I’m happy to speak further and share more detail on the work I’ve done.`
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  return `Dear Hiring Manager,

${pick(hooks)} ${pick(valueProps)}

${pick(motivations)} I’m confident I can bring a strong level of ownership, communication, and follow-through to help the team hit its goals.

${pick(closings)}

I have attached my resume for your review and look forward to the opportunity to discuss my qualifications with you in more detail. Thank you for your time and consideration.

Kind regards,
${userName}`;
}

function generateRecommendations(skills, keywords) {
  const recommendations = [];

  if (skills.length > 0) {
    recommendations.push({
      type: 'skills',
      message: `Highlight these skills in your resume: ${skills.slice(0, 5).join(', ')}`
    });
  }

  if (keywords.some(k => k.category === 'technical')) {
    recommendations.push({
      type: 'technical',
      message: 'Include a Technical Skills section with relevant technologies'
    });
  }

  if (keywords.some(k => k.category === 'management')) {
    recommendations.push({
      type: 'leadership',
      message: 'Emphasize leadership and project management experience'
    });
  }

  return recommendations;
}

// Local fallback helper: try to extract a reasonable job title from a JD
function extractJobTitleFallback(jobDescription = '') {
  const text = String(jobDescription || '').replace(/\r\n/g, '\n');
  const lower = text.toLowerCase();

  // 0) Title often appears as the first meaningful line
  const firstLine = text
    .split('\n')
    .map(l => l.trim())
    .find(l => l && l.length <= 80);
  if (firstLine) {
    const roleWords = /(engineer|developer|analyst|scientist|manager|designer|specialist|consultant|coordinator|administrator|assistant|intern|lead|head)/i;
    if (roleWords.test(firstLine) && !/job description|about (us|the role)|responsibilities|requirements/i.test(firstLine)) {
      return firstLine;
    }
  }

  // 1) Explicit label patterns
  const labeled = text.match(/(?:^|\n)\s*(?:job\s*title|position|role)\s*:\s*(.+?)\s*$/im);
  if (labeled && labeled[1]) return labeled[1].trim();

  // 2) Common “We are hiring a/an X” patterns
  const hiring = text.match(/(?:hiring|seeking|looking\s+for)\s+(?:an?\s+)?([A-Z][A-Za-z0-9/&+\-., ]{2,60})(?:\n|\.|,)/m);
  if (hiring && hiring[1]) return hiring[1].trim();

  // 3) Try a shortlist of common titles (cheap + reliable)
  const commonTitles = [
    'Software Engineer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'Web Developer',
    'Marketing Manager',
    'Product Manager',
    'Data Analyst',
    'Data Scientist',
    'Sales Representative',
    'Graphic Designer',
    'UX Designer',
    'UI Designer'
  ];
  for (const title of commonTitles) {
    if (lower.includes(title.toLowerCase())) return title;
  }

  return null;
}

function guessJobTitleFromSignals(jobLower = '', extractedSkills = [], extractedKeywords = []) {
  const lower = String(jobLower || '').toLowerCase();
  const skills = (extractedSkills || []).map(s => String(s).toLowerCase());
  const hasAny = (...terms) => terms.some(t => lower.includes(t) || skills.some(s => s.includes(t)));

  // Tech
  if (hasAny('react', 'frontend', 'html', 'css')) return 'Frontend Developer';
  if (hasAny('node', 'backend', 'api', 'express')) return 'Backend Developer';
  if (hasAny('full stack', 'full-stack')) return 'Full Stack Developer';
  if (hasAny('python', 'sql', 'data analysis', 'tableau', 'power bi', 'excel')) return 'Data Analyst';
  if (hasAny('machine learning', 'ml', 'data science', 'pandas', 'tensorflow', 'pytorch')) return 'Data Scientist';

  // Business
  if (hasAny('marketing', 'seo', 'campaign', 'content')) return 'Marketing Specialist';
  if (hasAny('sales', 'crm', 'pipeline', 'quota')) return 'Sales Representative';
  if (hasAny('product', 'roadmap', 'stakeholder', 'requirements')) return 'Product Manager';
  if (hasAny('project management', 'agile', 'scrum', 'jira')) return 'Project Manager';

  // Default: unknown (don’t overwrite the UI with a fake title)
  return null;
}

// Job description analysis endpoint
app.post('/api/analyze-job', async (req, res) => {
  try {
    const { jobDescription, userName } = req.body;
    // const openaiKey = getOpenAIKey(req); // Removed
    const geminiKey = getGeminiKey(req);
    const undetectableKey = req.headers['x-undetectable-key'];

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6953cdac-8acd-439e-a8c6-252d8b296cad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'H1', location: 'server.js:/api/analyze-job:entry', message: 'Analyze request received', data: { hasOpenAIKey: !!req.headers['x-openai-key'], hasGeminiKey: !!req.headers['x-gemini-key'], hasUndetectableKey: !!req.headers['x-undetectable-key'], jobDescriptionLen: String(jobDescription || '').length, hasUserName: !!userName }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log

    let analysis = null;
    const namePlaceholder = userName || "[Your Name]";

    const prompt = `
      Analyze the following job description and extract key information for an ATS-optimized resume.

      ATS OPTIMIZATION RULES:
      1. Extract high-frequency keywords and hard skills.
      2. Use standard job titles and industry terminology.
      3. Focus on matching the candidate's profile to the "Must-have" requirements.

      CRITICAL INSTRUCTION FOR WRITING STYLE (ZERO AI DETECTION):
      - Write in a highly human, natural, and professional tone.
      - AVOID generic AI filler words and cliches.
      - Use "bursty" writing: vary sentence lengths significantly.
      - Use active voice and personal storytelling where appropriate.
      - Make the content sound authentic, direct, and slightly conversational yet professional.
      - Do NOT use typical AI transition words like "Furthermore", "Moreover", or "In conclusion".

      Return ONLY a valid JSON object with the following structure:
      {
        "extractedSkills": ["skill1", "skill2", ...],
        "extractedKeywords": [{"skill": "skill1", "category": "technical/soft/management/etc"}],
        "educationRequirements": ["degree1", ...],
        "experienceRequirement": "e.g. 5+ years",
        "suggestedTitle": "Professional Job Title",
        "professionalSummary": "A concise, 3-4 sentence ATS-optimized professional summary tailored to this role.",
        "recommendations": [{"type": "skills/technical/leadership", "message": "specific advice to pass ATS filters"}],
        "suggestedCoverLetter": "A full professional, HUMAN-sounding cover letter. End with 'Kind regards,' followed by ${namePlaceholder}."
      }

      Job Description:
      ${jobDescription}
    `;

    // --- APPROACH 1: GOOGLE GEMINI (Primary) ---
    if (geminiKey) {
      try {
        console.log('Attempting analysis with Google Gemini...');
        const genAI = new GoogleGenerativeAI(geminiKey);
        // Try a current model first, fallback to a stronger one
        let model;
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          analysis = JSON.parse(response.text().match(/\{[\s\S]*\}/)[0]);
        } catch (e) {
          console.warn('Gemini 2.5 Flash failed, trying gemini-2.5-pro...');
          model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          analysis = JSON.parse(response.text().match(/\{[\s\S]*\}/)[0]);
        }
      } catch (geminiError) {
        console.warn('Gemini Analysis failed:', geminiError.message);
      }
    }

    // --- APPROACH 2: OPENAI (Removed) ---
    // User requested to remove OpenAI support.
    /*
    if (!analysis && openaiKey && (openaiKey.startsWith('sk-') || openaiKey.startsWith('sk-proj-'))) {
       ...
    }
    */

    if (!analysis) {
      // --- APPROACH 3: LOCAL FALLBACK ---
      const tokenizer = new natural.WordTokenizer();
      const jobLower = jobDescription.toLowerCase();

      const skillKeywords = {
        'technical': ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'api', 'git', 'docker', 'aws', 'cloud'],
        'soft': ['communication', 'leadership', 'teamwork', 'problem-solving', 'analytical', 'creative', 'organized', 'detail-oriented'],
        'management': ['project management', 'agile', 'scrum', 'budget', 'team', 'stakeholder', 'strategy']
      };

      const extractedSkills = [];
      const extractedKeywords = [];

      Object.keys(skillKeywords).forEach(category => {
        skillKeywords[category].forEach(skill => {
          if (jobLower.includes(skill.toLowerCase())) {
            extractedSkills.push(skill);
            extractedKeywords.push({ skill, category });
          }
        });
      });

      const educationPatterns = [/bachelor|b\.?s\.?|b\.?a\.?/gi, /master|m\.?s\.?|m\.?a\.?|mba/gi, /degree|diploma/gi];
      const educationRequirements = [];
      educationPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        if (matches) educationRequirements.push(...matches);
      });

      const experiencePattern = /(\d+)\+?\s*(years?|yrs?)/gi;
      const experienceMatches = jobDescription.match(experiencePattern);
      const experienceRequirement = experienceMatches ? experienceMatches[0] : null;

      // Title extraction from description:
      // - If we can confidently extract a title, return it.
      // - Otherwise, do NOT send a placeholder title back to the UI (leave it unchanged).
      const suggestedTitle =
        extractJobTitleFallback(jobDescription) ||
        guessJobTitleFromSignals(jobLower, extractedSkills, extractedKeywords);
      const rolePhrase = suggestedTitle || 'this role';

      analysis = {
        extractedSkills: [...new Set(extractedSkills)],
        extractedKeywords: extractedKeywords,
        educationRequirements: [...new Set(educationRequirements)],
        experienceRequirement,
        ...(suggestedTitle ? { suggestedTitle } : {}),
        professionalSummary: `Experienced professional with a strong background in the industry, dedicated to delivering high-quality results in ${rolePhrase}.`,
        recommendations: generateRecommendations(extractedSkills, extractedKeywords),
        suggestedCoverLetter: generateSuggestedCoverLetter(suggestedTitle || 'the advertised position', extractedSkills, educationRequirements, namePlaceholder),
        note: "Using local analysis (AI APIs unavailable)"
      };
    }

    // --- HUMANIZATION STEP (Optional) ---
    if (undetectableKey && analysis.suggestedCoverLetter) {
      try {
        const response = await fetch('https://api.undetectable.ai/v2/humanize', {
          method: 'POST',
          headers: { 'api-key': undetectableKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: analysis.suggestedCoverLetter, readability: "University", purpose: "General Writing" })
        });
        const data = await response.json();
        if (data.output) {
          analysis.suggestedCoverLetter = data.output;
          analysis.humanized = true;
        }
      } catch (e) { console.warn('Undetectable AI failed:', e.message); }
    }

    if (analysis?.suggestedCoverLetter) {
      analysis.suggestedCoverLetter = sanitizeCoverLetterText(analysis.suggestedCoverLetter);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6953cdac-8acd-439e-a8c6-252d8b296cad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'H4', location: 'server.js:/api/analyze-job:exit', message: 'Analyze responding', data: { hasAnalysis: !!analysis, suggestedTitle: analysis?.suggestedTitle || null, coverLetterHasProfessionalCandidate: /Professional Candidate/i.test(String(analysis?.suggestedCoverLetter || '')), note: analysis?.note || null }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing job description:', error);
    res.status(500).json({ error: 'Failed to analyze job description' });
  }
});

// Regenerate section endpoint
app.post('/api/regenerate-section', async (req, res) => {
  try {
    const { jobDescription, userName, sectionType, userContext } = req.body;
    // const openaiKey = getOpenAIKey(req); // Removed
    const geminiKey = getGeminiKey(req);

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    let content = null;
    const namePlaceholder = userName || "the candidate";

    const normalizedSkillNames = uniqueNonEmptyStrings((userContext?.skills || []).map(normalizeSkillName));

    const dbgHasOpenAI = !!openaiKey && (String(openaiKey).startsWith('sk-') || String(openaiKey).startsWith('sk-proj-'));
    const dbgHasGemini = !!geminiKey;
    let dbgPathUsed = 'none';

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6953cdac-8acd-439e-a8c6-252d8b296cad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'H1', location: 'server.js:/api/regenerate-section:entry', message: 'Regenerate request received', data: { sectionType, jobDescriptionLen: String(jobDescription || '').length, hasUserName: !!userName, hasGeminiKey: dbgHasGemini, hasOpenAIKey: dbgHasOpenAI }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log

    // Format user context for the prompt
    const skillsContext = normalizedSkillNames.length > 0 ? `My skills include: ${normalizedSkillNames.join(', ')}.` : '';
    const experienceContext = userContext?.experience?.length > 0 ?
      `My experience includes: ${userContext.experience.map(e => `${e.position} at ${e.company}`).join(', ')}.` : '';

    let prompt = "";
    let isJsonResponse = false;

    switch (sectionType) {
      case 'summary':
        prompt = `Write an ATS-optimized, professional summary for ${namePlaceholder} specifically tailored to this job description: ${jobDescription}. 
        ${skillsContext} ${experienceContext}
        Focus on matching the core requirements and using relevant keywords from the description. 
        Keep it to 3-4 concise, impactful sentences in the first person.`;
        break;
      case 'skills':
        prompt = `Extract the 5 most important ATS keywords and skills from this job description: ${jobDescription}. 
        Prioritize hard skills and specific technologies mentioned.
        Return EXACTLY 5 items.
        Return ONLY a JSON object with this structure: {"content": [{"name": "Skill Name", "description": "Short 1-line proof of proficiency or context from the job"}]}`;
        isJsonResponse = true;
        break;
      case 'experience':
        prompt = `Generate 3 ATS-friendly, achievement-oriented bullet points for a work experience entry for ${namePlaceholder} that directly addresses the requirements in this job description: ${jobDescription}. 
        CRITICAL: Use the STAR method (Situation, Task, Action, Result). 
        CRITICAL: Include at least one quantifiable metric or percentage in each bullet point (e.g., "Increased efficiency by 15%", "Managed a budget of $50k").
        Use strong action verbs.
        Return ONLY a JSON object with this structure: {"content": [{"company": "Target Industry Company", "position": "Relevant Job Title", "period": "2020-Present", "responsibilities": ["bullet 1", "bullet 2", "bullet 3"]}]}`;
        isJsonResponse = true;
        break;
      case 'achievements':
        prompt = `Generate 3 professional achievements for ${namePlaceholder} that demonstrate the specific competencies requested in this job description: ${jobDescription}. 
        Make them ATS-optimized by using industry-standard terminology. 
        Return ONLY a JSON object with this structure: {"content": ["Achievement 1", "Achievement 2", "Achievement 3"]}`;
        isJsonResponse = true;
        break;
      case 'cover-letter':
        const varietyPrompts = [
          "Focus on how my specific skills solve their immediate problems.",
          "Focus on my career growth and how this role is the perfect next step.",
          "Focus on my alignment with the company's mission and values.",
          "Use a bold, confident tone highlighting my biggest achievements.",
          "Use a professional, humble tone focusing on my dedication and work ethic."
        ];
        const randomFocus = varietyPrompts[Math.floor(Math.random() * varietyPrompts.length)];

        prompt = `Write a UNIQUE, professional, and human-sounding cover letter for ${namePlaceholder} tailored specifically to this job description.
        
        CRITICAL: Identify the TARGET JOB TITLE from the job description. Do NOT use "Professional Candidate". If you cannot find a title, use "the advertised position".
        
        VARIETY INSTRUCTION: ${randomFocus}
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        CANDIDATE CONTEXT:
        - Name: ${namePlaceholder}
        - Current Title: ${userContext?.title || 'Professional'}
        - Key Skills: ${normalizedSkillNames.join(', ') || 'Relevant industry skills'}
        - Experience: ${userContext?.experience?.map(e => `${e.position} at ${e.company}`).join('; ') || 'Relevant work history'}
        
        INSTRUCTIONS:
        1. Address the specific requirements mentioned in the job description using the candidate's actual skills and experience provided above.
        2. Every time this is generated, use a DIFFERENT structure and opening hook.
        3. Use a natural, professional tone. Avoid AI cliches.
        4. End with 'Kind regards,' followed by ${namePlaceholder}.`;
        break;
    }

    // Attempt with Gemini (Primary)
    if (geminiKey) {
      try {
        console.log(`Attempting regeneration of ${sectionType} with Gemini...`);
        const genAI = new GoogleGenerativeAI(geminiKey);
        // Try a current model first, then fallback to a stronger one
        let model;
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(prompt);
          const text = (await result.response).text();
          if (isJsonResponse) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              content = parsed.content || parsed;
            }
          } else {
            content = text;
          }
          if (content) dbgPathUsed = 'gemini';
        } catch (e) {
          console.warn('Gemini 2.5 Flash failed, trying gemini-2.5-pro...');
          model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const result = await model.generateContent(prompt);
          const text = (await result.response).text();
          if (isJsonResponse) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              content = parsed.content || parsed;
            }
          } else {
            content = text;
          }
          if (content) dbgPathUsed = 'gemini';
        }
      } catch (e) {
        console.warn(`Regeneration of ${sectionType} with Gemini failed:`, e.message);
      }
    }

    // Attempt with OpenAI (Removed)
    /*
    if (!content && openaiKey && ...) {
       ...
    }
    */

    // --- APPROACH 3: LOCAL FALLBACK (If all AI fails or limits reached) ---
    if (!content) {
      console.log(`Using local fallback for ${sectionType} due to AI unavailability`);
      dbgPathUsed = 'local-fallback';
      const skills = normalizedSkillNames.length > 0 ? normalizedSkillNames : ["professionalism", "dedication"];
      const experience = userContext?.experience || [];
      const title =
        sanitizeJobTitle(userContext?.title) ||
        extractJobTitleFallback(jobDescription) ||
        guessJobTitleFromSignals(jobDescription, skills, []) ||
        "the advertised position";

      switch (sectionType) {
        case 'summary':
          content = `Results-oriented professional with a strong background in ${skills.slice(0, 3).join(', ')}. Proven track record of delivering high-quality results and contributing to team success through dedication and expertise in ${title}.`;
          break;
        case 'skills':
          content = skills.length > 0 ?
            skills.slice(0, 5).map(s => ({ name: s, description: `Hands-on experience using ${s} in real tasks/projects.` })) :
            [
              { name: "Problem Solving", description: "Analytical approach to complex challenges" },
              { name: "Team Collaboration", description: "Effective communicator in cross-functional environments" },
              { name: "Adaptability", description: "Quick learner in fast-paced settings" }
            ];
          break;
        case 'experience':
          content = experience.length > 0 ? experience : [{
            company: "Previous Company",
            position: "Professional Role",
            period: "2020-Present",
            responsibilities: [
              "Managed key projects and delivered results ahead of schedule",
              "Collaborated with team members to improve internal processes",
              "Demonstrated strong attention to detail and commitment to quality"
            ]
          }];
          break;
        case 'achievements':
          content = [
            `Successfully applied ${skills[0] || 'core skills'} to achieve project goals`,
            "Recognized for outstanding performance and dedication to the role",
            "Consistently met and exceeded key performance indicators"
          ];
          break;
        case 'cover-letter':
          content = generateSuggestedCoverLetter(title, skills, [], namePlaceholder);
          break;
      }
    }

    if (!content) {
      return res.status(500).json({ error: 'Failed to regenerate content' });
    }

    if (sectionType === 'skills') {
      content = sanitizeSkillItems(content);
    }

    if (sectionType === 'cover-letter' && typeof content === 'string') {
      content = sanitizeCoverLetterText(content);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6953cdac-8acd-439e-a8c6-252d8b296cad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'H2', location: 'server.js:/api/regenerate-section:exit', message: 'Regenerate responding', data: { sectionType, pathUsed: dbgPathUsed, contentType: typeof content, contentLen: typeof content === 'string' ? content.length : Array.isArray(content) ? content.length : null, contentHasProfessionalCandidate: /Professional Candidate/i.test(String(content || '')) }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion agent log

    res.json({ content });
  } catch (error) {
    console.error('Error in regenerate-section:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal regeneration error' });
    }
  }
});

// Regenerate summary endpoint (kept for backward compatibility if needed)
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { jobDescription, userName } = req.body;
    // const openaiKey = getOpenAIKey(req); // Removed
    const geminiKey = getGeminiKey(req);

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    let summary = null;
    const namePlaceholder = userName || "the candidate";

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        let model;
        try {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(`Write a concise, first-person 3-4 sentence professional summary for a resume for ${namePlaceholder} based on this job description: ${jobDescription}`);
          summary = (await result.response).text();
        } catch (e) {
          console.warn('Gemini 2.5 Flash failed, trying gemini-2.5-pro...');
          model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const result = await model.generateContent(`Write a concise, first-person 3-4 sentence professional summary for a resume for ${namePlaceholder} based on this job description: ${jobDescription}`);
          summary = (await result.response).text();
        }
      } catch (e) { console.warn('Summary regeneration with Gemini failed'); }
    }

    // OpenAI summary generation removed
    /*
    if (!summary && openaiKey ...) { ... }
    */

    if (!summary) {
      summary = "Dedicated professional with experience aligned with the requirements of this role, focused on achieving excellence and driving value.";
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Humanize endpoint
app.post('/api/humanize', async (req, res) => {
  try {
    const { content } = req.body;
    // const openaiKey = getOpenAIKey(req); // Removed
    const geminiKey = getGeminiKey(req);
    const undetectableKey = req.headers['x-undetectable-key'];

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let humanizedContent = null;

    if (undetectableKey) {
      try {
        const response = await fetch('https://api.undetectable.ai/v2/humanize', {
          method: 'POST',
          headers: { 'api-key': undetectableKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, readability: "University", purpose: "General Writing" })
        });
        const data = await response.json();
        if (data.output) humanizedContent = data.output;
      } catch (e) { }
    }

    if (!humanizedContent && geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(`Rewrite this to sound 100% human and bypass AI detectors. Use bursty writing and natural flow: ${content}`);
        humanizedContent = (await result.response).text();
      } catch (e) { }
    }

    if (!humanizedContent) {
      humanizedContent = content; // Fallback to original
    }

    res.json({ humanizedContent });
  } catch (error) {
    res.status(500).json({ error: 'Humanization error' });
  }
});

// PDF Constants
const PAGE_WIDTH = 612; // Letter size width
const PAGE_HEIGHT = 792; // Letter size height
const DEFAULT_MARGIN = 50;

// PDF Generation endpoint
app.post('/api/generate-pdf', (req, res) => {
  try {
    const resumeData = req.body;
    if (!resumeData) return res.status(400).json({ error: 'Resume data is required' });

    const doc = new PDFDocument({ margin: 0, size: 'LETTER', bufferPages: true });
    const filename = `resume_${Date.now()}.pdf`;
    const filepath = path.join(pdfsDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const isClassic = String(resumeData.template || 'modern').toLowerCase() === 'classic';

    // --- CV PAGE ---
    if (!resumeData.generateOnlyCoverLetter) {
      if (isClassic) {
        drawClassicCVPage(doc, resumeData);
      } else {
        // Ensure we are using the correct margins for the resume page
        doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
        drawCVPage(doc, resumeData);
      }
    }

    // --- COVER LETTER PAGE ---
    if (resumeData.coverLetter && (resumeData.coverLetter.enabled || resumeData.generateOnlyCoverLetter) && resumeData.coverLetter.content) {
      if (!resumeData.generateOnlyCoverLetter) {
        doc.addPage({ margin: DEFAULT_MARGIN });
      } else {
        // If it's only cover letter, first page margin should be 50
        doc.page.margins = { top: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN, right: DEFAULT_MARGIN };
      }
      drawCoverLetterPage(doc, resumeData);
    }

    doc.end();
    stream.on('finish', () => res.json({ success: true, filename, downloadUrl: `/api/download-pdf/${filename}` }));
    stream.on('error', (err) => {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: 'Failed to generate PDF' });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Helper: Check if section is enabled and has content
function isSectionActive(section, itemsKey = 'items') {
  return section && section.enabled && (Array.isArray(section[itemsKey]) ? section[itemsKey].length > 0 : !!section.content);
}

function drawClassicCVPage(doc, data) {
  const width = PAGE_WIDTH - (DEFAULT_MARGIN * 2);
  let y = DEFAULT_MARGIN;

  // Header
  doc.fillColor('#2c3e50').font('Helvetica-Bold').fontSize(24).text(data.name.toUpperCase(), DEFAULT_MARGIN, y, { align: 'center' });
  y += 30;
  doc.fillColor('#7f8c8d').font('Helvetica').fontSize(14).text(data.title.toUpperCase(), DEFAULT_MARGIN, y, { align: 'center' });
  y += 25;

  // Contact
  const contactStr = [data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin].filter(Boolean).join('  |  ');
  doc.fontSize(10).fillColor('#2c3e50').text(contactStr, DEFAULT_MARGIN, y, { align: 'center' });
  y += 20;
  doc.moveTo(DEFAULT_MARGIN, y).lineTo(DEFAULT_MARGIN + width, y).strokeColor('#bdc3c7').lineWidth(1).stroke();
  y += 25;

  const sections = [
    { title: 'PROFESSIONAL SUMMARY', data: data.profile, type: 'text' },
    { title: 'SKILLS', data: data.skills, type: 'skills' },
    { title: 'WORK EXPERIENCE', data: data.experience, type: 'experience' },
    { title: 'EDUCATION', data: data.education, type: 'education' }
  ];

  sections.forEach(section => {
    if (!isSectionActive(section.data)) return;

    y = drawClassicSectionHeader(doc, section.title, DEFAULT_MARGIN, y, width);
    doc.font('Helvetica').fontSize(10).fillColor('#2c3e50');

    if (section.type === 'text') {
      doc.text(section.data.content, DEFAULT_MARGIN, y, { width, align: 'justify', lineGap: 2 });
      y += doc.heightOfString(section.data.content, { width, lineGap: 2 }) + 25;
    } else if (section.type === 'skills') {
      const text = section.data.items.join('  •  ');
      doc.text(text, DEFAULT_MARGIN, y, { width, lineGap: 2 });
      y += doc.heightOfString(text, { width, lineGap: 2 }) + 25;
    } else if (section.type === 'experience') {
      section.data.items.forEach(exp => {
        if (y > 700) { doc.addPage({ margin: DEFAULT_MARGIN }); y = DEFAULT_MARGIN; }
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50').text(exp.position, DEFAULT_MARGIN, y);
        const pWidth = doc.widthOfString(exp.period);
        doc.font('Helvetica').fontSize(10).text(exp.period, DEFAULT_MARGIN + width - pWidth, y);
        y += 15;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#7f8c8d').text(`${exp.company}${exp.location ? ', ' + exp.location : ''}`, DEFAULT_MARGIN, y);
        y += 15;
        exp.responsibilities.forEach(resp => {
          doc.circle(DEFAULT_MARGIN + 5, y + 4, 2).fill('#2c3e50');
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50').text(resp, DEFAULT_MARGIN + 15, y, { width: width - 15, lineGap: 2 });
          y += doc.heightOfString(resp, { width: width - 15, lineGap: 2 }) + 5;
        });
        y += 15;
      });
    } else if (section.type === 'education') {
      section.data.items.forEach(edu => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50').text(edu.degree, DEFAULT_MARGIN, y);
        const pWidth = doc.widthOfString(edu.period || '');
        doc.font('Helvetica').fontSize(10).text(edu.period || '', DEFAULT_MARGIN + width - pWidth, y);
        y += 15;
        doc.font('Helvetica').fontSize(10).fillColor('#7f8c8d').text(`${edu.school}${edu.field ? ' - ' + edu.field : ''}`, DEFAULT_MARGIN, y);
        y += 25;
      });
    }
  });
}

function drawClassicSectionHeader(doc, title, x, y, width) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text(title, x, y);
  y += 15;
  doc.moveTo(x, y).lineTo(x + width, y).strokeColor('#bdc3c7').lineWidth(0.5).stroke();
  return y + 15;
}

function drawCVPage(doc, data) {
  const margin = 46;
  const sidebarWidth = 175;
  const gutter = 30;

  const dividerX = margin + sidebarWidth + (gutter / 2);
  const sideX = margin;
  const sideWidth = sidebarWidth;
  const mainX = margin + sidebarWidth + gutter;
  const mainWidth = PAGE_WIDTH - margin - mainX;

  // --- HEADER (full width, like the provided template) ---
  let y = 40;
  const name = (data.name || 'YOUR NAME').toUpperCase();
  const title = (data.title || 'PROFESSIONAL TITLE').toUpperCase();

  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(name, margin, y, { width: PAGE_WIDTH - (margin * 2) });
  y += 18;
  doc.fillColor('#334155').font('Helvetica').fontSize(9).text(title, margin, y, { width: PAGE_WIDTH - (margin * 2) });
  y += 14;

  doc.moveTo(margin, y).lineTo(PAGE_WIDTH - margin, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
  y += 20;

  // Column divider line
  doc.moveTo(dividerX, y).lineTo(dividerX, PAGE_HEIGHT - margin).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // --- SIDEBAR (Left) ---
  const drawSidebarTitle = (label, yy) => {
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(label.toUpperCase(), sideX, yy, { width: sideWidth });
    doc.moveTo(sideX, yy + 12).lineTo(sideX + sideWidth, yy + 12).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
    return yy + 18;
  };

  const drawSidebarBullet = (text, yy) => {
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(`• ${text}`, sideX, yy, { width: sideWidth, lineGap: 2 });
    return yy + doc.heightOfString(`• ${text}`, { width: sideWidth, lineGap: 2 }) + 4;
  };

  let sideY = y;

  // CONTACT
  sideY = drawSidebarTitle('CONTACT', sideY);
  const contactLines = [
    data.contact?.phone,
    data.contact?.email,
    data.contact?.location,
    data.contact?.linkedin
  ].filter(Boolean);
  contactLines.forEach(line => {
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(line, sideX, sideY, { width: sideWidth });
    sideY += doc.heightOfString(line, { width: sideWidth }) + 4;
  });
  sideY += 10;

  // SKILLS
  if (isSectionActive(data.skills)) {
    sideY = drawSidebarTitle('SKILLS', sideY);
    (data.skills.items || []).forEach(s => {
      const raw = typeof s === 'string' ? s : (s?.name || '');
      const skillName = String(raw).split(' - ')[0].trim();
      if (skillName) sideY = drawSidebarBullet(skillName, sideY);
    });
    sideY += 6;
  }

  // LANGUAGES
  if (isSectionActive(data.languages)) {
    sideY = drawSidebarTitle('LANGUAGES', sideY);
    (data.languages.items || []).forEach(lang => {
      if (lang) sideY = drawSidebarBullet(String(lang), sideY);
    });
    sideY += 6;
  }

  // REFERENCE
  if (isSectionActive(data.reference, 'content')) {
    sideY = drawSidebarTitle('REFERENCE', sideY);
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(String(data.reference.content || ''), sideX, sideY, { width: sideWidth, lineGap: 2 });
    sideY += doc.heightOfString(String(data.reference.content || ''), { width: sideWidth, lineGap: 2 }) + 6;
  }

  // --- MAIN CONTENT (Right) with timeline ---
  const timelineX = mainX + 10;
  const contentX = mainX + 30;

  const drawSectionHeader = (label, iconLetter, yy) => {
    // icon circle
    doc.circle(timelineX, yy + 6, 7).fill('#0f172a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7).text(iconLetter, timelineX - 3, yy + 2, { width: 10, align: 'center' });

    // label + underline
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(label.toUpperCase(), contentX, yy, { width: mainWidth - (contentX - mainX) });
    doc.moveTo(contentX, yy + 12).lineTo(PAGE_WIDTH - margin, yy + 12).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
    return yy + 20;
  };

  let mainY = y;
  const timelineStartY = mainY;

  // PROFILE
  if (isSectionActive(data.profile)) {
    mainY = drawSectionHeader('PROFILE', 'P', mainY);
    const txt = String(data.profile.content || '');
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8.7).text(txt, contentX, mainY, { width: PAGE_WIDTH - margin - contentX, lineGap: 2 });
    mainY += doc.heightOfString(txt, { width: PAGE_WIDTH - margin - contentX, lineGap: 2 }) + 14;
  }

  // WORK EXPERIENCE
  if (isSectionActive(data.experience)) {
    mainY = drawSectionHeader('WORK EXPERIENCE', 'W', mainY);
    (data.experience.items || []).forEach(item => {
      // dot
      doc.circle(timelineX, mainY + 6, 2).fill('#64748b');

      const company = String(item.company || '').trim();
      const period = String(item.period || '').trim();
      const position = String(item.position || '').trim();

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(company, contentX, mainY, { width: PAGE_WIDTH - margin - contentX });
      if (period) {
        const w = doc.widthOfString(period);
        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(period, PAGE_WIDTH - margin - w, mainY);
      }
      mainY += 12;
      if (position) {
        doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(position, contentX, mainY, { width: PAGE_WIDTH - margin - contentX });
        mainY += 12;
      }

      (item.responsibilities || []).forEach(r => {
        const line = `• ${String(r || '').trim()}`;
        if (!line.trim() || line.trim() === '•') return;
        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.3).text(line, contentX + 10, mainY, { width: PAGE_WIDTH - margin - (contentX + 10), lineGap: 2 });
        mainY += doc.heightOfString(line, { width: PAGE_WIDTH - margin - (contentX + 10), lineGap: 2 }) + 2;
      });
      mainY += 10;
    });
  }

  // EDUCATION
  if (isSectionActive(data.education)) {
    mainY = drawSectionHeader('EDUCATION', 'E', mainY);
    (data.education.items || []).forEach(edu => {
      doc.circle(timelineX, mainY + 6, 2).fill('#64748b');

      const degree = String(edu.degree || '').trim();
      const period = String(edu.period || '').trim();
      const schoolLine = `${String(edu.school || '').trim()}${edu.field ? ` | ${String(edu.field).trim()}` : ''}`.trim();

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(degree, contentX, mainY, { width: PAGE_WIDTH - margin - contentX });
      if (period) {
        const w = doc.widthOfString(period);
        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5).text(period, PAGE_WIDTH - margin - w, mainY);
      }
      mainY += 12;
      if (schoolLine) {
        doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(schoolLine, contentX, mainY, { width: PAGE_WIDTH - margin - contentX });
        mainY += 14;
      } else {
        mainY += 8;
      }
    });
  }

  // Timeline line (draw last so it spans all)
  doc.moveTo(timelineX, timelineStartY + 6).lineTo(timelineX, Math.max(timelineStartY + 6, mainY - 10)).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
}

function drawModernSectionHeader(doc, title, x, y, timelineX) {
  doc.circle(timelineX, y + 7, 8).fill('#2c3e50');
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#2c3e50').text(title, x, y);
  doc.moveTo(x, y + 16).lineTo(x + 380, y + 16).strokeColor('#bdc3c7').lineWidth(0.5).stroke();
}

function drawSidebarHeader(doc, title, x, y) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#2c3e50').text(title, x, y);
  doc.moveTo(x, y + 16).lineTo(x + 130, y + 16).strokeColor('#2c3e50').lineWidth(1.5).stroke();
}

function drawModernSectionHeader(doc, title, x, y, timelineX) {
  // Draw circular icon on the timeline
  doc.circle(timelineX, y + 7, 8).fill('#2c3e50');

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#2c3e50').text(title, x, y);
  doc.moveTo(x, y + 16).lineTo(x + 380, y + 16).strokeColor('#bdc3c7').lineWidth(0.5).stroke();
}

function drawSidebarHeader(doc, title, x, y) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#2c3e50').text(title, x, y);
  doc.moveTo(x, y + 16).lineTo(x + 130, y + 16).strokeColor('#2c3e50').lineWidth(1).stroke();
}

function drawCoverLetterPage(doc, data) {
  const margin = 50;
  const width = PAGE_WIDTH - (margin * 2);

  // Header matching resume style
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c3e50').text((data.name || 'YOUR NAME').toUpperCase(), margin, margin);
  doc.fontSize(12).font('Helvetica').fillColor('#7f8c8d').text((data.title || '').toUpperCase(), margin, margin + 30);

  // Contact info on top right
  let contactY = margin;
  doc.fontSize(9).font('Helvetica').fillColor('#7f8c8d');
  [data.contact.phone, data.contact.email, data.contact.location].filter(Boolean).forEach(val => {
    doc.text(val, margin, contactY, { align: 'right', width: width });
    contactY += 12;
  });

  // Divider line
  doc.moveTo(margin, margin + 60).lineTo(PAGE_WIDTH - margin, margin + 60).strokeColor('#bdc3c7').lineWidth(1).stroke();

  // Content
  doc.fontSize(10.5)
    .font('Helvetica')
    .fillColor('#2c3e50')
    .text(data.coverLetter.content, margin, margin + 90, { width: width, lineGap: 6, align: 'justify' });
}

function drawSectionHeader(doc, title, x, y, sidebar = false) {
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#334155').text(title, x, y);
  const width = sidebar ? 140 : 480;
  doc.moveTo(x, y + 15).lineTo(x + width, y + 15).stroke('#eeeeee');
}

// Download PDF endpoint
app.get('/api/download-pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(pdfsDir, filename);

  if (fs.existsSync(filepath)) {
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download PDF' });
      }
    });
  } else {
    res.status(404).json({ error: 'PDF not found' });
  }
});

// Root route - landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Landing route removed

// Serve main app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve payment page
app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

// Payment flow status pages
app.get('/payment-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

app.get('/payment-cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-cancel.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
