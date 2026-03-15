'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useJobAI } from '@/hooks/useJobAI';
import JobInputPanel from '@/components/JobInputPanel';
import GenerationTabs from '@/components/GenerationTabs';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 'job',         icon: '🎯', label: 'Job'         },
  { id: 'identity',   icon: '👤', label: 'You'          },
  { id: 'experience', icon: '💼', label: 'Experience'   },
  { id: 'education',  icon: '🎓', label: 'Education'    },
  { id: 'skills',     icon: '⚡', label: 'Skills'       },
  { id: 'achievements',icon: '🏆',label: 'Achievements' },
  { id: 'generate',   icon: '✨', label: 'Generate'     },
];

const TOTAL = STEPS.length;

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

// ── Field label helper ───────────────────────────────────────────────────────
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
      {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );
}

function Hint({ text }: { text: string }) {
  return <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>{text}</p>;
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / TOTAL) * 100);
  return (
    <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Step pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const done    = i < step;
          const active  = i === step;
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 99,
              background: active ? 'var(--gradient-primary)' : done ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'transparent' : done ? 'rgba(99,102,241,0.4)' : 'var(--border-subtle)'}`,
              fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? '#fff' : done ? '#a5b4fc' : 'var(--text-muted)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <span>{done ? '✓' : s.icon}</span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
      {/* Bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginBottom: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── Nav buttons ──────────────────────────────────────────────────────────────
function NavButtons({ step, onBack, onNext, nextLabel, loading }: {
  step: number; onBack: () => void; onNext: () => void; nextLabel?: string; loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
      <button className="btn btn-ghost" onClick={onBack} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>
        ← Back
      </button>
      <button className="btn btn-primary" onClick={onNext} disabled={loading} style={{ minWidth: 140 }}>
        {loading
          ? <><span className="animate-spin">⚙</span> Generating…</>
          : nextLabel || 'Next →'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function GeneratePage() {
  const store = useAppStore();
  const { generateAll, cvStatus, coverStatus, skillsStatus } = useJobAI();
  const [step, setStep] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);

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

      // Update store fields
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

  const isAnyLoading = cvStatus === 'loading' || coverStatus === 'loading' || skillsStatus === 'loading';
  const hasOutput    = store.generatedCV || store.coverLetter || store.skillsAnalysis;

  // Is the user's profile already filled from a previous session?
  const profileComplete = !!(store.fullName?.trim() && store.userBackground?.trim());

  const goBack = () => setStep(s => Math.max(0, s - 1));
  const goNext = () => setStep(s => Math.min(TOTAL - 1, s + 1));
  // Jump directly to the generate step
  const skipToGenerate = () => setStep(TOTAL - 1);

  const validate = (requiredMsg: string, condition: boolean) => {
    if (!condition) { toast.error(requiredMsg); return false; }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate('Please enter a job description first.', !!store.jobDescription.trim())) return;
    if (!validate('Please enter your work experience.', !!store.userBackground.trim())) return;
    await generateAll();
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
  };

  const handleSave = () => { store.saveApplication(); toast.success('✅ Saved to dashboard!'); };

  // ── Step content ────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── 0: Job Description ──
      case 0:
        return (
          <div>
            <StepTitle icon="🎯" title="What job are you applying for?" sub="Paste the full job description, or provide a URL/screenshot." />

            {/* Returning-user shortcut */}
            {profileComplete && (
              <div style={{
                padding: '14px 18px', marginBottom: 18,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#10b981', marginBottom: 2 }}>
                    ✅ Profile saved — welcome back, {store.fullName}!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Your details are remembered. Just paste the new job and generate.
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', whiteSpace: 'nowrap' }}
                  onClick={skipToGenerate}
                >
                  ⚡ Skip to Generate
                </button>
              </div>
            )}

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
            <NavButtons step={step} onBack={goBack}
              onNext={() => { if (!validate('Please add a job description first.', !!store.jobDescription.trim())) return; goNext(); }}
              nextLabel={profileComplete ? 'Review Profile →' : 'Next → Your Details'}
            />
          </div>
        );


      // ── 1: Identity ──
      case 1:
        return (
          <div>
            <StepTitle icon="👤" title="Tell us about yourself" sub="This information appears in the header of your CV and the cover letter sign-off." />
            
            {/* Quick Fill Option */}
            <div style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>Smart Auto-fill (beta)</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Paste your current resume or a link to save time. AI will extract your details into the next 5 steps.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea 
                  className="input" 
                  placeholder="Paste resume text or LinkedIn summary here..." 
                  style={{ height: 42, minHeight: 42, fontSize: 12, flex: 1 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleParseResume((e.target as HTMLTextAreaElement).value);
                    }
                  }}
                />
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ height: 42 }}
                  disabled={isParsing}
                  onClick={(e) => {
                    const ta = (e.currentTarget.previousElementSibling as HTMLTextAreaElement);
                    handleParseResume(ta.value);
                  }}
                >
                  {isParsing ? '⌛' : 'Fill'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label text="Full Name" required />
                <input className="input" placeholder="e.g. John Smith" value={store.fullName} onChange={e => store.setFullName(e.target.value)} style={{ fontWeight: 500 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label text="Professional Email" />
                  <input className="input" type="email" placeholder="john.smith@email.com" value={store.email} onChange={e => store.setEmail(e.target.value)} />
                </div>
                <div>
                  <Label text="Phone Number" />
                  <input className="input" placeholder="+44 7700 000000" value={store.phone} onChange={e => store.setPhone(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label text="City & Country" />
                  <input className="input" placeholder="London, UK" value={store.city} onChange={e => store.setCity(e.target.value)} />
                  <Hint text="City and country only — no full home address needed." />
                </div>
                <div>
                  <Label text="LinkedIn Profile URL" />
                  <input className="input" placeholder="linkedin.com/in/johnsmith" value={store.linkedin} onChange={e => store.setLinkedin(e.target.value)} />
                </div>
              </div>
            </div>
            <NavButtons step={step} onBack={goBack}
              onNext={() => { if (!validate('Please enter your full name.', !!store.fullName.trim())) return; goNext(); }}
              nextLabel="Next → Work Experience"
            />
          </div>
        );

      // ── 2: Work Experience ──
      case 2:
        return (
          <div>
            <StepTitle icon="💼" title="Work Experience" sub="List your roles in reverse chronological order (newest first). Focus on results, not tasks." />
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              💡 <strong>STAR tip:</strong> For each role write: <em>Company · Title · Dates</em>, then bullet points with <strong>Action Verb + What + Measurable Result</strong>.<br/>
              Example: <em>"Led migration of monolith to microservices, cutting deploy time from 45 min to 8 min."</em>
            </div>
            <Label text="Work Experience / Current CV" required />
            <textarea
              style={{ ...TA, minHeight: 200 }}
              placeholder={`American Eagle · Sales Associate · Jul 2019–Present
