// lib/openrouter.ts — Anti-AI-tell prompts, structured output, human-quality generation

export type GenerationType = 'cv' | 'cover' | 'skills';

export interface OpenRouterRequest {
  fullName?: string;
  jobDescription: string;
  userBackground: string;
  education?: string;
  skills?: string;
  achievements?: string;
  type: GenerationType;
  regenerateSeed?: string;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const MODEL = 'openai/gpt-4o-mini';

const MAX_TOKENS: Record<GenerationType, number> = {
  cv:     2500,
  cover:  1500,
  skills: 600,
};

// Vocabulary the recruiter flags as AI-written
const BANNED_WORDS = `Do NOT use these overused AI words: delve, tapestry, testament, seamlessly, foster,
spearhead, synergy, landscape, transformative, robust, leverage, cutting-edge, innovative,
game-changer, holistic, streamline, orchestrate, elevate, passionate, dynamic, driven.
Use plain, direct, human language instead.`;

function buildContext(req: OpenRouterRequest): string {
  const { jobDescription, userBackground, education, skills, achievements, fullName, regenerateSeed } = req;
  const jd   = jobDescription.trim().slice(0, 1000);
  const bg   = userBackground.trim().slice(0, 600);
  const edu  = education?.trim().slice(0, 200) || '';
  const sk   = skills?.trim().slice(0, 200) || '';
  const ach  = achievements?.trim().slice(0, 200) || '';
  const name = fullName?.trim() || 'Applicant';
  const seed = regenerateSeed || `${Date.now()}`;

  let ctx = `APPLICANT: ${name}\nJOB DESCRIPTION:\n${jd}\n\nWORK EXPERIENCE:\n${bg}`;
  if (edu) ctx += `\n\nEDUCATION:\n${edu}`;
  if (sk)  ctx += `\n\nSKILLS:\n${sk}`;
  if (ach) ctx += `\n\nACHIEVEMENTS:\n${ach}`;
  ctx += `\n\n[variation-seed:${seed}]`;
  return ctx;
}

const JSON_SCHEMA = `
{
  "applicant_profile": {
    "personal_information": {
      "full_name": "",
      "professional_title": "",
      "email": "",
      "phone": "",
      "location": "",
      "linkedin_or_portfolio": ""
    },
    "resume_data": {
      "summary": "",
      "core_skills": [],
      "professional_experience": [
        {
          "company_name": "",
          "job_title": "",
          "location": "",
          "start_date": "",
          "end_date": "",
          "accomplishment_bullets": []
        }
      ],
      "education": [
        {
          "degree_name": "",
          "institution_name": "",
          "location": "",
          "start_year": "",
          "end_year": ""
        }
      ],
      "certifications_and_courses": [],
      "awards": [],
      "projects": [
        {
          "project_name": "",
          "description": ""
        }
      ]
    },
    "cover_letter_data": {
      "date": "",
      "recipient_name": "",
      "recipient_company": "",
      "recipient_address": "",
      "greeting": "",
      "opening_paragraph": "",
      "body_paragraphs": [],
      "bulleted_achievements": [],
      "closing_paragraph": "",
      "sign_off": ""
    }
  }
}`;

function buildPrompt(req: OpenRouterRequest): string {
  const ctx  = buildContext(req);
  const name = req.fullName?.trim() || 'Applicant';

  const HONESTY = `CRITICAL HONESTY RULES:
1. No Hallucinations: If the user does not provide data for a specific field, you MUST leave that field absolutely blank (use "" or [] in JSON).
2. Do not use placeholder text like "[Insert Company Here]" or "City, State". Just leave it empty.
3. Use ONLY information explicitly stated in the provided background — never invent it.
4. If no internship is mentioned, use academic projects or coursework as evidence instead.`;

  if (req.type === 'cv') {
    return `You are an expert resume formatter. Your job is to take raw user data and map it to the provided JSON schema.
Return ONLY valid JSON (no markdown, no code fences, no explanations).

${BANNED_WORDS}
${HONESTY}

SCHEMA TO FOLLOW:
${JSON_SCHEMA}

INSTRUCTIONS FOR CV:
- Populate "personal_information" and "resume_data" accurately.
- Leave "cover_letter_data" completely empty (with "" or []).
- Ensure "accomplishment_bullets" are strong, varied, and start with bullet points.
- "core_skills" should be a list of 8-10 highly relevant skills from the background.
- "summary" should be a 3-4 sentence professional summary.

RAW USER DATA TO PROCESS:
${ctx}`;
  }

  if (req.type === 'cover') {
    return `You are an expert cover letter formatting assistant. Your job is to take raw user data and map it to the provided JSON schema.
Return ONLY valid JSON (no markdown, no code fences, no explanations).

${BANNED_WORDS}
${HONESTY}

SCHEMA TO FOLLOW:
${JSON_SCHEMA}

INSTRUCTIONS FOR COVER LETTER:
- Populate "cover_letter_data" accurately specifically tailored to the Job Description.
- Leave "resume_data" completely empty (with "" or []).
- "body_paragraphs" should contain the main paragraphs linking requirements to evidence.
- "bulleted_achievements" can contain 2-3 specific bulleted highlights if explicitly mentioned in the background. If none are impressive enough, leave [] and construct a standard body paragraph instead.
- "greeting", "opening_paragraph", "closing_paragraph", and "sign_off" must sound natural and directly address the hiring manager.

RAW USER DATA TO PROCESS:
${ctx}`;
  }

  // skills
  return `Talent analyst. Return ONLY valid JSON (no markdown, no code fences):
{"matchScore":<0-100>,"topSkills":[{"skill":"...","relevance":"high|medium|low","inResume":true,"tip":"one specific, actionable tip — avoid vague advice"}],"gaps":["specific gap 1","specific gap 2"],"strengths":["concrete strength 1","concrete strength 2"],"summary":"2 direct sentences — state the match quality and the single most important recommendation"}
Include 6-8 topSkills. Be precise and specific, not generic. Base inResume only on skills actually mentioned in the background.

${ctx}`;
}

export async function callOpenRouter(req: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const prompt    = buildPrompt(req);
  const maxTokens = MAX_TOKENS[req.type];

  let systemPrompt = `You are a professional career data processor. Always produce fresh output with every request.
Vary vocabulary, sentence length, and structure with every regeneration.
Never repeat phrasing. Return ONLY strictly valid raw JSON without formatting ticks.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://jobai-pro.vercel.app',
      'X-Title': 'JobAI Pro',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg   = (error as any)?.error?.message || JSON.stringify(error);
    throw new Error(`OpenRouter API error ${response.status}: ${msg}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content returned from OpenRouter');

  return {
    content,
    model: data.model || MODEL,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}
