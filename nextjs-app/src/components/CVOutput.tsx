'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import toast from 'react-hot-toast';

export default function CVOutput() {
  const store = useAppStore();
  const { generate, regenerate, cvStatus, cvError } = useJobAI();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(store.generatedCV);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (cvStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 95, 70, 88, 60].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 18, width: `${w}%`, borderRadius: 6 }} />
          ))}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {[45, 60, 50].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 18, width: `${w}%`, borderRadius: 6 }} />
            ))}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
          ✨ Claude 3.5 Sonnet is tailoring your CV...
        </p>
      </div>
    );
  }

  if (cvStatus === 'error' || (!store.generatedCV && cvStatus !== 'idle')) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--error)', marginBottom: 16 }}>{cvError || 'Generation failed'}</p>
        <button className="btn btn-secondary" onClick={() => generate('cv')}>Try Again</button>
      </div>
    );
  }

  if (!store.generatedCV) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No CV Content Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Click Generate to create tailored CV content
        </p>
        <button className="btn btn-primary" onClick={() => generate('cv')}>
          ✨ Generate CV
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(99,102,241,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📄</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>ATS-Optimized CV Content</span>
          <span className="badge badge-success">AI Generated</span>
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
            onClick={() => regenerate('cv')}
            title="Generate a new variation"
          >
            🔄 Regenerate
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text-primary)',
        }}>
          {store.generatedCV}
        </pre>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Tip: Copy this into your CV document, keeping your layout and design
        </span>
      </div>
    </div>
  );
}