• Collaborated with store merchandiser to design displays that boosted footfall by 12%
• Scanned 100% of inventory weekly, reducing stock discrepancies by 30%

Planet Beach · Spa Consultant · Aug 2018–Present
• Exceeded monthly membership targets by 15% through consultative selling
• Handled opening/closing cash procedures for daily takings of £2,000+`}
              value={store.userBackground}
              onChange={e => store.setUserBackground(e.target.value)}
            />
            <Hint text="Include company name, job title, and dates for each role. Use bullet points." />
            <NavButtons step={step} onBack={goBack}
              onNext={() => { if (!validate('Please add at least some work experience.', !!store.userBackground.trim())) return; goNext(); }}
              nextLabel="Next → Education"
            />
          </div>
        );

      // ── 3: Education ──
      case 3:
        return (
          <div>
            <StepTitle icon="🎓" title="Education" sub="List your highest qualification first. Recent graduates can put this above experience." />
            <Label text="Education" />
            <textarea
              style={{ ...TA, minHeight: 130 }}
              placeholder={`University of Minnesota, College of Design
Bachelor of Science in Graphic Design — May 2011
Cumulative GPA 3.93, Dean's List
Twin-cities Iron Range Scholarship`}
              value={store.education}
              onChange={e => store.setEducation(e.target.value)}
            />
            <Hint text="Include institution, degree, year, and any notable awards or relevant modules." />
            <NavButtons step={step} onBack={goBack} onNext={goNext} nextLabel="Next → Skills" />
          </div>
        );

      // ── 4: Skills ──
      case 4:
        return (
          <div>
            <StepTitle icon="⚡" title="Your Skills" sub="Split your skills into hard (technical) and soft (interpersonal). The AI will tailor both to the job." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Label text="Hard Skills (Technical)" />
                <textarea
                  style={{ ...TA, minHeight: 90 }}
                  placeholder="e.g. Python, React, Node.js, PostgreSQL, AWS, Docker, Figma, Excel, Photoshop..."
                  value={store.hardSkills}
                  onChange={e => store.setHardSkills(e.target.value)}
                />
                <Hint text="Software tools, programming languages, platforms, technical certifications." />
              </div>
              <div>
                <Label text="Soft Skills (Interpersonal)" />
                <textarea
                  style={{ ...TA, minHeight: 90 }}
                  placeholder="e.g. Team leadership, client communication, project management, problem-solving, mentoring..."
                  value={store.softSkills}
                  onChange={e => store.setSoftSkills(e.target.value)}
                />
                <Hint text="Leadership, communication, and any skills that don't require a specific tool." />
              </div>
            </div>
            <NavButtons step={step} onBack={goBack} onNext={goNext} nextLabel="Next → Achievements" />
          </div>
        );

      // ── 5: Achievements ──
      case 5:
        return (
          <div>
            <StepTitle icon="🏆" title="Key Achievements" sub="These are your standout wins — figures and facts that impressed employers or clients." />
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              💡 <strong>Quantify everything:</strong> Use numbers, percentages, revenue figures, or time saved. Even small wins count.<br/>
              Example: <em>"Reduced customer wait time by 20% by reorganising queue system."</em>
            </div>
            <Label text="Key Achievements" />
            <textarea
              style={{ ...TA, minHeight: 150 }}
              placeholder={`• Received Employee of the Month award twice in one year
