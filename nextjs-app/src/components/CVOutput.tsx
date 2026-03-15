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
  if (!win) {
    toast.error('Allow popups to open the PDF preview.');
    return;
  }
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

  // Safely parse JSON
  let cvData = null;
  if (store.generatedCV) {
    const raw = safelyParseJSON<any>(store.generatedCV);
    if (raw && raw.applicant_profile) {
      cvData = raw.applicant_profile;
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(cvData, null, 2) || store.generatedCV);
    setCopied(true);
    toast.success('Copied JSON data!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!cvData) {
      toast.error("Failed to read CV structured data.");
      return;
    }

    const { personal_information: pInfo, resume_data: rData } = cvData;
    
    // Ensure we have some safe fallbacks from store
    const name     = pInfo.full_name?.trim() || store.fullName?.trim() || 'Applicant Name';
    const title    = pInfo.professional_title?.trim() || store.jobTitle?.trim() || 'Professional';
    const email    = pInfo.email?.trim() || store.email?.trim();
    const phone    = pInfo.phone?.trim() || store.phone?.trim();
    const location = pInfo.location?.trim() || store.city?.trim();
    const linkedin = pInfo.linkedin_or_portfolio?.trim() || store.linkedin?.trim();

    const contactParts = [email, phone, location].filter(Boolean);

    const baseName = store.company ? nameToFilePart(store.company) : nameToFilePart(name);
    const filename = `${baseName}_CV`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${name} - CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Jost', sans-serif;
      font-size: 10.5pt; color: #2d3748; line-height: 1.5; background: #fff;
    }
    @page { size: A4; margin: 1.5cm; }
    @media screen { body { max-width: 21cm; margin: 2rem auto; padding: 1.5cm; box-shadow: 0 0 20px rgba(0,0,0,0.1); } }
    @media print { body { padding: 0; } }

    /* Header */
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 1.5rem; border-bottom: 2px solid #1a202c; margin-bottom: 2rem;
    }
    .header-left { flex: 1; text-transform: uppercase; }
    .name { font-size: 32pt; font-weight: 300; letter-spacing: 2px; color: #1a202c; line-height: 1.1; margin-bottom: 0.25rem; }
    .title { font-size: 11pt; font-weight: 600; letter-spacing: 4px; color: #4a5568; }
    .header-right { flex: 0 0 240px; text-align: right; }
    .contact-item { font-size: 9.5pt; color: #1a202c; margin-bottom: 4px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

    /* Grid Layout */
    .main-grid {
      display: grid; grid-template-columns: 200px 1fr; gap: 2.5rem;
    }
    .left-col { border-right: 1px solid #e2e8f0; padding-right: 2.5rem; }
    .right-col { }

    /* Sections */
    .section-title {
      font-size: 11pt; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
      color: #1a202c; margin-bottom: 1.25rem;
    }

    /* Blocks */
    p.summary { font-size: 10.5pt; text-align: justify; margin-bottom: 2rem; line-height: 1.6; }
    
    .exp-item, .edu-item, .proj-item { margin-bottom: 1.5rem; }
    .exp-header { margin-bottom: 0.5rem; }
    .exp-title { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; color: #1a202c; }
    .exp-company { font-size: 10pt; font-weight: 600; color: #4a5568; margin-top:2px; }
    .exp-date { font-size: 9.5pt; font-style: italic; color: #718096; }
    ul { list-style-type: none; padding-left: 0; }
    ul li { position: relative; padding-left: 14px; margin-bottom: 6px; font-size: 10pt; line-height: 1.5; color: #2d3748;}
    ul li::before { content: "•"; position: absolute; left: 0; color: #a0aec0; }

    .skills-list li { padding-left: 0; margin-bottom: 8px; font-weight: 500; }
    .skills-list li::before { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="name">${name}</div>
      <div class="title">${title}</div>
    </div>
    <div class="header-right">
      ${contactParts.map(str => `<div class="contact-item">${str}</div>`).join('')}
      ${linkedin ? `<div class="contact-item"><a href="${linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}" style="color:inherit;text-decoration:none;">LinkedIn</a></div>` : ''}
    </div>
  </div>

  <div class="main-grid">
    <div class="left-col">
      ${rData.education && rData.education.length > 0 ? `
        <div class="section-title">Education</div>
        ${rData.education.map((ed: any) => `
          <div class="edu-item">
            <div class="exp-title">${ed.degree_name || ''}</div>
            <div class="exp-company">${ed.institution_name || ''}</div>
            <div class="exp-date">${[ed.location, `${ed.start_year || ''} ${ed.start_year && ed.end_year ? '-' : ''} ${ed.end_year || ''}`.trim()].filter(Boolean).join(' | ')}</div>
          </div>
        `).join('')}
        <br/>
      ` : ''}

      ${rData.core_skills && rData.core_skills.length > 0 ? `
        <div class="section-title">Core Skills</div>
        <ul class="skills-list">
          ${rData.core_skills.map((sk: string) => `<li>${sk}</li>`).join('')}
        </ul>
        <br/>
      ` : ''}
      
      ${rData.certifications_and_courses && rData.certifications_and_courses.length > 0 ? `
        <div class="section-title">Certifications</div>
        <ul class="skills-list" style="font-weight:400;font-size:9pt;">
          ${rData.certifications_and_courses.map((c: string) => `<li>${c}</li>`).join('')}
        </ul>
      ` : ''}
    </div>

    <div class="right-col">
      ${rData.summary ? `
        <div class="section-title">Summary</div>
        <p class="summary">${rData.summary}</p>
      ` : ''}

      ${rData.professional_experience && rData.professional_experience.length > 0 ? `
        <div class="section-title">Professional Experience</div>
        ${rData.professional_experience.map((exp: any) => `
          <div class="exp-item">
            <div class="exp-header">
              <div class="exp-title">${exp.job_title || ''}</div>
              <div class="exp-company">${exp.company_name || ''} — ${[exp.location, `${exp.start_date || ''} ${exp.start_date && exp.end_date ? '-' : ''} ${exp.end_date || ''}`.trim()].filter(Boolean).join(', ')}</div>
            </div>
            ${exp.accomplishment_bullets && exp.accomplishment_bullets.length > 0 ? `
              <ul>
                ${exp.accomplishment_bullets.map((b: string) => `<li>${b}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      ` : ''}

      ${rData.projects && rData.projects.length > 0 ? `
        <div class="section-title">Projects</div>
        ${rData.projects.map((proj: any) => `
          <div class="proj-item">
            <div class="exp-header">
              <div class="exp-title">${proj.project_name || ''}</div>
            </div>
            <p style="font-size: 10pt; line-height: 1.5; text-align: justify">${proj.description || ''}</p>
          </div>
        `).join('')}
      ` : ''}
    </div>
  </div>
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
          ✨ Generating your structured JSON CV…
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

  /* ── Empty or Invalid Data ── */
  if (!store.generatedCV) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No CV Content Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Generate a tailored, JSON-structured CV matching modern, beautiful layouts.
        </p>
        <button className="btn btn-primary" onClick={() => generate('cv')}>✨ Generate Structured CV</button>
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--error)' }}>Could not parse the generated JSON perfectly. The AI might have returned invalid text.</p>
        <pre style={{textAlign: 'left', background: '#f0f0f0', padding: 12, marginTop: 10, borderRadius: 6, fontSize: 12, overflowX:'auto'}}>
          {store.generatedCV}
        </pre>
        <button className="btn btn-secondary" style={{marginTop: 16}} onClick={() => regenerate('cv')}>Regenerate</button>
      </div>
    );
  }

  const { personal_information: pInfo, resume_data: rData } = cvData;

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
          <span style={{ fontWeight: 600, fontSize: 14 }}>Structured JSON CV</span>
          <span className="badge badge-success">Olivia Mills Template</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied JSON' : '📋 Copy JSON data'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
            📥 Download Print PDF
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => regenerate('cv')}>
            🔄 New Version
          </button>
        </div>
      </div>

      {/* Structured preview inside the app itself */}
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, background: '#fafafa', color: '#111', fontFamily: 'sans-serif' }}>
        <div style={{ paddingBottom: '1rem', borderBottom: '2px solid #222', display: 'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
          <div>
            <h1 style={{fontSize: 28, textTransform:'uppercase', fontWeight: 300, letterSpacing: 2, marginBottom:4}}>{pInfo?.full_name || store.fullName || 'Applicant'}</h1>
            <h3 style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#555'}}>{pInfo?.professional_title || store.jobTitle}</h3>
          </div>
          <div style={{textAlign: 'right', fontSize: 11, color: '#333'}}>
            <div>{pInfo?.email || store.email}</div>
            <div>{pInfo?.phone || store.phone}</div>
            <div>{pInfo?.location || store.city}</div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '2rem' }}>
          <div style={{ borderRight: '1px solid #ddd', paddingRight: '2rem' }}>
            {rData?.education && rData.education.length > 0 && (
              <div style={{marginBottom: 24}}>
                <h4 style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12}}>Education</h4>
                {rData.education.map((e: any, i: number) => (
                  <div key={i} style={{marginBottom: 12}}>
                    <div style={{fontSize: 12, fontWeight: 700}}>{e.degree_name}</div>
                    <div style={{fontSize: 11}}>{e.institution_name}</div>
                    <div style={{fontSize: 11, color: '#666'}}>{e.start_year} - {e.end_year}</div>
                  </div>
                ))}
              </div>
            )}
            {rData?.core_skills && rData.core_skills.length > 0 && (
              <div style={{marginBottom: 24}}>
                <h4 style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12}}>Core Skills</h4>
                <div style={{fontSize:12, lineHeight: 1.8}}>
                  {rData.core_skills.map((s: string, idx: number) => (
                    <div key={idx}>{s}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            {rData?.summary && (
              <div style={{marginBottom: 24}}>
                <h4 style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12}}>Summary</h4>
                <p style={{fontSize: 13, lineHeight: 1.6}}>{rData.summary}</p>
              </div>
            )}
            
            {rData?.professional_experience && rData.professional_experience.length > 0 && (
              <div style={{marginBottom: 24}}>
                <h4 style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16}}>Professional Experience</h4>
                {rData.professional_experience.map((exp: any, i: number) => (
                  <div key={i} style={{marginBottom: 20}}>
                     <div style={{fontSize: 13, fontWeight: 700}}>{exp.job_title}</div>
                     <div style={{fontSize: 12, fontWeight: 600, color: '#444'}}>{exp.company_name} — {exp.location}</div>
                     <div style={{fontSize: 11, color: '#777', fontStyle: 'italic', marginBottom: 8}}>{exp.start_date} - {exp.end_date}</div>
                     <ul style={{fontSize: 13, paddingLeft: 18, margin: 0}}>
                       {exp.accomplishment_bullets && exp.accomplishment_bullets.map((b: string, j: number) => (
                         <li key={j} style={{marginBottom: 6, listStyleType: 'disc'}}>{b}</li>
                       ))}
                     </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
