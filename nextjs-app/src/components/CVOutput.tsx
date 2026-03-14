'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

/** Turn "John Smith" → "John_Smith" for the filename */
function nameToFilePart(name: string) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Applicant';
}

/**
 * Parse the AI-generated CV text which uses these section headers:
 *   PROFESSIONAL SUMMARY:
 *   WORK EXPERIENCE:
 *   KEY SKILLS FOR THIS ROLE:
 */
function parseCVSections(raw: string) {
  const summaryMatch = raw.match(/PROFESSIONAL SUMMARY:\s*([\s\S]*?)(?=WORK EXPERIENCE:|KEY SKILLS|$)/i);
  const expMatch     = raw.match(/WORK EXPERIENCE:\s*([\s\S]*?)(?=KEY SKILLS|PROFESSIONAL SUMMARY|$)/i);
  const skillsMatch  = raw.match(/KEY SKILLS(?:[^:]*)?:\s*([\s\S]*?)$/i);

  return {
    summary: summaryMatch?.[1]?.trim() || '',
    experience: expMatch?.[1]?.trim() || raw,   // fallback: treat all as experience
    skills: skillsMatch?.[1]?.trim() || '',
  };
}

/** Convert bullet text lines → <li> elements */
function bulletLinesToHTML(text: string) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[•\-–*]\s*/, ''))
    .map(l => `<li>${l}</li>`)
    .join('\n');
}