• Led team of 5 to deliver product 3 weeks ahead of schedule
• Grew social media following from 2k to 18k in 6 months
• Reduced server downtime from 99.1% to 99.95% uptime`}
              value={store.achievements}
              onChange={e => store.setAchievements(e.target.value)}
            />
            <NavButtons step={step} onBack={goBack} onNext={goNext} nextLabel="Preview & Generate →" />
          </div>
        );

      // ── 6: Generate ──
      case 6:
        return (
          <div>
            <StepTitle icon="✨" title="Ready to generate" sub="Review your profile summary, then click Generate to create your AI-powered application kit." />

            {/* Summary review cards */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Job', value: [store.jobTitle, store.company].filter(Boolean).join(' @ ') || store.jobDescription.slice(0, 60) + '…' },
                { label: 'Name', value: [store.fullName, store.city].filter(Boolean).join(' · ') || '—' },
                { label: 'Contact', value: [store.email, store.phone].filter(Boolean).join(' · ') || '—' },
                { label: 'Experience', value: store.userBackground ? store.userBackground.slice(0, 80) + '…' : '—' },
                { label: 'Education', value: store.education || '—' },
                { label: 'Hard Skills', value: store.hardSkills || '—' },
                { label: 'Soft Skills', value: store.softSkills || '—' },
                { label: 'Achievements', value: store.achievements ? store.achievements.slice(0, 80) + '…' : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 90, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: value === '—' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* ATS note */}
            <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              🤖 <strong>AI Undetectability:</strong> The generator uses STAR-method prompts, bans cliché AI words, enforces quantified results, and varies sentence structure — so the output reads like a skilled human wrote it.
              &nbsp;Each regeneration produces a completely different paraphrase.
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={isAnyLoading} style={{ width: '100%' }}>
              {isAnyLoading
                ? <><span className="animate-spin" style={{ fontSize: 16 }}>⚙</span> Generating your application kit…</>
                : <><span>✨</span> Generate CV + Cover Letter + Skills Analysis</>}
            </button>
            <p style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              ATS-optimised · Roboto A4 PDF · Undetectable from AI · ~15 seconds
            </p>

            {hasOutput && (
              <div ref={outputRef} style={{ marginTop: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Application Kit</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI-generated, tailored, ATS-ready</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleSave}>💾 Save to Dashboard</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>✏️ Edit Inputs</button>
                  </div>
                </div>
                <GenerationTabs />
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <NavButtons step={step} onBack={goBack} onNext={() => {}} nextLabel="" />
            </div>
          </div>
        );

      default: return null;
    }
  };

  // ── Page render ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)', borderBottom: '1px solid var(--border-subtle)', padding: '36px 0 28px' }}>
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, padding: '5px 14px', marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>GPT-4o Mini · Firecrawl · ATS Safe</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
            Generate Your <span className="gradient-text">Perfect Application</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>
            Answer 6 quick questions and get a fully tailored, ATS-ready CV and cover letter.
          </p>
        </div>
      </div>

      {/* Step card */}
      <div className="container-sm" style={{ padding: '32px 24px' }}>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <ProgressBar step={step} />
          <div style={{ padding: 28 }}>
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 5 }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{sub}</p>
    </div>
  );
}
