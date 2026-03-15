'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

function nameToFilePart(name: string) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Applicant';
}

/**
 * Parse AI CV text into three labelled sections.
 */
function parseCVSections(raw: string) {
  const summaryMatch = raw.match(/PROFESSIONAL SUMMARY:\s*([\s\S]*?)(?=WORK EXPERIENCE:|KEY SKILLS|$)/i);
  const expMatch     = raw.match(/WORK EXPERIENCE:\s*([\s\S]*?)(?=KEY SKILLS|PROFESSIONAL SUMMARY|$)/i);
  const skillsMatch  = raw.match(/KEY SKILLS(?:[^:]*)?:\s*([\s\S]*?)$/i);
  return {
    summary:    summaryMatch?.[1]?.trim() || '',
    experience: expMatch?.[1]?.trim()     || raw,
    skills:     skillsMatch?.[1]?.trim()  || '',
  };
}

/**
 * Parse the user's raw background text into structured entries.
 * Detects company/role header lines vs bullet lines.
 */
function parseExperienceEntries(bg: string) {
  const lines   = bg.split('\n').map(l => l.trim()).filter(Boolean);
  const entries: { header: string; bullets: string[] }[] = [];
  let current:   { header: string; bullets: string[] } | null = null;

  for (const line of lines) {
    const isBullet = /^[•\-–*]/.test(line);
    if (isBullet) {
      if (current) current.bullets.push(line.replace(/^[•\-–*]\s*/, ''));
    } else {
      if (current) entries.push(current);
      current = { header: line, bullets: [] };
    }
  }
  if (current) entries.push(current);
  return entries;
}

/** Turns a bullet string into a <li> list */
function bulletsToHTML(text: string) {
  return text
    .split('\n')
    .map(l => l.trim().replace(/^[•\-–*]\s*/, ''))
    .filter(Boolean)
    .map(l => `<li>${l}</li>`)
    .join('\n');
}

