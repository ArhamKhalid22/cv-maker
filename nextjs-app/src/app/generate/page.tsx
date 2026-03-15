'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import JobInputPanel from '@/components/JobInputPanel';
import GenerationTabs from '@/components/GenerationTabs';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
      {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );
}

export default function GeneratePage() {
  const store = useAppStore();
  const { generateAll, cvStatus, coverStatus, skillsStatus } = useJobAI();
  const outputRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isAnyLoading = cvStatus === 'loading' || coverStatus === 'loading' || skillsStatus === 'loading';
  const hasOutput    = store.generatedCV || store.coverLetter || store.skillsAnalysis;

  const profileComplete = !!(store.fullName?.trim() && store.userBackground?.trim());

  useEffect(() => {
    // If arriving here with NO profile, show a toast suggestion
    if (!profileComplete && !store.generatedCV) {
      toast('Welcome! To get the best results, fill out your global Profile first.', {
        icon: '👋',
        duration: 5000,
      });
    }
  }, [profileComplete, store.generatedCV]);

  const validate = (requiredMsg: string, condition: boolean) => {
    if (!condition) { toast.error(requiredMsg); return false; }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate('Please enter a job description first.', !!store.jobDescription.trim())) return;
    if (!validate('Please complete your profile (Name & Experience) first.', profileComplete)) {
      router.push('/profile');
      return;
    }
    await generateAll();
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
  };

  const handleSave = () => {
    store.saveApplication();
    toast.success('Saved to Dashboard!');
    router.push('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 60 }}>
      <Navbar />

      {/* Hero */}
      <div style={{ padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 12 }}>
          Create Application Kit
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
          Paste the job details and we'll generate a CV and cover letter tailored specifically to this role, matching against your global profile.
        </p>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 20px' }}>
        <div className="glass-card" style={{ padding: 32, marginBottom: 30 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Target Job</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 20 }}>
            Paste the job description or provide a URL/screenshot.
          </p>

          <JobInputPanel />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <Label text="Job Title" />
              <input className="input" placeholder="e.g. Senior Software Engineer" value={store.jobTitle} onChange={e => store.setJobTitle(e.target.value)} />
            </div>
            <div>
              <Label text="Company" />
              <input className="input" placeholder="e.g. Google" value={store.company} onChange={e => store.setCompany(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Global Profile Check */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 30, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Your Global Profile</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {profileComplete 
                  ? "We'll use these details to generate the documents." 
                  : "⚠️ Your profile is empty. You must fill it out before generating."}
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/profile')}>
              {profileComplete ? '✏️ Edit Profile' : '📝 Create Profile'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Name', value: [store.fullName, store.city].filter(Boolean).join(' · ') || '—' },
              { label: 'Experience', value: store.userBackground ? store.userBackground.slice(0, 60) + '…' : '—' },
              { label: 'Skills', value: [store.hardSkills, store.softSkills].filter(Boolean).join(', ').slice(0, 40) + '…' || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 80, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: value === '—' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ATS note */}
        <div style={{ padding: '14px 18px', marginBottom: 20, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          🤖 <strong>AI Undetectability:</strong> The generator uses STAR-method prompts, bans cliché AI words, enforces quantified results, and varies sentence structure — so the output reads like a skilled human wrote it.
        </div>

        <button 
          className="btn btn-primary btn-lg" 
          onClick={handleGenerate} 
          disabled={isAnyLoading} 
          style={{ width: '100%', fontSize: 16, padding: '20px 0' }}
        >
          {isAnyLoading
            ? <><span className="animate-spin" style={{ fontSize: 18 }}>⚙</span> Generating Application Kit…</>
            : <><span>✨</span> Generate CV + Cover Letter</>}
        </button>

        {hasOutput && (
          <div ref={outputRef} style={{ marginTop: 40, scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Your Application Kit</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>AI-generated, tailored, ATS-ready</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={handleSave}>💾 Save to Dashboard</button>
              </div>
            </div>
            <GenerationTabs />
          </div>
        )}
      </div>
    </div>
  );
}
