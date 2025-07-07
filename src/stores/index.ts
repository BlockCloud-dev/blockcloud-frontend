// Zustand 스토어들을 통합하여 내보내는 인덱스 파일
export { useBlockStore } from './blockStore';
export { useConnectionStore } from './connectionStore';
export { useUIStore } from './uiStore';
export { useProjectStore } from './projectStore';

// 스토어들을 함께 사용하는 헬퍼 훅들
import { useBlockStore } from './blockStore';
import { useConnectionStore } from './connectionStore';
import { useUIStore } from './uiStore';
import { useProjectStore } from './projectStore';

// 모든 상태를 초기화하는 헬퍼
export const useResetAllStores = () => {
  const clearBlocks = useBlockStore((state) => state.clearAll);
  const clearConnections = useConnectionStore((state) => state.clearConnections);
  const newProject = useProjectStore((state) => state.newProject);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const setGeneratedCode = useUIStore((state) => state.setGeneratedCode);

  return () => {
    clearBlocks();
    clearConnections();
    newProject();
    setActiveTab('code');
    setGeneratedCode('');
  };
};

// 프로젝트 데이터 로드를 위한 헬퍼
export const useLoadProject = () => {
  const setDroppedBlocks = useBlockStore((state) => state.setDroppedBlocks);
  const setConnections = useConnectionStore((state) => state.setConnections);
  const loadProject = useProjectStore((state) => state.loadProject);

  return (projectData: any) => {
    setDroppedBlocks(projectData.blocks || []);
    setConnections(projectData.connections || []);
    loadProject(projectData);
  };
};
