// src/app/layout.tsx

import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobAI Pro — AI-Powered CV & Cover Letter Generator',
  description:
    'Generate tailored CVs, cover letters, and skills analyses using AI. Paste a job description, URL, or screenshot and get ATS-optimized content in seconds.',
  keywords: ['cv generator', 'cover letter ai', 'resume builder', 'job application', 'openrouter'],
  openGraph: {
    title: 'JobAI Pro',
    description: 'AI-powered CV and cover letter generator',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080b14" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a2332',
              color: '#f1f5f9',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
