'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import JobInputPanel from '@/components/JobInputPanel';
import GenerationTabs from '@/components/GenerationTabs';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function GeneratePage() {
  const store = useAppStore();
  const { generateAll, cvStatus, coverStatus, skillsStatus } = useJobAI();
  const [activeSection, setActiveSection] = useState<'input' | 'output'>('input');
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
    setActiveSection('output');
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const handleSave = () => {
    store.saveApplication();
    toast.success('Application saved to dashboard!');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '48px 0 40px',
      }}>
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 99, padding: '6px 16px', marginBottom: 20,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>Powered by OpenRouter · Claude 3.5 Sonnet · GPT-4o</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 16 }}>
            Generate Your <span className="gradient-text">Perfect Application</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 560, margin: '0 auto 28px' }}>
            Paste a job description (or URL/screenshot), add your background, and get a tailored CV, cover letter, and skills analysis in seconds.
          </p>

          {hasAnyOutput && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveSection('input')}>
                ✏️ Edit Inputs
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleSave}>
                💾 Save to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container-sm" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>

        {/* Input Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>1</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Job & Background</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter the job description and your experience</p>
            </div>
          </div>
          <JobInputPanel />
        </div>

        {/* Generate Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerateAll}
            disabled={isAnyLoading}
            style={{ minWidth: 260, position: 'relative' }}
          >
            {isAnyLoading ? (
              <>
                <span className="animate-spin" style={{ fontSize: 16 }}>⚙</span>
                Generating with AI...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Full Application Kit
              </>
            )}
          </button>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            Generates CV bullets · Cover letter · Skills match analysis
          </p>
        </div>

        {/* Output Section */}
        {hasAnyOutput && (
          <div ref={outputRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--gradient-primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>2</div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Application Kit</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI-generated and tailored for this specific job</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleSave}>
                💾 Save
              </button>
            </div>
            <GenerationTabs />
          </div>
        )}
      </div>
    </div>
  );
}
