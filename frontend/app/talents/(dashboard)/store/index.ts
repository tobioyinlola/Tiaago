import { create } from "zustand";

import {
  CaseStudyAttempt,
  Talent,
  TalentPortfolio,
  TalentPortfolioEducation,
  TalentPortfolioWorkExperience,
  TalentPortfolioProject,
  ID,
} from "@/app/common/types";

type TalentStore = {
  profile: Talent | null;
  portfolio: TalentPortfolio | null;
  attemptedProjects: CaseStudyAttempt[];
  projects: TalentPortfolioProject[];
  hasSeenAddExperienceModal: boolean;
  setHasSeenAddExperienceModal: (hasSeen: boolean) => void;
  setProfile: (profile: Talent) => void;
  setExperiences: (experiences: TalentPortfolioWorkExperience[]) => void;
  addExperience: (experience: TalentPortfolioWorkExperience) => void;
  removeExperience: (id: ID) => void;
  setEducations: (experiences: TalentPortfolioEducation[]) => void;
  addEducation: (experience: TalentPortfolioEducation) => void;
  removeEducation: (id: ID) => void;
  setPortfolio: (portfolio: TalentPortfolio) => void;
  addAttemptedProject: (attempt: CaseStudyAttempt) => void;
  setAttemptedProjects: (attempts: CaseStudyAttempt[]) => void;
  setProjects: (projects: TalentPortfolioProject[]) => void;
  addProject: (project: TalentPortfolioProject) => void;
  removeProject: (id: ID) => void;
};

export const useTalentStore = create<TalentStore>(set => ({
  profile: null,
  attemptedProjects: [],
  projects: [],
  hasSeenAddExperienceModal: false,
  portfolio: null,
  setPortfolio: portfolio => set({ portfolio }),
  setHasSeenAddExperienceModal: hasSeen =>
    set({ hasSeenAddExperienceModal: hasSeen }),
  setProfile: profile => set({ profile }),
  setExperiences: experiences =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          experience: experiences,
        },
      };
    }),
  addExperience: experience =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          experience: [
            ...(portfolio?.experience.filter(exp => exp.id !== experience.id) ||
              []),
            experience,
          ],
        },
      };
    }),
  removeExperience: id =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          experience: portfolio?.experience.filter(exp => exp.id !== id) || [],
        },
      };
    }),
  setProjects: projects => set({ projects }),
  addProject: project =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          projects: [
            ...(portfolio?.projects?.filter(proj => proj.id !== project.id) ||
              []),
            project,
          ],
        },
      };
    }),
  removeProject: id =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          projects: portfolio?.projects?.filter(proj => proj.id !== id) || [],
        },
      };
    }),
  setEducations: educations =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          education: educations,
        },
      };
    }),
  addEducation: education =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          education: [
            ...(portfolio?.education.filter(edu => edu.id !== education.id) ||
              []),
            education,
          ],
        },
      };
    }),
  removeEducation: id =>
    set(({ portfolio }) => {
      return {
        portfolio: {
          ...portfolio!,
          education: portfolio?.education.filter(edu => edu.id !== id) || [],
        },
      };
    }),
  addAttemptedProject: attempt =>
    set(state => ({
      attemptedProjects: Array.from(
        new Set([...state.attemptedProjects, attempt]).values()
      ),
    })),
  setAttemptedProjects: attempts => set({ attemptedProjects: attempts }),
}));
