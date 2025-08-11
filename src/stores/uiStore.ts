import { create } from 'zustand';

type TabType = 'connections' | 'code' | 'properties';

interface UIState {
  // UI 상태
  activeTab: TabType;
  generatedCode: string;

  // 액션들
  setActiveTab: (tab: TabType) => void;
  setGeneratedCode: (code: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태
  activeTab: 'code',
  generatedCode: '',

  // 액션들
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
}));
