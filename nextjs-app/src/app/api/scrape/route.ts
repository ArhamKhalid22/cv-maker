// app/api/scrape/route.ts
// Job URL scraping endpoint using Firecrawl or plain fetch fallback

import { NextRequest, NextResponse } from 'next/server';

async function scrapeWithFetch(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Basic HTML-to-text extraction
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s{2,}/g, '\n')
    .trim();

  // Limit to ~8000 chars to avoid token overload
  return text.slice(0, 8000);
}

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Firecrawl error: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const content = data.data?.markdown || data.markdown || '';
  return content.slice(0, 8000);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    let text = '';
    let method = 'fetch';

    // Try Firecrawl first if key is available (better for JS-heavy pages)
    if (process.env.FIRECRAWL_API_KEY) {
      try {
        text = await scrapeWithFirecrawl(url);
        method = 'firecrawl';
      } catch (e) {
        console.warn('[scrape] Firecrawl failed, falling back to direct fetch:', e);
        text = await scrapeWithFetch(url);
      }
    } else {
      text = await scrapeWithFetch(url);
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract content from this URL. Try pasting the text directly.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, method, charCount: text.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape URL';
    console.error('[/api/scrape]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
