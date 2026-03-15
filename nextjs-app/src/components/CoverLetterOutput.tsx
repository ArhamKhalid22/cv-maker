'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';
import { safelyParseJSON } from '@/lib/json';

function nameToFilePart(name: string) {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Applicant';
}

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

  // Safely parse JSON
  let clData = null;
  if (store.coverLetter) {
    const raw = safelyParseJSON<any>(store.coverLetter);
    if (raw && raw.applicant_profile) {
      clData = raw.applicant_profile;
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(clData, null, 2) || store.coverLetter);
    setCopied(true);
    toast.success('Copied JSON data!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!clData) {
      toast.error("Failed to read Cover Letter structured data.");
      return;
    }

    const { personal_information: pInfo, cover_letter_data: cData } = clData;

    const name     = pInfo.full_name?.trim() || store.fullName?.trim() || 'Applicant';
    const email    = pInfo.email?.trim() || store.email?.trim() || '';
    const phone    = pInfo.phone?.trim() || store.phone?.trim() || '';
    const location = pInfo.location?.trim() || store.city?.trim() || '';
    
    const recipientCompany = cData.recipient_company?.trim() || store.company?.trim() || '';

    const contactParts = [email, phone, location].filter(Boolean);

    const baseName = recipientCompany ? nameToFilePart(recipientCompany) : nameToFilePart(name);
    const filename = `${baseName}_Cover_Letter`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="author" content="${name}"/>
  <title>${name} - Cover Letter</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Jost', Arial, sans-serif;
      font-size: 11pt; line-height: 1.6; color: #1a202c; background: #fff;
    }
    @page { size: A4; margin: 2.5cm; }
    @media screen { body { max-width: 21cm; margin: 2rem auto; padding: 2.5cm; box-shadow: 0 0 20px rgba(0,0,0,0.1); } }
    @media print { body { padding: 0; } }

    .header {
      margin-bottom: 3rem; border-bottom: 2px solid #2d3748; padding-bottom: 1.5rem;
    }
    .header .name { font-size: 24pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; }
    .header .contact { font-size: 10pt; color: #4a5568; }

    .letter-info { margin-bottom: 2rem; font-size: 10.5pt; line-height: 1.5; color: #2d3748; }
    
    .body-content { margin-bottom: 2rem; font-size: 10.5pt; text-align: justify; }
    .body-content p { margin-bottom: 1.25rem; }
    .body-content ul { margin: 0 0 1.25rem 2rem; }
    .body-content li { margin-bottom: 0.5rem; }

    .sign-off-block { margin-top: 2rem; font-size: 11pt; }
    .sign-off-block .signature { font-family: 'Jost', cursive; font-size: 18pt; margin-top: 1rem; color: #1a202c; font-style: italic; }
  </style>
</head>
<body>

  <div class="header">
    <div class="name">${name}</div>
    <div class="contact">${contactParts.join(' &nbsp;|&nbsp; ')}</div>
  </div>

  <div class="letter-info">
    <div style="margin-bottom: 1.5rem;">${cData.date || new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    
    ${cData.recipient_name ? `<div><strong>${cData.recipient_name}</strong></div>` : ''}
    ${recipientCompany ? `<div>${recipientCompany}</div>` : ''}
    ${cData.recipient_address ? `<div>${cData.recipient_address}</div>` : ''}
  </div>

  <div class="body-content">
    <p><strong>${cData.greeting || 'Dear Hiring Manager,'}</strong></p>
    
    ${cData.opening_paragraph ? `<p>${cData.opening_paragraph}</p>` : ''}
    
    ${cData.body_paragraphs && cData.body_paragraphs.length > 0 ? cData.body_paragraphs.map((p: string) => `<p>${p}</p>`).join('') : ''}
    
    ${cData.bulleted_achievements && cData.bulleted_achievements.length > 0 ? `
      <ul>
        ${cData.bulleted_achievements.map((b: string) => `<li>${b}</li>`).join('')}
      </ul>
    ` : ''}

    ${cData.closing_paragraph ? `<p>${cData.closing_paragraph}</p>` : ''}
  </div>

  <div class="sign-off-block">
    <div style="white-space: pre-wrap;">${cData.sign_off || 'Sincerely,'}</div>
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
          ✉️ Formatting structured Cover Letter data…
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
          Generate a strong, JSON-structured Cover Letter
        </p>
        <button className="btn btn-primary" onClick={() => generate('cover')}>✨ Generate Cover Letter</button>
      </div>
    );
  }

  if (!clData) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--error)' }}>Could not parse the generated JSON perfectly. The AI might have returned invalid text.</p>
        <pre style={{textAlign: 'left', background: '#f0f0f0', padding: 12, marginTop: 10, borderRadius: 6, fontSize: 12, overflowX:'auto'}}>
          {store.coverLetter}
        </pre>
        <button className="btn btn-secondary" style={{marginTop: 16}} onClick={() => regenerate('cover')}>Regenerate</button>
      </div>
    );
  }

  const { personal_information: pInfo, cover_letter_data: cData } = clData;

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
          <span>✉️</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Structured JSON Cover Letter</span>
          <span className="badge badge-success">Mark Briar Template</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied JSON' : '📋 Copy JSON data'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
            📥 Download Print PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => regenerate('cover')}>
            🔄 New Version
          </button>
        </div>
      </div>

      {/* Structured Preview */}
      <div style={{ padding: 40, background: '#fafafa', color: '#111', fontFamily: 'sans-serif' }}>
        <div style={{ borderBottom: '2px solid #222', paddingBottom: 20, marginBottom: 30 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {pInfo?.full_name || store.fullName || 'Applicant'}
          </h1>
          <div style={{ fontSize: 13, color: '#555' }}>
            {[pInfo?.email, pInfo?.phone, pInfo?.location].filter(Boolean).join(' | ')}
          </div>
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#333' }}>
          <div style={{ marginBottom: 24 }}>
            {cData?.date || new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <div style={{ marginBottom: 24 }}>
            {cData?.recipient_name && <div><strong>{cData.recipient_name}</strong></div>}
            {(cData?.recipient_company || store.company) && <div>{cData.recipient_company || store.company}</div>}
            {cData?.recipient_address && <div>{cData.recipient_address}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
             <strong>{cData?.greeting || 'Dear Hiring Manager,'}</strong>
          </div>

          {cData?.opening_paragraph && <p style={{ marginBottom: 16, textAlign: 'justify' }}>{cData.opening_paragraph}</p>}

          {cData?.body_paragraphs && cData.body_paragraphs.map((p: string, i: number) => (
             <p key={i} style={{ marginBottom: 16, textAlign: 'justify' }}>{p}</p>
          ))}

          {cData?.bulleted_achievements && cData.bulleted_achievements.length > 0 && (
             <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
               {cData.bulleted_achievements.map((b: string, i: number) => (
                 <li key={i} style={{ marginBottom: 8 }}>{b}</li>
               ))}
             </ul>
          )}

          {cData?.closing_paragraph && <p style={{ marginBottom: 24, textAlign: 'justify' }}>{cData.closing_paragraph}</p>}

          <div style={{ marginTop: 32 }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{cData?.sign_off || 'Sincerely,'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
