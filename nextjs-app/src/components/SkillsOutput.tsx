'use client';

import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';

export default function SkillsOutput() {
  const store = useAppStore();
  const { generate, regenerate, skillsStatus, skillsError } = useJobAI();

  if (skillsStatus === 'loading') {
    return (
      <div className="glass-card" style={{ padding: 32 }}>
        {/* Match score skeleton */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 8, margin: '0 auto' }} />
        </div>
        {/* Skills skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
          🎯 Analyzing job requirements...
        </p>
      </div>
    );
  }

  if (skillsStatus === 'error') {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--error)', marginBottom: 16 }}>{skillsError || 'Analysis failed'}</p>
        <button className="btn btn-secondary" onClick={() => generate('skills')}>Try Again</button>
      </div>
    );
  }

  if (!store.skillsAnalysis) {
    return (
      <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No Skills Analysis Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Get an AI-powered breakdown of how well you match this role
        </p>
        <button className="btn btn-primary" onClick={() => generate('skills')}>
          🎯 Analyze Skills Match
        </button>
      </div>
    );
  }

  const { matchScore, topSkills, gaps, strengths, summary } = store.skillsAnalysis;

  const scoreColor =
    matchScore >= 75 ? '#10b981' :
    matchScore >= 50 ? '#f59e0b' :
    '#ef4444';

  const relevanceColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#94a3b8',
  };

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Match Score */}
      <div className="glass-card-accent" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            <circle
              cx="70" cy="70" r="58"
              fill="none"
              stroke={scoreColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 58}`}
              strokeDashoffset={`${2 * Math.PI * 58 * (1 - matchScore / 100)}`}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${scoreColor}60)` }}
            />
            <text x="70" y="68" textAnchor="middle" fill="white" fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">
              {matchScore}%
            </text>
            <text x="70" y="90" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Inter, sans-serif">
              MATCH SCORE
            </text>
          </svg>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 16px', fontSize: 14, lineHeight: 1.7 }}>
          {summary}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => regenerate('skills')}>
          🔄 Re-analyze
        </button>
      </div>

      {/* Top Skills */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🔑 Key Skills Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topSkills.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px',
              background: s.inResume ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.04)',
              border: `1px solid ${s.inResume ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 18, minWidth: 24, marginTop: 2 }}>
                {s.inResume ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.skill}</span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                    background: `${relevanceColors[s.relevance]}20`,
                    color: relevanceColors[s.relevance],
                    border: `1px solid ${relevanceColors[s.relevance]}40`,
                    textTransform: 'uppercase',
                  }}>
                    {s.relevance}
                  </span>
                </div>
                {s.tip && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.tip}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#10b981' }}>
            ✅ Your Strengths
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {strengths.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#10b981', flexShrink: 0 }}>+</span> {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#ef4444' }}>
            📚 Skill Gaps
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gaps.map((g, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#ef4444', flexShrink: 0 }}>!</span> {g}
              </li>
            ))}
            {gaps.length === 0 && (
              <li style={{ fontSize: 13, color: '#10b981' }}>🎉 No major gaps found!</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
