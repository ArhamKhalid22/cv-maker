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
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDescription: string;
  userBackground: string;
  education?: string;
  skills?: string;
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
  // Current inputs
  fullName: string;        // NEW — used in cover letter sign-off
  jobDescription: string;
  userBackground: string;
  education: string;
  skills: string;
  achievements: string;
  jobTitle: string;
  company: string;
  jobUrl: string;

  // Generation results
  generatedCV: string;
  coverLetter: string;
  skillsAnalysis: SkillsAnalysis | null;

  // Loading states
  cvStatus: GenerationStatus;
  coverStatus: GenerationStatus;
  skillsStatus: GenerationStatus;

  // Errors
  cvError: string | null;
  coverError: string | null;
  skillsError: string | null;

  // Applications history
  applications: Application[];

  // Actions
  setFullName: (name: string) => void;
  setJobDescription: (text: string) => void;
  setUserBackground: (text: string) => void;
  setEducation: (text: string) => void;
  setSkills: (text: string) => void;
  setAchievements: (text: string) => void;
  setJobTitle: (title: string) => void;
  setCompany: (company: string) => void;
  setJobUrl: (url: string) => void;
  setGeneratedCV: (cv: string) => void;
  setCoverLetter: (cover: string) => void;
  setSkillsAnalysis: (skills: SkillsAnalysis | null) => void;
  setCvStatus: (status: GenerationStatus) => void;
  setCoverStatus: (status: GenerationStatus) => void;
  setSkillsStatus: (status: GenerationStatus) => void;
  setCvError: (error: string | null) => void;
  setCoverError: (error: string | null) => void;
  setSkillsError: (error: string | null) => void;
  saveApplication: () => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  clearCurrentGeneration: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      fullName: '',
      jobDescription: '',
      userBackground: '',
      education: '',
      skills: '',
      achievements: '',
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
      applications: [],

      setFullName:       (name)   => set({ fullName: name }),
      setJobDescription: (text)   => set({ jobDescription: text }),
      setUserBackground: (text)   => set({ userBackground: text }),
      setEducation:      (text)   => set({ education: text }),
      setSkills:         (text)   => set({ skills: text }),
      setAchievements:   (text)   => set({ achievements: text }),
      setJobTitle:       (title)  => set({ jobTitle: title }),
      setCompany:        (company)=> set({ company }),
      setJobUrl:         (url)    => set({ jobUrl: url }),
      setGeneratedCV:    (cv)     => set({ generatedCV: cv }),
      setCoverLetter:    (cover)  => set({ coverLetter: cover }),
      setSkillsAnalysis: (skills) => set({ skillsAnalysis: skills }),
      setCvStatus:       (status) => set({ cvStatus: status }),
      setCoverStatus:    (status) => set({ coverStatus: status }),
      setSkillsStatus:   (status) => set({ skillsStatus: status }),
      setCvError:        (error)  => set({ cvError: error }),
      setCoverError:     (error)  => set({ coverError: error }),
      setSkillsError:    (error)  => set({ skillsError: error }),

      saveApplication: () => {
        const s = get();
        const now = new Date().toISOString();
        const application: Application = {
          id:             crypto.randomUUID(),
          fullName:       s.fullName,
          jobTitle:       s.jobTitle       || 'Untitled Position',
          company:        s.company        || 'Unknown Company',
          jobUrl:         s.jobUrl,
          jobDescription: s.jobDescription,
          userBackground: s.userBackground,
          education:      s.education,
          skills:         s.skills,
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
          userBackground: '',
          education: '',
          skills: '',
          achievements: '',
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
      partialize: (state) => ({ applications: state.applications }),
    }
  )
);
