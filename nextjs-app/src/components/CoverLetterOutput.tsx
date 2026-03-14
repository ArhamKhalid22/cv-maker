'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

function nameToFilePart(name: string) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Applicant';
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
    const name    = store.fullName?.trim()  || 'Applicant';
    const company = store.company?.trim()   || '';
    const job     = store.jobTitle?.trim()  || 'Position';
    const today   = new Date().toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Replace any AI placeholder text with the real name
    const letterText = (store.coverLetter || '')
      .replace(/\[Applicant Name\]/gi, name)
      .replace(/\[Your Name\]/gi, name)
      .replace(/\busername\b/gi, name);

    // Split into paragraphs and format as <p> elements
    const paragraphs = letterText
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n');

    const filename = `${nameToFilePart(name)}_Cover_Letter`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="author" content="${name}"/>
  <title>${name} — Cover Letter — ${company || job}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-size: 11.5pt;
      font-weight: 400;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 2.5cm 2.5cm 2.5cm 2.5cm;
      max-width: 21cm;
      margin: 0 auto;
    }

    /* ── SENDER BLOCK ── */
    .sender {
      margin-bottom: 28px;
    }
    .sender-name {
      font-size: 16pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 3px;
    }
    .sender-meta {
      font-size: 9.5pt;
      color: #666;
    }
    .divider {
      border: none;
      border-top: 1.5px solid #222;
      margin: 12px 0 22px;
    }

    /* ── DATE + RECIPIENT ── */
    .date-line {
      font-size: 10.5pt;
      color: #444;
      margin-bottom: 18px;
    }
    .recipient { margin-bottom: 20px; }
    .recipient .recipient-role { font-weight: 500; font-size: 11pt; }
    .recipient .recipient-company { font-size: 10.5pt; color: #444; }

    /* ── SUBJECT LINE ── */
    .subject-line {
      font-weight: 700;
      font-size: 11pt;
      color: #111;
      margin-bottom: 20px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }

    /* ── BODY PARAGRAPHS ── */
    p {
      margin-bottom: 14px;
      font-size: 11pt;
      line-height: 1.7;
      text-align: justify;
      color: #222;
    }

    /* ── SIGN-OFF ── */
    .signoff {
      margin-top: 28px;
    }
    .signoff .closing {
      margin-bottom: 32px;
      font-size: 11pt;
    }
    .signoff .sig-name {
      font-weight: 700;
      font-size: 12pt;
      color: #111;
    }

    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 2.5cm; }
    }
  </style>
</head>
<body>

  <!-- SENDER BLOCK -->
  <div class="sender">
    <div class="sender-name">${name}</div>
    <div class="sender-meta">your.email@example.com &nbsp;·&nbsp; +44 0000 000000 &nbsp;·&nbsp; City, Country</div>
  </div>
  <hr class="divider"/>

  <!-- DATE -->
  <div class="date-line">${today}</div>

  <!-- RECIPIENT -->
  <div class="recipient">
    <div class="recipient-role">Hiring Manager</div>
    ${company ? `<div class="recipient-company">${company}</div>` : ''}
  </div>

  <!-- SUBJECT -->
  ${job ? `<div class="subject-line">Re: Application for ${job}${company ? ' — ' + company : ''}</div>` : ''}

  <!-- BODY -->
  ${paragraphs}

  <!-- SIGN-OFF -->
  <div class="signoff">
    <div class="closing">Sincerely,</div>
    <div class="sig-name">${name}</div>
  </div>

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
    }, 1000);
  };

  /* ── Loading ── */
  if (coverStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 95, 60].map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[90, 100, 75].map((w, j) => (
                <div key={j} className="skeleton" style={{ height: 15, width: `${w}%`, borderRadius: 6 }} />
              ))}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          ✉️ Writing your personalized cover letter…
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
          Generate a confident, human-sounding cover letter — signed with your name
        </p>
        <button className="btn btn-primary" onClick={() => generate('cover')}>✨ Generate Cover Letter</button>
      </div>
    );
  }

  const name = store.fullName?.trim() || 'Applicant';
  const displayLetter = store.coverLetter
    .replace(/\[Applicant Name\]/gi, name)
    .replace(/\[Your Name\]/gi, name)
    .replace(/\busername\b/gi, name);

  const paragraphs = displayLetter.split('\n\n').filter(p => p.trim());

  /* ── Output ── */
  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header bar */}
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
          <button
            className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
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

      {/* Letter preview */}
      <div style={{ padding: '24px 28px' }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            fontSize: 14,
            lineHeight: 1.85,
            color: 'var(--text-primary)',
            marginBottom: i < paragraphs.length - 1 ? 18 : 0,
          }}>
            {para}
          </p>
        ))}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.18)',
        fontSize: 11.5, color: 'var(--text-muted)',
      }}>
        📄 PDF uses Roboto font, A4 size, 2.5 cm margins · Saved as&nbsp;
        <em>{nameToFilePart(store.fullName || 'Applicant')}_Cover_Letter.pdf</em>
      </div>
    </div>
  );
}