/** Helper to open a Blob URL — avoids encoding bugs from document.write */
function openBlobHTML(html: string, title: string) {
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) {
    toast.error('Allow popups to open the PDF preview.');
    return;
  }
  // give fonts time to load before the print dialog appears
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.document.title = title;
      win.focus();
      win.print();
      URL.revokeObjectURL(url);
      toast.success(`Save as "${title}.pdf" in the print dialog`);
    }, 1200);
  });
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
    const name     = store.fullName?.trim()     || 'Your Name';
    const jobApply = store.jobTitle?.trim()     || '';
    const company  = store.company?.trim()      || '';
    const edu      = store.education?.trim()    || '';
    const ach      = store.achievements?.trim() || '';
    const email    = store.email?.trim()        || '';
    const phone    = store.phone?.trim()        || '';
    const city     = store.city?.trim()         || '';
    const linkedin = store.linkedin?.trim()     || '';
    const bg       = store.userBackground?.trim()  || '';
    const combined = [store.hardSkills, store.softSkills].filter(Boolean).join(', ');

    const { summary, experience, skills } = parseCVSections(store.generatedCV);

    // Parse user's real work history for section headers
    const bgEntries = parseExperienceEntries(bg);

    // Education: split multi-line
    const eduLines = edu.split('\n').map(l => l.trim()).filter(Boolean);

    // Achievements: bullet list
    const achBullets = ach
      ? ach.split('\n').map(l => l.trim()).filter(Boolean)
          .map(l => l.replace(/^[•\-–*]\s*/, ''))
          .map(l => `<li>${l}</li>`).join('\n')
      : '';

    const skillsList = skills || combined || '';
    const filename   = `${nameToFilePart(name)}_CV`;

    // Contact line: only show fields that are actually filled
    const contactParts: string[] = [];
    if (email)    contactParts.push(email);
    if (phone)    contactParts.push(phone);
    if (city)     contactParts.push(city);
    if (linkedin) contactParts.push(
      `<a href="https://${linkedin.replace(/^https?:\/\//, '')}" style="color:#333;text-decoration:underline;">LinkedIn</a>`
    );

    // Work experience HTML: use real bg entries for headers, AI bullets as content
    // If bg is structured, use it. Otherwise render AI bullets directly.
    const aiBulletHTML = bulletsToHTML(experience);
    let workHTML = '';
    if (bgEntries.length > 0) {
      // Render each real entry header with its own bullets  (or AI bullets on first entry)
      workHTML = bgEntries.map((entry, i) => {
        const bullets = entry.bullets.length > 0
          ? entry.bullets.map(b => `<li>${b}</li>`).join('\n')
          : (i === 0 ? aiBulletHTML : ''); // AI bullets under first entry only
        return `
    <div class="entry">
      <div class="entry-header">${entry.header}</div>
      ${bullets ? `<ul>${bullets}</ul>` : ''}
    </div>`;
      }).join('\n');
    } else {
      // Unstructured bg — just show AI-enhanced bullets
      workHTML = `<div class="entry"><ul>${aiBulletHTML}</ul></div>`;
    }

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
      font-family: 'Roboto', Calibri, Arial, sans-serif;
      font-size: 10.5pt;
      font-weight: 400;
      line-height: 1.5;
      color: #111;
      background: #fff;
    }

    /* ── PAGE ── */
    @page { size: A4; margin: 2cm; }
    @media screen { body { max-width: 21cm; margin: 0 auto; padding: 2cm; } }
    @media print  { body { padding: 0; } }

    /* ── HEADER ── */
    .cv-name {
      font-size: 20pt; font-weight: 700; letter-spacing: -0.3px;
      color: #000; margin-bottom: 4px;
    }
    .cv-contact {
      font-size: 9.5pt; color: #444; line-height: 1.7;
      margin-bottom: 12px;
    }
    .cv-divider { border: none; border-top: 2px solid #111; margin: 10px 0 18px; }

    /* ── SECTION ── */
    .section { margin-bottom: 18px; }
    .section-title {
      font-size: 9.5pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.4px; color: #000;
      border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 10px;
    }

    /* ── SUMMARY ── */
    .summary-text { font-size: 10pt; line-height: 1.65; color: #222; }

    /* ── ENTRY ── */
    .entry { margin-bottom: 12px; }
    .entry-header {
      font-size: 10pt; font-weight: 700; color: #111;
      margin-bottom: 5px;
    }
    .entry ul { padding-left: 17px; list-style-type: disc; }
    .entry ul li { margin-bottom: 3px; font-size: 10pt; line-height: 1.5; }

    /* ── EDU ── */
    .edu-block { margin-bottom: 10px; }
    .edu-inst  { font-weight: 700; font-size: 10.5pt; }
    .edu-detail { font-size: 10pt; color: #333; margin-top: 2px; }

    /* ── SKILLS ── */
    .skills-text { font-size: 10pt; line-height: 1.75; color: #222; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="cv-name">${name}</div>
  <div class="cv-contact">
    ${contactParts.join(' &nbsp;·&nbsp; ') || ''}
  </div>
  <hr class="cv-divider"/>

  <!-- PROFESSIONAL SUMMARY -->
  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary-text">${summary.replace(/\n/g, ' ')}</p>
  </div>` : ''}

  <!-- WORK EXPERIENCE -->
  ${bg ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${workHTML}
  </div>` : ''}

  <!-- EDUCATION -->
  ${eduLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    <div class="edu-block">
      <div class="edu-inst">${eduLines[0]}</div>
      ${eduLines.slice(1).map(l => `<div class="edu-detail">${l}</div>`).join('')}
    </div>
  </div>` : ''}

  <!-- KEY SKILLS -->
  ${skillsList ? `
  <div class="section">
    <div class="section-title">Key Skills</div>
    <p class="skills-text">${skillsList.replace(/,\s*/g, '&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>
  </div>` : ''}

  <!-- KEY ACHIEVEMENTS -->
  ${achBullets ? `
  <div class="section">
    <div class="section-title">Key Achievements</div>
    <div class="entry"><ul>${achBullets}</ul></div>
  </div>` : ''}

</body>
</html>`;

    openBlobHTML(html, filename);
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
          <button className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
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
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-primary)' }}>
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

        {!summary && !skills && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-primary)' }}>
            {store.generatedCV}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.18)', fontSize: 11.5, color: 'var(--text-muted)' }}>
        📄 A4 · Roboto/Calibri · 2 cm margins · Real work history used ·&nbsp;
        <em>{nameToFilePart(store.fullName || 'Applicant')}_CV.pdf</em>
      </div>
    </div>
  );
}
