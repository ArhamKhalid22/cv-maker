# JobAI Pro — v2.0

> AI-powered job application platform using OpenRouter (Claude 3.5 Sonnet + GPT-4o), Next.js 15, and Supabase.

## 🚀 Quick Start

```bash
cd nextjs-app
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ Yes | Get from [openrouter.ai](https://openrouter.ai) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | For cloud persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | For cloud persistence |
| `FIRECRAWL_API_KEY` | Optional | Better URL scraping (LinkedIn/Indeed) |

> **Without Supabase:** The app uses localStorage for application tracking — works great for personal use!

## ✨ Features

- **Multi-input:** Paste text, scrape job URLs, or OCR screenshots
- **CV Generator:** ATS-optimized bullet points via Claude 3.5 Sonnet
- **Cover Letter:** Personalized 3-paragraph letters via GPT-4o Mini
- **Skills Matching:** JSON-structured analysis with match score
- **Unlimited Regeneration:** Each click uses a unique seed for fresh output
- **Dashboard:** Track all applications with status, score, and full content

## 🛠 Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript
- **AI:** OpenRouter → Claude 3.5 Sonnet (CV) + GPT-4o Mini (cover/skills)
- **State:** Zustand with localStorage persistence
- **OCR:** Tesseract.js (runs in browser, no server needed)
- **DB:** Supabase Postgres (optional) + localStorage fallback
- **Scraping:** Firecrawl API + plain fetch fallback

## 📊 Supabase Setup (Optional)

Run `migrations/001_schema.sql` in your Supabase SQL Editor to create tables with RLS.

## 💰 Cost Estimate

| Model | Cost per use | 1000 uses |
|---|---|---|
| Claude 3.5 Sonnet (CV) | ~$0.008 | ~$8 |
| GPT-4o Mini (cover + skills) | ~$0.002 | ~$2 |
| **Total per full kit** | **~$0.01** | **~$10** |
