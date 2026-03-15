// lib/store.ts — Zustand global state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SkillItem {
  skill: string;
  relevance: 'high' | 'medium' | 'low';
  inResume: boolean;
  tip: string;
}

export interface SkillsAnalysis {
  matchScore: number;
  topSkills: SkillItem[];
  gaps: string[];
  strengths: string[];
  summary: string;
}

export interface Application {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  linkedin?: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDescription: string;
  userBackground: string;
  education?: string;
  hardSkills?: string;
  softSkills?: string;
  achievements?: string;
  generatedCV?: string;
  coverLetter?: string;
  skillsAnalysis?: SkillsAnalysis;
  matchScore?: number;
  status: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer';
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // ── Personal Identity ──
  fullName: string;
  email: string;
  phone: string;
  city: string;
  linkedin: string;

  // ── Job Info ──
  jobDescription: string;
  jobTitle: string;
  company: string;
  jobUrl: string;

  // ── Profile ──
  userBackground: string;
  education: string;
  hardSkills: string;
  softSkills: string;
  achievements: string;

  // ── Generation Results ──
  generatedCV: string;
  coverLetter: string;
  skillsAnalysis: SkillsAnalysis | null;

  // ── Statuses ──
  cvStatus: GenerationStatus;
  coverStatus: GenerationStatus;
  skillsStatus: GenerationStatus;
  cvError: string | null;
  coverError: string | null;
  skillsError: string | null;

  // ── History ──
  applications: Application[];

  // ── Actions ──
  setFullName:       (v: string) => void;
  setEmail:          (v: string) => void;
  setPhone:          (v: string) => void;
  setCity:           (v: string) => void;
  setLinkedin:       (v: string) => void;
  setJobDescription: (v: string) => void;
  setJobTitle:       (v: string) => void;
  setCompany:        (v: string) => void;
  setJobUrl:         (v: string) => void;
  setUserBackground: (v: string) => void;
  setEducation:      (v: string) => void;
  setHardSkills:     (v: string) => void;
  setSoftSkills:     (v: string) => void;
  setSkills:         (v: string) => void;  // alias → sets hardSkills
  setAchievements:   (v: string) => void;
  setGeneratedCV:    (v: string) => void;
  setCoverLetter:    (v: string) => void;
  setSkillsAnalysis: (v: SkillsAnalysis | null) => void;
  setCvStatus:       (v: GenerationStatus) => void;
  setCoverStatus:    (v: GenerationStatus) => void;
  setSkillsStatus:   (v: GenerationStatus) => void;
  setCvError:        (v: string | null) => void;
  setCoverError:     (v: string | null) => void;
  setSkillsError:    (v: string | null) => void;
  saveApplication:   () => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  clearCurrentGeneration: () => void;

  // Convenience getter for skills (hard+soft combined)
  readonly skills: string;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      fullName: '',
      email: '',
      phone: '',
      city: '',
      linkedin: '',
      jobDescription: '',
      jobTitle: '',
      company: '',
      jobUrl: '',
      userBackground: '',
      education: '',
      hardSkills: '',
      softSkills: '',
      achievements: '',
      generatedCV: '',
      coverLetter: '',
      skillsAnalysis: null,
      cvStatus: 'idle',
      coverStatus: 'idle',
      skillsStatus: 'idle',
      cvError: null,
      coverError: null,
      skillsError: null,
      applications: [],

      get skills() {
        const s = get();
        const parts = [s.hardSkills, s.softSkills].filter(Boolean);
        return parts.join(', ');
      },

      setFullName:       (v) => set({ fullName: v }),
      setEmail:          (v) => set({ email: v }),
      setPhone:          (v) => set({ phone: v }),
      setCity:           (v) => set({ city: v }),
      setLinkedin:       (v) => set({ linkedin: v }),
      setJobDescription: (v) => set({ jobDescription: v }),
      setJobTitle:       (v) => set({ jobTitle: v }),
      setCompany:        (v) => set({ company: v }),
      setJobUrl:         (v) => set({ jobUrl: v }),
      setUserBackground: (v) => set({ userBackground: v }),
      setEducation:      (v) => set({ education: v }),
      setHardSkills:     (v) => set({ hardSkills: v }),
      setSoftSkills:     (v) => set({ softSkills: v }),
      setSkills:         (v) => set({ hardSkills: v }),
      setAchievements:   (v) => set({ achievements: v }),
      setGeneratedCV:    (v) => set({ generatedCV: v }),
      setCoverLetter:    (v) => set({ coverLetter: v }),
      setSkillsAnalysis: (v) => set({ skillsAnalysis: v }),
      setCvStatus:       (v) => set({ cvStatus: v }),
      setCoverStatus:    (v) => set({ coverStatus: v }),
      setSkillsStatus:   (v) => set({ skillsStatus: v }),
      setCvError:        (v) => set({ cvError: v }),
      setCoverError:     (v) => set({ coverError: v }),
      setSkillsError:    (v) => set({ skillsError: v }),

      saveApplication: () => {
        const s = get();
        const now = new Date().toISOString();
        const application: Application = {
          id:             crypto.randomUUID(),
          fullName:       s.fullName,
          email:          s.email,
          phone:          s.phone,
          city:           s.city,
          linkedin:       s.linkedin,
          jobTitle:       s.jobTitle       || 'Untitled Position',
          company:        s.company        || 'Unknown Company',
          jobUrl:         s.jobUrl,
          jobDescription: s.jobDescription,
          userBackground: s.userBackground,
          education:      s.education,
          hardSkills:     s.hardSkills,
          softSkills:     s.softSkills,
          achievements:   s.achievements,
          generatedCV:    s.generatedCV,
          coverLetter:    s.coverLetter,
          skillsAnalysis: s.skillsAnalysis || undefined,
          matchScore:     s.skillsAnalysis?.matchScore,
          status:         'draft',
          createdAt:      now,
          updatedAt:      now,
        };
        set((prev) => ({ applications: [application, ...prev.applications] }));
      },

      updateApplication: (id, updates) => {
        set((s) => ({
          applications: s.applications.map((app) =>
            app.id === id ? { ...app, ...updates, updatedAt: new Date().toISOString() } : app
          ),
        }));
      },

      deleteApplication: (id) => {
        set((s) => ({ applications: s.applications.filter((app) => app.id !== id) }));
      },

      clearCurrentGeneration: () => {
        set({
          jobDescription: '',
          jobTitle: '',
          company: '',
          jobUrl: '',
          generatedCV: '',
          coverLetter: '',
          skillsAnalysis: null,
          cvStatus: 'idle',
          coverStatus: 'idle',
          skillsStatus: 'idle',
          cvError: null,
          coverError: null,
          skillsError: null,
        });
      },
    }),
    {
      name: 'jobai-pro-storage',
      partialize: (state) => ({
        // ── Persist profile fields (user fills once, stays forever) ──
        applications:   state.applications,
        fullName:       state.fullName,
        email:          state.email,
        phone:          state.phone,
        city:           state.city,
        linkedin:       state.linkedin,
        userBackground: state.userBackground,
        education:      state.education,
        hardSkills:     state.hardSkills,
        softSkills:     state.softSkills,
        achievements:   state.achievements,
        // NOTE: jobDescription, jobTitle, company, jobUrl, and
        // generated content are intentionally NOT persisted so each
        // new job application starts fresh.
      }),
    }
  )
);