export default function CVOutput() {
  const store = useAppStore();
  const { generate, regenerate, cvStatus, cvError } = useJobAI();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(store.generatedCV);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const name     = store.fullName?.trim()    || 'Your Name';
    const job      = store.jobTitle?.trim()    || '';
    const company  = store.company?.trim()     || '';
    const edu      = store.education?.trim()   || '';
    const ach      = store.achievements?.trim()|| '';
    const email    = store.email?.trim()       || 'your.email@example.com';
    const phone    = store.phone?.trim()       || '+00 0000 000000';
    const city     = store.city?.trim()        || 'City, Country';
    const linkedin = store.linkedin?.trim()    || '';
    const combined = [store.hardSkills, store.softSkills].filter(Boolean).join(', ');

    const { summary, experience, skills } = parseCVSections(store.generatedCV);

    // Edu: parse multi-line into bullets
    const eduLines = edu
      ? edu.split('\n').map(l => l.trim()).filter(Boolean)
      : [];
    const eduOrg  = eduLines[0] || '';
    const eduRest = eduLines.slice(1);

    // Achievements: parse into bullets
    const achBullets = ach
      ? ach.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => l.replace(/^[•\-–*]\s*/, ''))
          .map(l => `<li>${l}</li>`).join('\n')
      : '';

    // Skills: prefer AI-extracted, fallback to store
    const skillsList = skills || combined || '';

    const filename = `${nameToFilePart(name)}_CV`;
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });


    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="author" content="${name}"/>
  <title>${name} — CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-size: 11pt;
      font-weight: 400;
      line-height: 1.45;
      color: #1a1a1a;
      background: #fff;
      padding: 2.5cm 2.5cm 2.5cm 2.5cm;
      max-width: 21cm;
      margin: 0 auto;
    }

    /* ── HEADER ── */
    .cv-header { margin-bottom: 18px; }
    .cv-name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #111;
      margin-bottom: 4px;
    }
    .cv-meta {
      font-size: 9.5pt;
      color: #555;
      margin-bottom: 10px;
    }
    .cv-divider {
      border: none;
      border-top: 2px solid #222;
      margin: 8px 0 16px;
    }

    /* ── SECTION ── */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #111;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    /* ── SUMMARY ── */
    .summary-text {
      font-size: 10.5pt;
      line-height: 1.6;
      color: #333;
    }

    /* ── EXPERIENCE / EDUCATION ENTRY ── */
    .entry { margin-bottom: 14px; }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1px;
    }
    .entry-org  { font-weight: 700; font-size: 10.5pt; color: #111; }
    .entry-loc  { font-size: 9.5pt; color: #666; }
    .entry-role {
      display: flex;
      justify-content: space-between;
      font-style: italic;
      font-size: 10pt;
      color: #444;
      margin-bottom: 6px;
    }
    .entry ul {
      padding-left: 18px;
      list-style-type: disc;
    }
    .entry ul li {
      margin-bottom: 4px;
      font-size: 10.5pt;
      line-height: 1.5;
    }

    /* ── SKILLS ── */
    .skills-text { font-size: 10.5pt; line-height: 1.7; color: #333; }

    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 2.5cm; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="cv-header">
    <div class="cv-name">${name}</div>
    <div class="cv-meta">
      ${job ? `${job}${company ? ' · ' + company : ''}` : (company || '')}
      &nbsp;·&nbsp; ${email} &nbsp;·&nbsp; ${phone} &nbsp;·&nbsp; ${city}${linkedin ? ` &nbsp;·&nbsp; <a href="https://${linkedin.replace(/^https?:\/\//,'')}" style="color:#555;">LinkedIn</a>` : ''}
    </div>
    <hr class="cv-divider"/>
  </div>

  <!-- PROFESSIONAL SUMMARY -->
  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary-text">${summary.replace(/\n/g, ' ')}</p>
  </div>` : ''}

  <!-- WORK EXPERIENCE -->
  ${experience ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    <div class="entry">
      <div class="entry-header">
        <span class="entry-org">${company || 'Company'}</span>
        <span class="entry-loc">City, Country</span>
      </div>
      <div class="entry-role">
        <span>${job || 'Role'}</span>
        <span>Present</span>
      </div>
      <ul>${bulletLinesToHTML(experience)}</ul>
    </div>
  </div>` : ''}

  <!-- EDUCATION -->
  ${eduOrg ? `
  <div class="section">
    <div class="section-title">Education</div>
    <div class="entry">
      <div class="entry-header">
        <span class="entry-org">${eduOrg}</span>
        <span class="entry-loc">City, Country</span>
      </div>
      ${eduRest.length ? `<ul>${eduRest.map(l => `<li>${l.replace(/^[•\-–*]\s*/,'')}</li>`).join('')}</ul>` : ''}
    </div>
  </div>` : ''}

  <!-- KEY SKILLS -->
  ${skillsList ? `
  <div class="section">
    <div class="section-title">Key Skills</div>
    <p class="skills-text">${skillsList.replace(/\n/g, ' · ')}</p>
  </div>` : ''}

  <!-- KEY ACHIEVEMENTS -->
  ${achBullets ? `
  <div class="section">
    <div class="section-title">Key Achievements</div>
    <div class="entry">
      <ul>${achBullets}</ul>
    </div>
  </div>` : ''}

</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups and try again'); return; }
    win.document.write(html);
    win.document.close();
    win.document.title = filename;
    win.focus();
    setTimeout(() => {
      win.print();
      toast.success(`Save as "${filename}.pdf" in the print dialog`);
    }, 1000); // extra delay for Google Fonts to load
  };

  /* ── Loading ── */
  if (cvStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 95, 70, 88, 60, 75].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 16, width: `${w}%`, borderRadius: 6 }} />
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
          ✨ Writing your professional CV…
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (cvStatus === 'error') {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{cvError || 'Generation failed'}</p>
        <button className="btn btn-secondary" onClick={() => generate('cv')}>Try Again</button>
      </div>
    );
  }

  /* ── Empty ── */
  if (!store.generatedCV) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No CV Content Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Generate a tailored CV with professional summary, experience bullets, and skills
        </p>
        <button className="btn btn-primary" onClick={() => generate('cv')}>✨ Generate CV</button>
      </div>
    );
  }

  const { summary, experience, skills } = parseCVSections(store.generatedCV);

  /* ── Output ── */
  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        background: 'rgba(99,102,241,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📄</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Professional CV</span>
          <span className="badge badge-success">AI Generated</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
            📥 Download CV PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => regenerate('cv')}>
            🔄 New Version
          </button>
        </div>
      </div>

      {/* Sectioned preview */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {summary && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Professional Summary
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-primary)' }}>{summary}</p>
          </div>
        )}

        {experience && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Work Experience
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
              fontSize: 13.5,
              lineHeight: 1.8,
              color: 'var(--text-primary)',
            }}>
              {experience}
            </pre>
          </div>
        )}

        {skills && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Key Skills for This Role
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-primary)' }}>{skills}</p>
          </div>
        )}

        {/* If AI output wasn't structured, show raw */}
        {!summary && !skills && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-primary)' }}>
            {store.generatedCV}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.18)',
        fontSize: 11.5, color: 'var(--text-muted)',
      }}>
        📄 PDF uses Roboto font, A4 size, 2.5 cm margins · Saved as&nbsp;
        <em>{nameToFilePart(store.fullName || 'Applicant')}_CV.pdf</em>
      </div>
    </div>
  );
}
