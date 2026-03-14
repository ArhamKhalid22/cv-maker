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
  cv:     1000,
  cover:  700,
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

function buildPrompt(req: OpenRouterRequest): string {
  const ctx  = buildContext(req);
  const name = req.fullName?.trim() || 'Applicant';

  if (req.type === 'cv') {
    return `You are a senior professional CV writer with 15 years of experience placing candidates at top companies.
Write three clearly labelled sections for this applicant's CV. Use the EXACT format below.

${BANNED_WORDS}

FORMAT (keep these exact labels on their own line):
PROFESSIONAL SUMMARY:
[3-4 sentences. State the applicant's role, years of experience, top 2-3 skills, and value proposition. Begin with the applicant's field, not their name. Vary sentence length.]

WORK EXPERIENCE:
[5-7 bullet points. Each starts with •. Use strong, varied action verbs. Include numbers/metrics wherever possible (%, £/$, time saved, team size). Do NOT start every bullet with the same grammatical structure. Be specific — no generic filler.]

KEY SKILLS FOR THIS ROLE:
[8-10 comma-separated skills directly matching this job description. Mix hard and soft skills. No generic lists.]

RULES:
- Each regeneration: rephrase everything, vary vocabulary, vary sentence rhythm
- Replace vague phrases with hard data (e.g. not "improved efficiency" — write "cut processing time by 30%")
- Read like a human wrote it, not a template

${ctx}`;
  }

  if (req.type === 'cover') {
    return `You are a professional career consultant writing a cover letter for ${name}.

${BANNED_WORDS}

RULES:
- 3 paragraphs, maximum 220 words total
- Para 1 (~60 words): Open with a specific, memorable achievement. State the exact role you're applying for. Do NOT start with "I am writing to apply for..."
- Para 2 (~100 words): Link exactly 3 specific requirements from the job description to concrete evidence from the applicant's background. Use numbers. Be direct.
- Para 3 (~50 words): Express genuine, specific interest in this company (mention something real about them if possible). Close with a direct call to action.
- Tone: confident, warm, direct — sounds like a real person, not a corporate template
- Start with: "Dear Hiring Manager,"
- End with: "Sincerely,\n${name}"
- Each regeneration: completely rephrase, use different examples, vary sentence structure

${ctx}`;
  }

  // skills
  return `Talent analyst. Return ONLY valid JSON (no markdown, no code fences):
{"matchScore":<0-100>,"topSkills":[{"skill":"...","relevance":"high|medium|low","inResume":true,"tip":"one specific, actionable tip — avoid vague advice"}],"gaps":["specific gap 1","specific gap 2"],"strengths":["concrete strength 1","concrete strength 2"],"summary":"2 direct sentences — state the match quality and the single most important recommendation"}
Include 6-8 topSkills. Be precise and specific, not generic.

${ctx}`;
}

export async function callOpenRouter(req: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const prompt    = buildPrompt(req);
  const maxTokens = MAX_TOKENS[req.type];

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
        {
          role: 'system',
          content: `You are a professional career consultant. Always produce fresh output with every request.
Vary vocabulary, sentence length, and structure with every regeneration.
Never repeat phrasing from previous outputs. Sound human — direct, specific, confident.`,
        },
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
