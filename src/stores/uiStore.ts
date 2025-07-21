import { create } from 'zustand';

type TabType = 'connections' | 'code' | 'properties';

interface UIState {
  // UI 상태
  activeTab: TabType;
  generatedCode: string;

  // 연결 생성 모드
  isConnectionMode: boolean;
  selectedFromBlockId: string | null;

  // 액션들
  setActiveTab: (tab: TabType) => void;
  setGeneratedCode: (code: string) => void;
  setConnectionMode: (enabled: boolean) => void;
  setSelectedFromBlockId: (blockId: string | null) => void;
  resetConnectionMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태
  activeTab: 'code',
  generatedCode: '',
  isConnectionMode: false,
  selectedFromBlockId: null,

  // 액션들
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setConnectionMode: (enabled) => set({ isConnectionMode: enabled }),
  setSelectedFromBlockId: (blockId) => set({ selectedFromBlockId: blockId }),
  resetConnectionMode: () => set({
    isConnectionMode: false,
    selectedFromBlockId: null
  }),
}));
