'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

// ── Shared textarea style ────────────────────────────────────────────────────
const TA: React.CSSProperties = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: 14,
  color: 'var(--text-primary)',
  fontSize: 14,
  width: '100%',
  resize: 'vertical',
  outline: 'none',
  lineHeight: 1.65,
  fontFamily: 'inherit',
};

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
      {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );
}

function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{sub}</p>
    </div>
  );
}

export default function ProfilePage() {
  const store = useAppStore();
  const [isParsing, setIsParsing] = useState(false);

  const handleParseResume = async (text: string) => {
    if (!text.trim() || text.length < 50) {
      toast.error('Resume text too short to parse.');
      return;
    }
    setIsParsing(true);
    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parsing failed');

      if (data.fullName) store.setFullName(data.fullName);
      if (data.email) store.setEmail(data.email);
      if (data.phone) store.setPhone(data.phone);
      if (data.city) store.setCity(data.city);
      if (data.linkedin) store.setLinkedin(data.linkedin);
      if (data.education) store.setEducation(data.education);
      if (data.hardSkills) store.setHardSkills(data.hardSkills);
      if (data.softSkills) store.setSoftSkills(data.softSkills);
      if (data.achievements) store.setAchievements(data.achievements);
      if (data.userBackground) store.setUserBackground(data.userBackground);

      toast.success('✨ Profile auto-filled from resume!');
    } catch (e) {
      toast.error('Failed to parse resume. Please fill manually.');
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 60 }}>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Your Profile</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
          Fill this out once. It will be used to generate all your future applications.
        </p>

        {/* Smart Auto-fill */}
        <div style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Smart Auto-fill (beta)</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Paste your current resume or a link to save time. AI will extract your details below.
          </p>
          <textarea
            className="input"
            style={{ minHeight: 80, marginBottom: 12, fontSize: 13 }}
            placeholder="Paste your raw resume text here..."
            id="resume-paste"
          />
          <button
            className="btn btn-secondary btn-sm"
            disabled={isParsing}
            onClick={() => {
              const el = document.getElementById('resume-paste') as HTMLTextAreaElement;
              handleParseResume(el.value);
            }}
          >
            {isParsing ? '⏳ Extracting...' : '✨ Extract AI Details'}
          </button>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* Identity */}
          <section>
            <SectionTitle icon="👤" title="Identity" sub="Basic contact info for CV and cover letter headers." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label text="Full Name" required />
                <input className="input" placeholder="e.g. Arham Khalid" value={store.fullName} onChange={e => store.setFullName(e.target.value)} />
              </div>
              <div>
                <Label text="Email" />
                <input type="email" className="input" placeholder="e.g. hi@example.com" value={store.email} onChange={e => store.setEmail(e.target.value)} />
              </div>
              <div>
                <Label text="Phone" />
                <input type="tel" className="input" placeholder="e.g. +44 0000 000000" value={store.phone} onChange={e => store.setPhone(e.target.value)} />
              </div>
              <div>
                <Label text="City, Country" />
                <input className="input" placeholder="e.g. Vilnius, Lithuania" value={store.city} onChange={e => store.setCity(e.target.value)} />
              </div>
              <div>
                <Label text="LinkedIn URL" />
                <input className="input" placeholder="e.g. linkedin.com/in/..." value={store.linkedin} onChange={e => store.setLinkedin(e.target.value)} />
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Work Experience */}
          <section>
            <SectionTitle icon="💼" title="Work Experience" sub="List your professional history. Use bullet points." />
            <textarea
              style={{ ...TA, minHeight: 200 }}
              placeholder={`Company Name — Role (Year - Present)
• Achieved X by doing Y
• Led team to success`}
              value={store.userBackground}
              onChange={e => store.setUserBackground(e.target.value)}
            />
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Education */}
          <section>
            <SectionTitle icon="🎓" title="Education" sub="Your academic background." />
            <textarea
              style={{ ...TA, minHeight: 100 }}
              placeholder={`University Name
BSc Computer Science, 2021-2025`}
              value={store.education}
              onChange={e => store.setEducation(e.target.value)}
            />
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Skills */}
          <section>
            <SectionTitle icon="⚡" title="Skills" sub="List tools, languages, and soft skills." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Label text="Hard/Technical Skills" />
                <textarea style={{ ...TA, minHeight: 80 }} placeholder="Python, Next.js, SQL..." value={store.hardSkills} onChange={e => store.setHardSkills(e.target.value)} />
              </div>
              <div>
                <Label text="Soft Skills" />
                <textarea style={{ ...TA, minHeight: 80 }} placeholder="Leadership, Communication..." value={store.softSkills} onChange={e => store.setSoftSkills(e.target.value)} />
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Achievements */}
          <section>
            <SectionTitle icon="🏆" title="Key Achievements" sub="Standout wins with numbers and metrics." />
            <textarea
              style={{ ...TA, minHeight: 120 }}
              placeholder={`• Reduced customer wait time by 20%
• Promoted within 6 months`}
              value={store.achievements}
              onChange={e => store.setAchievements(e.target.value)}
            />
          </section>

        </div>

        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/generate'}>
            💾 Save & Go to Generate
          </button>
        </div>
      </div>
    </div>
  );
}
