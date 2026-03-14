'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore, type Application } from '@/lib/store';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft:     '#94a3b8',
  applied:   '#6366f1',
  interview: '#f59e0b',
  rejected:  '#ef4444',
  offer:     '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  applied:   'Applied',
  interview: 'Interview',
  rejected:  'Rejected',
  offer:     '🎉 Offer',
};

export default function DashboardPage() {
  const store = useAppStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'company'>('date');
  const [expanding, setExpanding] = useState<string | null>(null);

  const apps = store.applications
    .filter((app) => {
      const matchSearch =
        app.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
        app.company.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || app.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'score') return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      return 0;
    });

  const stats = {
    total: store.applications.length,
    applied: store.applications.filter((a) => a.status === 'applied').length,
    interview: store.applications.filter((a) => a.status === 'interview').length,
    offer: store.applications.filter((a) => a.status === 'offer').length,
    avgScore: store.applications.length
      ? Math.round(store.applications.reduce((s, a) => s + (a.matchScore || 0), 0) / store.applications.length)
      : 0,
  };

  const handleStatusChange = (id: string, status: Application['status']) => {
    store.updateApplication(id, { status });
    toast.success(`Status updated to ${STATUS_LABELS[status]}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this application?')) {
      store.deleteApplication(id);
      toast.success('Application deleted');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '36px 0 32px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
                📊 Application <span className="gradient-text">Dashboard</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Track all your job applications in one place
              </p>
            </div>
            <Link href="/generate" className="btn btn-primary">
              ✨ New Application
            </Link>
          </div>

          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16,
            marginTop: 28,
          }}>
            {[
              { label: 'Total', value: stats.total, icon: '📁', color: '#6366f1' },
              { label: 'Applied', value: stats.applied, icon: '📤', color: '#6366f1' },
              { label: 'Interviews', value: stats.interview, icon: '🎙', color: '#f59e0b' },
              { label: 'Offers', value: stats.offer, icon: '🎉', color: '#10b981' },
              { label: 'Avg Match', value: `${stats.avgScore}%`, icon: '🎯', color: '#06b6d4' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{stat.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ maxWidth: 280, flex: 1 }}
            placeholder="🔍 Search by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: 180, flex: 1, cursor: 'pointer' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 180, flex: 1, cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date">Sort: Newest</option>
            <option value="score">Sort: Match Score</option>
            <option value="company">Sort: Company</option>
          </select>
        </div>

        {/* Applications List */}
        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {store.applications.length === 0 ? 'No applications yet' : 'No results found'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14 }}>
              {store.applications.length === 0
                ? 'Generate your first tailored application kit to get started'
                : 'Try adjusting your search or filter'}
            </p>
            {store.applications.length === 0 && (
              <Link href="/generate" className="btn btn-primary btn-lg">
                ✨ Create First Application
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                expanded={expanding === app.id}
                onExpand={() => setExpanding(expanding === app.id ? null : app.id)}
                onStatusChange={(status) => handleStatusChange(app.id, status)}
                onDelete={() => handleDelete(app.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  expanded,
  onExpand,
  onStatusChange,
  onDelete,
}: {
  app: Application;
  expanded: boolean;
  onExpand: () => void;
  onStatusChange: (s: Application['status']) => void;
  onDelete: () => void;
}) {
  const [copying, setCopying] = useState<string | null>(null);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopying(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopying(null), 2000);
  };

  const scoreColor =
    (app.matchScore || 0) >= 75 ? '#10b981' :
    (app.matchScore || 0) >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="glass-card" style={{ overflow: 'hidden', transition: 'all 0.3s ease' }}>
      {/* Card Header */}
      <div
        style={{
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer',
        }}
        onClick={onExpand}
      >
        {/* Score Ring */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${scoreColor} ${(app.matchScore || 0) * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: scoreColor,
          }}>
            {app.matchScore || '?'}%
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }} className="truncate">{app.jobTitle}</span>
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 99, fontWeight: 600,
              background: `${STATUS_COLORS[app.status]}20`,
              color: STATUS_COLORS[app.status],
              border: `1px solid ${STATUS_COLORS[app.status]}40`,
            }}>
              {STATUS_LABELS[app.status]}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>🏢 {app.company}</span>
            <span>📅 {new Date(app.createdAt).toLocaleDateString()}</span>
            {app.jobUrl && <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-3)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>🔗 Job Link</a>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <select
            className="input"
            style={{ width: 130, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}
            value={app.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStatusChange(e.target.value as Application['status'])}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            className="btn btn-danger btn-sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ padding: '6px 10px' }}
          >
            🗑
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 24 }} className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {app.generatedCV && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>📄 CV Content</span>
                  <button
                    className={`btn btn-secondary btn-sm copy-btn ${copying === 'CV' ? 'copied' : ''}`}
                    onClick={() => copy(app.generatedCV!, 'CV')}
                  >
                    {copying === 'CV' ? '✓' : '📋'} Copy
                  </button>
                </div>
                <pre style={{
                  whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7,
                  color: 'var(--text-secondary)', background: 'var(--bg-glass)',
                  padding: 14, borderRadius: 8, maxHeight: 200, overflowY: 'auto',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {app.generatedCV.slice(0, 500)}{app.generatedCV.length > 500 ? '…' : ''}
                </pre>
              </div>
            )}
            {app.coverLetter && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>✉️ Cover Letter</span>
                  <button
                    className={`btn btn-secondary btn-sm copy-btn ${copying === 'Cover' ? 'copied' : ''}`}
                    onClick={() => copy(app.coverLetter!, 'Cover')}
                  >
                    {copying === 'Cover' ? '✓' : '📋'} Copy
                  </button>
                </div>
                <pre style={{
                  whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7,
                  color: 'var(--text-secondary)', background: 'var(--bg-glass)',
                  padding: 14, borderRadius: 8, maxHeight: 200, overflowY: 'auto',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {app.coverLetter.slice(0, 500)}{app.coverLetter.length > 500 ? '…' : ''}
                </pre>
              </div>
            )}
          </div>

          {app.skillsAnalysis && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                📊 {app.skillsAnalysis.summary}
              </p>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/generate"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                // Pre-fill the store with this application's data
                useAppStore.setState({
                  jobDescription: app.jobDescription,
                  userBackground: app.userBackground,
                  jobTitle: app.jobTitle,
                  company: app.company,
                  jobUrl: app.jobUrl || '',
                });
              }}
            >
              ✏️ Re-generate
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
