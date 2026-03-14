// hooks/useJobAI.ts
// Core AI generation hook with bulletproof regeneration

'use client';

import { useCallback } from 'react';
import { useAppStore, type SkillsAnalysis } from '@/lib/store';
import toast from 'react-hot-toast';

export function useJobAI() {
  const store = useAppStore();

  const generate = useCallback(
    async (type: 'cv' | 'cover' | 'skills', forceNewSeed?: boolean) => {
      const { jobDescription, userBackground } = store;

      if (!jobDescription.trim()) {
        toast.error('Please enter a job description first');
        return;
      }
      if (!userBackground.trim()) {
        toast.error('Please enter your background / current CV');
        return;
      }

      // Set loading state
      if (type === 'cv') {
        store.setCvStatus('loading');
        store.setCvError(null);
      } else if (type === 'cover') {
        store.setCoverStatus('loading');
        store.setCoverError(null);
      } else {
        store.setSkillsStatus('loading');
        store.setSkillsError(null);
      }

      const seed = forceNewSeed
        ? `${Date.now()}-${Math.random()}-${Math.random()}`
        : undefined;

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription,
            userBackground,
            type,
            regenerateSeed: seed,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (type === 'cv') {
          store.setGeneratedCV(data.content);
          store.setCvStatus('success');
          toast.success('CV content generated!');
        } else if (type === 'cover') {
          store.setCoverLetter(data.content);
          store.setCoverStatus('success');
          toast.success('Cover letter generated!');
        } else {
          try {
            // Parse skills JSON - OpenRouter returns JSON for skills
            const cleaned = data.content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned) as SkillsAnalysis;
            store.setSkillsAnalysis(parsed);
            store.setSkillsStatus('success');
            toast.success('Skills analysis complete!');
          } catch {
            store.setSkillsError('Failed to parse skills analysis. Please try again.');
            store.setSkillsStatus('error');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        if (type === 'cv') {
          store.setCvError(message);
          store.setCvStatus('error');
        } else if (type === 'cover') {
          store.setCoverError(message);
          store.setCoverStatus('error');
        } else {
          store.setSkillsError(message);
          store.setSkillsStatus('error');
        }
        toast.error(`Failed: ${message}`);
      }
    },
    [store]
  );

  const generateAll = useCallback(async () => {
    await generate('skills');
    await generate('cv');
    await generate('cover');
  }, [generate]);

  const regenerate = useCallback(
    (type: 'cv' | 'cover' | 'skills') => {
      // Always pass forceNewSeed=true to get a different output
      generate(type, true);
    },
    [generate]
  );

  return {
    generate,
    generateAll,
    regenerate,
    // State shortcuts
    jobDescription: store.jobDescription,
    userBackground: store.userBackground,
    generatedCV: store.generatedCV,
    coverLetter: store.coverLetter,
    skillsAnalysis: store.skillsAnalysis,
    cvStatus: store.cvStatus,
    coverStatus: store.coverStatus,
    skillsStatus: store.skillsStatus,
    cvError: store.cvError,
    coverError: store.coverError,
    skillsError: store.skillsError,
  };
}
