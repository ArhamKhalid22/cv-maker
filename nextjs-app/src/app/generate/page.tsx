'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import JobInputPanel from '@/components/JobInputPanel';
import GenerationTabs from '@/components/GenerationTabs';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function GeneratePage() {
  const store = useAppStore();
  const { generateAll, cvStatus, coverStatus, skillsStatus } = useJobAI();
  const [showProfile, setShowProfile] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  const isAnyLoading = cvStatus === 'loading' || coverStatus === 'loading' || skillsStatus === 'loading';
  const hasAnyOutput = store.generatedCV || store.coverLetter || store.skillsAnalysis;

  const handleGenerateAll = async () => {
    if (!store.jobDescription.trim()) {
      toast.error('Please enter a job description first');
      return;
    }
    if (!store.userBackground.trim()) {
      toast.error('Please enter your background / current CV');
      return;
    }
    await generateAll();
    setShowProfile(false);
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const handleSave = () => {
    store.saveApplication();
    toast.success('✅ Saved to dashboard!');
  };

  const handleDownloadPDF = () => {
    if (!store.generatedCV && !store.coverLetter) {
      toast.error('Generate content first before downloading');
      return;
    }
    // Build a styled HTML doc and print to PDF
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Application Kit — ${store.jobTitle || 'Job'} at ${store.company || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.7; color: #111; padding: 40px 50px; max-width: 750px; margin: 0 auto; }
    h1 { font-size: 20pt; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 13pt; font-weight: bold; margin: 24px 0 8px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    p { margin-bottom: 10px; }
    .meta { color: #555; font-size: 10pt; margin-bottom: 24px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 11pt; }
    .section { margin-bottom: 32px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${store.jobTitle || 'Job Application'}</h1>
  <p class="meta">${store.company || ''}${store.jobUrl ? ` · ${store.jobUrl}` : ''}</p>

  ${store.generatedCV ? `
  <div class="section">
    <h2>CV Bullet Points</h2>
    <pre>${store.generatedCV}</pre>
  </div>` : ''}

  ${store.coverLetter ? `
  <div class="section">
    <h2>Cover Letter</h2>
    ${store.coverLetter.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('')}
  </div>` : ''}

  ${store.skillsAnalysis ? `
  <div class="section">
    <h2>Skills Analysis — ${store.skillsAnalysis.matchScore}% Match</h2>
    <p>${store.skillsAnalysis.summary}</p>
    <p><strong>Strengths:</strong> ${store.skillsAnalysis.strengths.join(', ')}</p>
    <p><strong>Gaps:</strong> ${store.skillsAnalysis.gaps.join(', ') || 'None identified'}</p>
  </div>` : ''}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked — allow popups and try again'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  const inputBg = {
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: 14,
    color: 'var(--text-primary)',
    fontSize: 14,
    width: '100%',
    resize: 'vertical' as const,
    minHeight: 90,
    outline: 'none',
    lineHeight: 1.6,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '40px 0 32px',
      }}>
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 99, padding: '6px 16px', marginBottom: 18,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>GPT-4o Mini via OpenRouter</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 14 }}>
            Generate Your <span className="gradient-text">Perfect Application</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 520, margin: '0 auto 20px' }}>
            Paste the job description, fill in your profile, and get a tailored CV, cover letter, and skills analysis.
          </p>
          {hasAnyOutput && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowProfile(p => !p)}>
                ✏️ {showProfile ? 'Hide' : 'Edit'} Inputs
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleSave}>💾 Save to Dashboard</button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>📄 Download PDF</button>
            </div>
          )}
        </div>
      </div>

      <div className="container-sm" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* ── Step 1: Job Input ── */}
        {showProfile && (
          <div>
            <SectionHeader num="1" title="Job Description" sub="Paste text, a URL, or upload a screenshot" />

            <JobInputPanel />
          </div>
        )}

        {/* ── Step 2: Your Profile ── */}
        {showProfile && (
          <div>
            <SectionHeader num="2" title="Your Profile" sub="More detail = better-tailored output" />
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Full Name — first field */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  YOUR FULL NAME <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. John Smith"
                  value={store.fullName}
                  onChange={e => store.setFullName(e.target.value)}
                  style={{ fontWeight: 500 }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Used in your cover letter sign-off and CV header</p>
              </div>

              {/* Job meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    JOB TITLE (optional)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Senior Software Engineer"
                    value={store.jobTitle}
                    onChange={e => store.setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    COMPANY (optional)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Google"
                    value={store.company}
                    onChange={e => store.setCompany(e.target.value)}
                  />
                </div>
              </div>

              {/* Background */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  WORK EXPERIENCE / CURRENT CV <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  style={inputBg}
                  placeholder="Paste your work experience or current CV bullet points here..."
                  value={store.userBackground}
                  onChange={e => store.setUserBackground(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Education */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  EDUCATION
                </label>
                <textarea
                  style={{ ...inputBg, minHeight: 70 }}
                  placeholder="e.g. BSc Computer Science, University of XYZ, 2021. Relevant modules: ..."
                  value={store.education}
                  onChange={e => store.setEducation(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Skills */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  KEY SKILLS
                </label>
                <textarea
                  style={{ ...inputBg, minHeight: 70 }}
                  placeholder="e.g. Python, React, Node.js, AWS, Docker, PostgreSQL, Agile..."
                  value={store.skills}
                  onChange={e => store.setSkills(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Achievements */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  KEY ACHIEVEMENTS
                </label>
                <textarea
                  style={{ ...inputBg, minHeight: 70 }}
                  placeholder="e.g. Reduced API latency by 40%, Led a team of 5 to ship product in 3 months..."
                  value={store.achievements}
                  onChange={e => store.setAchievements(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Generate Button ── */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerateAll}
            disabled={isAnyLoading}
            style={{ minWidth: 260 }}
          >
            {isAnyLoading ? (
              <><span className="animate-spin" style={{ fontSize: 16 }}>⚙</span> Generating with AI...</>
            ) : (
              <><span>✨</span> Generate Full Application Kit</>
            )}
          </button>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            CV bullets · Cover letter · Skills match — all in ~15 seconds
          </p>
        </div>

        {/* ── Output ── */}
        {hasAnyOutput && (
          <div ref={outputRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--gradient-primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>3</div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Application Kit</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI-generated and tailored for this role</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleSave}>💾 Save</button>
                <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>📄 PDF</button>
              </div>
            </div>
            <GenerationTabs />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--gradient-primary)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
      }}>{num}</div>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  );
}
