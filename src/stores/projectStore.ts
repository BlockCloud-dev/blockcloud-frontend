// src/stores/projectStore.ts
import { create } from "zustand";

export interface ProjectState {
  projectId: number | null;
  projectName: string;
  description: string;
  currentCSP: "AWS" | "GCP" | "Azure";
  isSaved: boolean;

  // 액션들
  setProjectName: (name: string) => void;
  setDescription: (desc: string) => void;
  setCurrentCSP: (csp: "AWS" | "GCP" | "Azure") => void;
  setIsSaved: (saved: boolean) => void;

  // 프로젝트 관리
  loadProject: (project: {
    id: number;
    name: string;
    description: string;
  }) => void;
  newProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  projectName: "MyInfraProject",
  description: "",
  currentCSP: "AWS",
  isSaved: true,

  setProjectName: (name) => set({ projectName: name, isSaved: false }),
  setDescription: (desc) => set({ description: desc, isSaved: false }),
  setCurrentCSP: (csp) => set({ currentCSP: csp, isSaved: false }),
  setIsSaved: (saved) => set({ isSaved: saved }),

  loadProject: (project) =>
    set({
      projectId: project.id,
      projectName: project.name,
      description: project.description,
      isSaved: true,
    }),

  newProject: () =>
    set({
      projectId: null,
      projectName: "MyInfraProject",
      description: "",
      currentCSP: "AWS",
      isSaved: true,
    }),
}));
