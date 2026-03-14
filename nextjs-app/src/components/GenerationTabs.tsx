'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import CVOutput from './CVOutput';
import CoverLetterOutput from './CoverLetterOutput';
import SkillsOutput from './SkillsOutput';

type Tab = 'skills' | 'cv' | 'cover';

export default function GenerationTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const store = useAppStore();
  const { cvStatus, coverStatus, skillsStatus } = useJobAI();

  const tabs: { id: Tab; label: string; icon: string; status: typeof cvStatus }[] = [
    { id: 'skills', label: 'Skills Match', icon: '🎯', status: skillsStatus },
    { id: 'cv', label: 'CV Content', icon: '📄', status: cvStatus },
    { id: 'cover', label: 'Cover Letter', icon: '✉️', status: coverStatus },
  ];

  const getStatusDot = (status: typeof cvStatus) => {
    if (status === 'loading') return <span className="animate-pulse" style={{ color: '#f59e0b' }}>●</span>;
    if (status === 'success') return <span style={{ color: '#10b981' }}>●</span>;
    if (status === 'error') return <span style={{ color: '#ef4444' }}>●</span>;
    return <span style={{ color: 'var(--text-muted)' }}>○</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab Navigation */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ gap: 8 }}
          >
            {getStatusDot(tab.status)}
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'skills' && <SkillsOutput />}
        {activeTab === 'cv' && <CVOutput />}
        {activeTab === 'cover' && <CoverLetterOutput />}
      </div>
    </div>
  );
}
