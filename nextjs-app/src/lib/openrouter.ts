// lib/openrouter.ts
// OpenRouter API client with proper error handling and regeneration support

export type GenerationType = 'cv' | 'cover' | 'skills';

export interface OpenRouterRequest {
  jobDescription: string;
  userBackground: string;
  type: GenerationType;
  regenerateSeed?: string;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const MODEL_MAP: Record<GenerationType, string> = {
  cv: 'anthropic/claude-3.5-sonnet',
  cover: 'openai/gpt-4o-mini',
  skills: 'openai/gpt-4o-mini',
};

function buildPrompt(req: OpenRouterRequest): string {
  const { jobDescription, userBackground, type, regenerateSeed } = req;
  const seed = regenerateSeed || `${Date.now()}-${Math.random()}`;

  const baseContext = `
Job Description:
${jobDescription}

User Background / Current CV:
${userBackground}

Variation Seed (ensure output is unique): ${seed}
`.trim();

  if (type === 'cv') {
    return `You are an expert career coach and ATS optimization specialist. Generate a tailored, ATS-friendly CV bullet point section based on the following:

${baseContext}

REQUIREMENTS:
- Extract the most critical requirements from the job description
- Write 5-8 quantified achievement bullets for the most relevant experience
- Use strong action verbs (Led, Achieved, Optimized, Delivered, etc.)
- Include measurable outcomes (%, $, time saved, team size, etc.)
- Format each bullet as: [Action Verb] [What you did] [Result/Impact]
- Ensure 90%+ keyword match with the job description
- Do NOT use generic phrases; be specific to this exact job

Return ONLY the bullet points, no headers or explanations.`;
  }

  if (type === 'cover') {
    return `You are an expert career coach. Write a compelling, personalized cover letter based on:

${baseContext}

REQUIREMENTS:
- Paragraph 1: Strong opening hook that references a specific impressive achievement
- Paragraph 2: Why you're the perfect fit - reference 3 specific job requirements from the description and your matching experience
- Paragraph 3: Call to action - enthusiasm for this specific company/role and next step

Keep it to 250-300 words max. Make it sound human and enthusiastic, not robotic.
Start the letter from "Dear Hiring Manager," - no headers.`;
  }

  // skills
  return `You are a talent acquisition expert. Analyze the job description against the candidate's background and return a structured skills analysis.

${baseContext}

Return a JSON object (no markdown, plain JSON) with this exact structure:
{
  "matchScore": <number 0-100>,
  "topSkills": [
    {"skill": "skill name", "relevance": "high|medium|low", "inResume": true|false, "tip": "brief advice"}
  ],
  "gaps": ["missing skill 1", "missing skill 2"],
  "strengths": ["strength 1", "strength 2"],
  "summary": "2-3 sentence assessment"
}

Rank topSkills by importance to this specific job (most important first). Include exactly 8 skills.`;
}

export async function callOpenRouter(req: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = MODEL_MAP[req.type];
  const prompt = buildPrompt(req);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://jobai-pro.vercel.app',
      'X-Title': 'JobAI Pro',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      top_p: 1.0,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error ${response.status}: ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from OpenRouter');
  }

  return {
    content,
    model: data.model || model,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}
