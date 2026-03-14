'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

export default function CoverLetterOutput() {
  const store = useAppStore();
  const { generate, regenerate, coverStatus, coverError } = useJobAI();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(store.coverLetter);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (coverStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 95, 60].map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[90, 100, 75].map((w, j) => (
                <div key={j} className="skeleton" style={{ height: 16, width: `${w}%`, borderRadius: 6 }} />
              ))}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          ✉️ GPT-4o Mini is crafting your cover letter...
        </p>
      </div>
    );
  }

  if (coverStatus === 'error') {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--error)', marginBottom: 16 }}>{coverError || 'Generation failed'}</p>
        <button className="btn btn-secondary" onClick={() => generate('cover')}>Try Again</button>
      </div>
    );
  }

  if (!store.coverLetter) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No Cover Letter Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Generate a personalized cover letter for this role
        </p>
        <button className="btn btn-primary" onClick={() => generate('cover')}>
          ✨ Generate Cover Letter
        </button>
      </div>
    );
  }

  const paragraphs = store.coverLetter.split('\n\n').filter(p => p.trim());

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(6,182,212,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✉️</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Cover Letter</span>
          <span className="badge badge-info">AI Generated</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => regenerate('cover')}
          >
            🔄 Regenerate
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 28 }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            fontSize: 14.5,
            lineHeight: 1.85,
            color: 'var(--text-primary)',
            marginBottom: i < paragraphs.length - 1 ? 20 : 0,
          }}>
            {para}
          </p>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Personalize with your name, the hiring manager's name, and any specific company details before sending
        </span>
      </div>
    </div>
  );
}
