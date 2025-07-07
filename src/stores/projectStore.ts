import { create } from 'zustand';
import type { ProjectData } from '../utils/projectManager';

interface ProjectState {
  // 프로젝트 관련 상태
  projectName: string;
  currentCSP: 'AWS' | 'GCP' | 'Azure';
  isSaved: boolean;

  // 액션들
  setProjectName: (name: string) => void;
  setCurrentCSP: (csp: 'AWS' | 'GCP' | 'Azure') => void;
  setIsSaved: (saved: boolean) => void;

  // 프로젝트 관리
  loadProject: (projectData: ProjectData) => void;
  newProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // 초기 상태
  projectName: 'MyInfraProject',
  currentCSP: 'AWS',
  isSaved: true,

  // 기본 액션들
  setProjectName: (name) => set({ projectName: name, isSaved: false }),
  setCurrentCSP: (csp) => set({ currentCSP: csp, isSaved: false }),
  setIsSaved: (saved) => set({ isSaved: saved }),

  // 프로젝트 관리
  loadProject: (projectData) => set({
    projectName: projectData.name,
    isSaved: true
  }),

  newProject: () => set({
    projectName: 'MyInfraProject',
    currentCSP: 'AWS',
    isSaved: true
  }),
}));
