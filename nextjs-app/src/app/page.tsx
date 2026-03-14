"use client";

import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  const features = [
    {
      icon: '🎯',
      title: 'Skills Match Analysis',
      desc: 'AI scores your fit for each role and highlights gaps with actionable tips.',
      color: '#6366f1',
    },
    {
      icon: '📄',
      title: 'ATS-Optimized CV',
      desc: 'Get bullet-point content tailored to the exact job with quantifiable achievements.',
      color: '#8b5cf6',
    },
    {
      icon: '✉️',
      title: 'Cover Letter Generator',
      desc: '3-paragraph personalized letters with strong hooks and specific job-matching evidence.',
      color: '#06b6d4',
    },
    {
      icon: '🔗',
      title: 'URL Job Scraping',
      desc: 'Paste a LinkedIn/Indeed URL and we automatically extract the job description.',
      color: '#10b981',
    },
    {
      icon: '📸',
      title: 'Image OCR',
      desc: 'Upload a screenshot of any job posting and we extract text in your browser.',
      color: '#f59e0b',
    },
    {
      icon: '📊',
      title: 'Application Tracker',
      desc: 'Dashboard to track status, match scores, and all generated content across 100s of jobs.',
      color: '#ef4444',
    },
  ];

  const steps = [
    { num: '01', title: 'Paste Job Description', desc: 'Text, URL, or screenshot — we handle all formats' },
    { num: '02', title: 'Add Your Background', desc: 'Paste your CV or describe your experience' },
    { num: '03', title: 'Generate & Refine', desc: 'Get CV, cover letter, and skills analysis. Regenerate any section.' },
    { num: '04', title: 'Track & Apply', desc: 'Save to dashboard, copy content, and track your applications' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        padding: 'clamp(60px, 10vh, 120px) 0',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient orbs */}
        <div style={{
          position: 'absolute', top: -100, left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 50, right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container-sm" style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 99, padding: '6px 18px', marginBottom: 28,
            animation: 'fadeInUp 0.6s ease',
          }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
              Powered by Claude 3.5 Sonnet & GPT-4o via OpenRouter
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900, lineHeight: 1.1,
            marginBottom: 24, letterSpacing: '-1px',
            animation: 'fadeInUp 0.6s ease 0.1s both',
          }}>
            Land Your Dream Job<br />
            <span className="gradient-text">10x Faster with AI</span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 20px)',
            color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 600, margin: '0 auto 40px',
            animation: 'fadeInUp 0.6s ease 0.2s both',
          }}>
            Generate perfectly tailored CVs, cover letters, and skills analyses for any job in seconds.
            Just paste the description — or a URL — and let AI do the heavy lifting.
          </p>

          <div style={{
            display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
            animation: 'fadeInUp 0.6s ease 0.3s both',
          }}>
            <Link href="/generate" className="btn btn-primary btn-lg">
              ✨ Generate Application Kit
            </Link>
            <Link href="/dashboard" className="btn btn-secondary btn-lg">
              📊 View Dashboard
            </Link>
          </div>

          {/* Trust indicators */}
          <div style={{
            marginTop: 48, display: 'flex', gap: 32, justifyContent: 'center',
            flexWrap: 'wrap', animation: 'fadeInUp 0.6s ease 0.4s both',
          }}>
            {[
              { icon: '🔒', text: 'OCR runs in browser' },
              { icon: '♾️', text: 'Unlimited regenerations' },
              { icon: '🎯', text: 'ATS-optimized output' },
              { icon: '⚡', text: 'Results in ~10 seconds' },
            ].map((item) => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 0', background: 'rgba(0,0,0,0.2)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, marginBottom: 12 }}>
              Everything You Need to{' '}
              <span className="gradient-text">Get Hired</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
              One platform, all the tools to beat the ATS and impress hiring managers
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-card"
                style={{ padding: 28, transition: 'transform 0.25s ease, box-shadow 0.25s ease' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${f.color}25`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${f.color}18`, border: `1px solid ${f.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 18,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, marginBottom: 12 }}>
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24, position: 'relative',
          }}>
            {steps.map((step, i) => (
              <div key={step.num} style={{ position: 'relative' }}>
                <div className="glass-card" style={{ padding: 28 }}>
                  <div style={{
                    fontSize: 42, fontWeight: 900, marginBottom: 12,
                    background: 'var(--gradient-text)', WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>{step.num}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hide-mobile" style={{
                    position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontSize: 20, zIndex: 2,
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 0',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.08) 100%)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Land Your Next Role?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Your next application kit is 30 seconds away. No signup required.
          </p>
          <Link href="/generate" className="btn btn-primary btn-lg">
            ✨ Start Generating — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 0',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        <div className="container">
          <p>JobAI Pro · Built with Next.js 15 + OpenRouter · Claude 3.5 Sonnet · GPT-4o Mini</p>
        </div>
      </footer>
    </div>
  );
}
