import { useCallback } from 'react';
import { apiFetch } from '../utils/apiClients';
import { useResetAllStores } from '../stores';

export const useProjectManagement = (projectId: string | undefined, droppedBlocks: any[]) => {
  const resetAllStores = useResetAllStores();

  // 새 프로젝트
  const handleNewProject = useCallback(() => {
    resetAllStores();
    console.log('🆕 New project created');
  }, [resetAllStores]);

  // 프로젝트 저장
  const handleSaveProject = useCallback(async () => {
    if (!projectId) {
      alert('URL에서 projectId를 찾을 수 없습니다.');
      return;
    }

    if (droppedBlocks.length === 0) {
      alert('저장할 블록이 없습니다.');
      return;
    }

    try {
      await apiFetch(`/api/block/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ blocks: droppedBlocks }),
      });

      alert('✅ 프로젝트가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('❌ 저장 실패:', err);
      alert('❌ 저장 중 오류가 발생했습니다.');
    }
  }, [projectId, droppedBlocks]);

  return {
    handleNewProject,
    handleSaveProject,
  };
};
