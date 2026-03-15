'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';

type InputTab = 'text' | 'url' | 'image';

export default function JobInputPanel() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<InputTab>('text');
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [isOcr, setIsOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // URL Scraping
  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return;
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scraping failed');
      store.setJobDescription(data.text);
      store.setJobUrl(urlInput);
      setActiveTab('text');
      toast.success(`Extracted ${data.charCount} characters via ${data.method}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to scrape URL');
    } finally {
      setIsScraping(false);
    }
  };

  // OCR from image
  const handleImageOcr = async (file: File) => {
    setIsOcr(true);
    setOcrProgress(0);
    try {
      // Dynamically import Tesseract.js to keep main bundle small
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = result.data.text.trim();
      if (text.length < 30) {
        toast.error('Could not extract enough text. Try a clearer image.');
        return;
      }
      store.setJobDescription(text);
      setActiveTab('text');
      toast.success(`Extracted ${text.length} characters from image`);
    } catch (e) {
      toast.error('OCR failed. Try a clearer screenshot.');
      console.error('[OCR]', e);
    } finally {
      setIsOcr(false);
      setOcrProgress(0);
    }
  };

  const tabs: { id: InputTab; label: string; icon: string }[] = [
    { id: 'text', label: 'Paste Text', icon: '📝' },
    { id: 'url', label: 'Job URL', icon: '🔗' },
    { id: 'image', label: 'Screenshot', icon: '📸' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Job Description */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <label className="label" style={{ margin: 0, fontSize: 15 }}>
            🎯 Job Description
          </label>
          {store.jobDescription && (
            <span className="badge badge-success">{store.jobDescription.length} chars</span>
          )}
        </div>

        {/* Input Method Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Text Tab */}
        {activeTab === 'text' && (
          <textarea
            className="textarea"
            style={{ minHeight: 200, fontFamily: 'var(--font-sans)', fontSize: 14 }}
            placeholder="Paste the full job description here...

Example:
Senior Software Engineer - React/TypeScript
Company: Acme Corp

We are looking for an experienced engineer...
Requirements:
• 5+ years experience with React...
• Strong TypeScript skills..."
            value={store.jobDescription}
            onChange={(e) => store.setJobDescription(e.target.value)}
          />
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="url"
              placeholder="https://linkedin.com/jobs/... or any job posting URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrapeUrl()}
            />
            <button
              className="btn btn-primary"
              onClick={handleScrapeUrl}
              disabled={isScraping || !urlInput.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              {isScraping ? (
                <><span className="animate-spin">⚙</span> Extracting...</>
              ) : (
                <><span>🔍</span> Extract Job Description</>
              )}
            </button>
            {/* UI Warning Removed to keep interface clean */}
          </div>
        )}

        {/* Image Tab */}
        {activeTab === 'image' && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageOcr(file);
              }}
            />
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 12,
                padding: '48px 32px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isOcr ? 'rgba(99,102,241,0.05)' : 'transparent',
              }}
              onClick={() => !isOcr && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith('image/')) handleImageOcr(file);
              }}
            >
              {isOcr ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>Extracting text... {ocrProgress}%</p>
                  <div className="progress-bar" style={{ maxWidth: 240, margin: '0 auto' }}>
                    <div className="progress-fill" style={{ width: `${ocrProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop a screenshot here</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    or click to upload · JPG, PNG, WebP
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                    Choose Image
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Meta */}
      <div className="glass-card" style={{ padding: 24 }}>
        <label className="label" style={{ fontSize: 15, marginBottom: 16 }}>📋 Job Details (optional)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="label">Job Title</label>
            <input
              className="input"
              placeholder="e.g. Senior React Developer"
              value={store.jobTitle}
              onChange={(e) => store.setJobTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input
              className="input"
              placeholder="e.g. Acme Corp"
              value={store.company}
              onChange={(e) => store.setCompany(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* User Background */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <label className="label" style={{ margin: 0, fontSize: 15 }}>
            👤 Your Background / Current CV
          </label>
          {store.userBackground && (
            <span className="badge badge-purple">{store.userBackground.length} chars</span>
          )}
        </div>
        <textarea
          className="textarea"
          style={{ minHeight: 200, fontFamily: 'var(--font-sans)', fontSize: 14 }}
          placeholder="Paste your current CV, LinkedIn summary, or describe your experience...

Example:
5 years of experience as a full-stack developer. Led a team of 4 engineers at XYZ Corp to build a SaaS platform serving 10k users. Expert in React, TypeScript, Node.js, and PostgreSQL. Built and deployed 3 production applications. MSc in Computer Science from University of X..."
          value={store.userBackground}
          onChange={(e) => store.setUserBackground(e.target.value)}
        />
      </div>
    </div>
  );
}
