// lib/store.ts
// Zustand global state management

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
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDescription: string;
  userBackground: string;
  generatedCV?: string;
  coverLetter?: string;
  skillsAnalysis?: SkillsAnalysis;
  matchScore?: number;
  status: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer';
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // Current generation
  jobDescription: string;
  userBackground: string;
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
  setJobDescription: (text: string) => void;
  setUserBackground: (text: string) => void;
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
      jobDescription: '',
      userBackground: '',
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

      setJobDescription: (text) => set({ jobDescription: text }),
      setUserBackground: (text) => set({ userBackground: text }),
      setJobTitle: (title) => set({ jobTitle: title }),
      setCompany: (company) => set({ company }),
      setJobUrl: (url) => set({ jobUrl: url }),
      setGeneratedCV: (cv) => set({ generatedCV: cv }),
      setCoverLetter: (cover) => set({ coverLetter: cover }),
      setSkillsAnalysis: (skills) => set({ skillsAnalysis: skills }),
      setCvStatus: (status) => set({ cvStatus: status }),
      setCoverStatus: (status) => set({ coverStatus: status }),
      setSkillsStatus: (status) => set({ skillsStatus: status }),
      setCvError: (error) => set({ cvError: error }),
      setCoverError: (error) => set({ coverError: error }),
      setSkillsError: (error) => set({ skillsError: error }),

      saveApplication: () => {
        const state = get();
        const now = new Date().toISOString();
        const application: Application = {
          id: crypto.randomUUID(),
          jobTitle: state.jobTitle || 'Untitled Position',
          company: state.company || 'Unknown Company',
          jobUrl: state.jobUrl,
          jobDescription: state.jobDescription,
          userBackground: state.userBackground,
          generatedCV: state.generatedCV,
          coverLetter: state.coverLetter,
          skillsAnalysis: state.skillsAnalysis || undefined,
          matchScore: state.skillsAnalysis?.matchScore,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ applications: [application, ...s.applications] }));
        return application.id;
      },

      updateApplication: (id, updates) => {
        set((s) => ({
          applications: s.applications.map((app) =>
            app.id === id ? { ...app, ...updates, updatedAt: new Date().toISOString() } : app
          ),
        }));
      },

      deleteApplication: (id) => {
        set((s) => ({
          applications: s.applications.filter((app) => app.id !== id),
        }));
      },

      clearCurrentGeneration: () => {
        set({
          jobDescription: '',
          userBackground: '',
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
