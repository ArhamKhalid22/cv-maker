'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

function nameToFilePart(name: string) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Applicant';
}

/**
 * Clean cover letter text from AI:
 *  1. Remove any trailing "Sincerely, ..." block the AI adds (template already adds it)
 *  2. Replace placeholder name strings
 *  3. Fix common encoding artifacts (â€" → –, â€™ → ', etc.)
 */
function cleanLetter(raw: string, name: string): string {
  return raw
    // Strip any sign-off the AI added (we render our own)
    .replace(/\n+\s*(Sincerely|Best regards|Kind regards|Yours sincerely|Regards)[,\s\S]*$/i, '')
    // Fix UTF-8 mojibake from poorly encoded LLM output
    .replace(/\u00e2\u0080\u0099/g, "'")   // â€™  → '
    .replace(/\u00e2\u0080\u009c/g, '"')   // â€œ  → "
    .replace(/\u00e2\u0080\u009d/g, '"')   // â€   → "
    .replace(/\u00e2\u0080\u0093/g, '–')   // â€"  → –
    .replace(/\u00e2\u0080\u0094/g, '—')   // â€"  → —
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, '–')
    .replace(/â€"/g, '—')
    // Replace any placeholder name strings
    .replace(/\[Applicant Name\]/gi, name)
    .replace(/\[Your Name\]/gi, name)
    .replace(/\busername\b/gi, name)
    .trim();
}

/** Open letter in a new tab as a Blob (avoids document.write encoding issues) */
function openBlobHTML(html: string, title: string) {
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) { toast.error('Allow popups to open the PDF preview.'); return; }
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

export default function CoverLetterOutput() {
  const store = useAppStore();
  const { generate, regenerate, coverStatus, coverError } = useJobAI();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(store.coverLetter);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const name     = store.fullName?.trim()  || 'Applicant';
    const company  = store.company?.trim()   || '';
    const job      = store.jobTitle?.trim()  || 'Position';
    const email    = store.email?.trim()     || '';
    const phone    = store.phone?.trim()     || '';
    const city     = store.city?.trim()      || '';
    const linkedin = store.linkedin?.trim()  || '';

    const today = new Date().toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const letterBody = cleanLetter(store.coverLetter, name);

    // Body paragraphs
    const paragraphs = letterBody
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
      // Remove the salutation line — we render it in the template
      .filter(p => !/^Dear Hiring Manager/i.test(p))
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n');

    // Contact: only filled fields
    const contactParts: string[] = [];
    if (email)    contactParts.push(email);
    if (phone)    contactParts.push(phone);
    if (city)     contactParts.push(city);
    if (linkedin) contactParts.push(
      `<a href="https://${linkedin.replace(/^https?:\/\//, '')}" style="color:#333;text-decoration:underline;">LinkedIn</a>`
    );

    const filename = `${nameToFilePart(name)}_Cover_Letter`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="author" content="${name}"/>
  <title>${name} — Cover Letter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Roboto', Calibri, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.65;
      color: #111;
      background: #fff;
    }

    @page { size: A4; margin: 2cm; }
    @media screen { body { max-width: 21cm; margin: 0 auto; padding: 2cm; } }
    @media print  { body { padding: 0; } }

    .sender-name { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
    .sender-contact { font-size: 9.5pt; color: #444; margin-bottom: 12px; }
    .divider { border: none; border-top: 2px solid #111; margin: 10px 0 20px; }
    .date-line { font-size: 10.5pt; color: #333; margin-bottom: 16px; }
    .recipient-label { font-size: 10.5pt; margin-bottom: 4px; }
    .subject-line {
      font-weight: 700; font-size: 10.5pt;
      border-bottom: 1px solid #ccc; padding-bottom: 6px; margin: 16px 0 20px;
    }
    .salutation { margin-bottom: 14px; font-size: 10.5pt; }
    p {
      font-size: 10.5pt; line-height: 1.7; color: #111;
      margin-bottom: 14px; text-align: justify;
    }
    .signoff { margin-top: 28px; }
    .signoff .closing { margin-bottom: 30px; font-size: 10.5pt; }
    .signoff .sig-name { font-weight: 700; font-size: 12pt; }
  </style>
</head>
<body>

  <!-- SENDER -->
  <div class="sender-name">${name}</div>
  ${contactParts.length ? `<div class="sender-contact">${contactParts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
  <hr class="divider"/>

  <!-- DATE -->
  <div class="date-line">${today}</div>

  <!-- RECIPIENT -->
  <div class="recipient-label">Hiring Manager</div>
  ${company ? `<div class="recipient-label">${company}</div>` : ''}

  <!-- SUBJECT -->
  <div class="subject-line">Re: Application for ${job}${company ? ` — ${company}` : ''}</div>

  <!-- SALUTATION -->
  <div class="salutation">Dear Hiring Manager,</div>

  <!-- BODY -->
  ${paragraphs}

  <!-- SIGN-OFF (rendered once, here) -->
  <div class="signoff">
    <div class="closing">Sincerely,</div>
    <div class="sig-name">${name}</div>
  </div>

</body>
</html>`;

    openBlobHTML(html, filename);
  };

  /* ── Loading ── */
  if (coverStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 95, 80, 100, 90, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 15, width: `${w}%`, borderRadius: 6 }} />
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>
          ✉️ Writing your cover letter…
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (coverStatus === 'error') {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--error)', marginBottom: 16, fontSize: 13 }}>{coverError || 'Generation failed'}</p>
        <button className="btn btn-secondary" onClick={() => generate('cover')}>Try Again</button>
      </div>
    );
  }

  /* ── Empty ── */
  if (!store.coverLetter) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No Cover Letter Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Generate a confident, human-sounding cover letter — signed with your real name
        </p>
        <button className="btn btn-primary" onClick={() => generate('cover')}>✨ Generate Cover Letter</button>
      </div>
    );
  }

  const name = store.fullName?.trim() || 'Applicant';
  const displayLetter = cleanLetter(store.coverLetter, name);
  const paragraphs    = displayLetter
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean);

  /* ── Output ── */
  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        background: 'rgba(6,182,212,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✉️</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Cover Letter</span>
          <span className="badge badge-info">AI Generated</span>
          {store.fullName && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              signed as <strong style={{ color: 'var(--text-secondary)' }}>{store.fullName}</strong>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
            📥 Download Cover Letter PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => regenerate('cover')}>
            🔄 New Version
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ padding: '24px 28px' }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            fontSize: 14, lineHeight: 1.85, color: 'var(--text-primary)',
            marginBottom: i < paragraphs.length - 1 ? 18 : 0,
          }}>
            {para}
          </p>
        ))}
        {/* Sign-off preview — rendered once */}
        <div style={{ marginTop: 28, color: 'var(--text-secondary)', fontSize: 14 }}>
          <div style={{ marginBottom: 24 }}>Sincerely,</div>
          <div style={{ fontWeight: 700 }}>{name}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.18)', fontSize: 11.5, color: 'var(--text-muted)' }}>
        📄 A4 · Roboto/Calibri · Single sign-off ·&nbsp;
        <em>{nameToFilePart(store.fullName || 'Applicant')}_Cover_Letter.pdf</em>
      </div>
    </div>
  );
}
