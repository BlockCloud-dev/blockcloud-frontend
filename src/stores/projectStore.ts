// src/stores/projectStore.ts
import { create } from "zustand";
import { providerManager, CloudProviderType } from "../providers";

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
    provider?: CloudProviderType;
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
  setCurrentCSP: (csp) => {
    console.log(`🔄 [ProjectStore] Switching CSP to: ${csp}`);

    // 프로바이더 매니저와 동기화
    let providerType: CloudProviderType;
    switch (csp) {
      case "AWS":
        providerType = CloudProviderType.AWS;
        break;
      case "GCP":
        providerType = CloudProviderType.GCP;
        break;
      case "Azure":
        providerType = CloudProviderType.AZURE;
        break;
      default:
        providerType = CloudProviderType.AWS;
    }

    const success = providerManager.setCurrentProvider(providerType);
    if (success) {
      console.log(`✅ [ProjectStore] Provider switched to: ${csp}`);
      set({ currentCSP: csp, isSaved: false });
    } else {
      console.error(`❌ [ProjectStore] Failed to switch provider to: ${csp}`);
    }
  },
  setIsSaved: (saved) => set({ isSaved: saved }),

  loadProject: (project) => {
    // 프로바이더 정보가 있으면 해당 프로바이더로 설정
    if (project.provider) {
      // 프로바이더 매니저와 동기화
      let csp: "AWS" | "GCP" | "Azure" = "AWS";
      if (project.provider === CloudProviderType.AWS) {
        csp = "AWS";
      } else if (project.provider === CloudProviderType.GCP) {
        csp = "GCP";
      } else if (project.provider === CloudProviderType.AZURE) {
        csp = "Azure";
      }

      providerManager.setCurrentProvider(project.provider);

      set({
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        currentCSP: csp,
        isSaved: true,
      });
    } else {
      // 프로바이더 정보가 없으면 기본값 (AWS) 사용
      set({
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        isSaved: true,
      });
    }
  },

  newProject: () =>
    set({
      projectId: null,
      projectName: "MyInfraProject",
      description: "",
      currentCSP: "AWS",
      isSaved: true,
    }),
}));
