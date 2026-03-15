// app/api/parse-resume/route.ts
// AI-powered resume parser to fill the profile fields automatically

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert HR data analyst. 
Extract the following information from the provided resume text. 
Return ONLY valid JSON (no markdown, no code fences):

{
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "city": "...",
  "linkedin": "...",
  "education": "...",
  "hardSkills": "list of technical tools, languages, software...",
  "softSkills": "list of interpersonal, leadership, communication skills...",
  "achievements": "list of quantified accomplishments...",
  "userBackground": "structured list of work experience (Company, Title, Dates, Bullets)..."
}

If a field is missing, leave it as an empty string. Be accurate and direct.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://jobai-pro.vercel.app',
        'X-Title': 'JobAI Pro Parser',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `TEXT FROM RESUME:\n\n${text}` },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleaned));
  } catch (error: any) {
    console.error('[/api/parse-resume]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to parse resume' },
      { status: 500 }
    );
  }
}
