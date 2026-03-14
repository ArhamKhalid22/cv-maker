// app/api/generate/route.ts
// OpenRouter AI generation endpoint

import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter, type GenerationType } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobDescription, userBackground, type, regenerateSeed } = body;

    if (!jobDescription || !type) {
      return NextResponse.json(
        { error: 'jobDescription and type are required' },
        { status: 400 }
      );
    }

    if (!['cv', 'cover', 'skills'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be cv, cover, or skills' },
        { status: 400 }
      );
    }

    const result = await callOpenRouter({
      jobDescription,
      userBackground: userBackground || '',
      type: type as GenerationType,
      regenerateSeed,
    });

    return NextResponse.json({
      content: result.content,
      model: result.model,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[/api/generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
