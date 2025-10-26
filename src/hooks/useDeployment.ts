import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../utils/apiClients';
import { providerManager } from '../providers';
import { useBlockStore, useStackingStore, useUIStore } from '../stores';

export const useDeployment = (projectId: string | undefined) => {
  const { droppedBlocks } = useBlockStore();
  const { deriveConnectionsFromStacking } = useStackingStore();
  const generatedCode = useUIStore((state) => state.generatedCode);

  const [loadingStatus, setLoadingStatus] = useState<null | 'validating' | 'deploying'>(null);

  // Terraform 코드 생성
  const buildTerraformCode = useCallback((): string => {
    // 사용자가 코드 에디터에서 수정한 경우 그 코드를 우선 사용
    if (generatedCode && generatedCode.trim() !== '') {
      return generatedCode;
    }

    // 수정된 코드가 없으면 블록으로부터 새로 생성
    const derivedConnections = deriveConnectionsFromStacking(droppedBlocks);

    const currentProvider = providerManager.getCurrentProvider();
    if (currentProvider) {
      const cloudBlocks = droppedBlocks.map(block => ({
        id: block.id,
        name: block.name,
        description: block.properties?.description || block.name,
        provider: currentProvider.name as any,
        type: block.type,
        category: 'network' as any,
        icon: null,
        color: 'bg-blue-500',
        size: block.size,
        properties: block.properties,
      }));
      return currentProvider.generateCode(cloudBlocks, derivedConnections);
    } else {
      console.warn('⚠️ [Deploy] No provider found');
      return `# 프로바이더가 선택되지 않았습니다.`;
    }
  }, [droppedBlocks, deriveConnectionsFromStacking, generatedCode]);

  // 프로젝트 배포
  const handleDeployProject = useCallback(async () => {
    if (!projectId) {
      toast.error('⚠️ projectId가 없습니다.');
      return;
    }

    if (droppedBlocks.length === 0) {
      toast.error('❌ 배포할 블록이 없습니다.');
      return;
    }

    try {
      setLoadingStatus('validating');

      const terraformCode = buildTerraformCode();

      const validateRes = await apiFetch(
        `/api/projects/${projectId}/terraform/validate`,
        {
          method: 'POST',
          body: JSON.stringify({ terraformCode }),
        }
      );

      // apiFetch가 이미 unwrapped data를 반환
      const isValid = validateRes?.valid;

      if (!isValid) {
        setLoadingStatus(null);
        toast.error(
          '배포 요건이 충족되지 않았습니다. \n연결 누락 등을 확인하세요.'
        );
        return;
      }

      toast.success('🛠️ Terraform 코드가 유효합니다. \n배포를 시작합니다...');
      setLoadingStatus('deploying');

      const applyRes = await apiFetch(
        `/api/projects/${projectId}/terraform/apply`,
        {
          method: 'POST',
          body: JSON.stringify({ terraformCode }),
        }
      );

      // apiFetch가 이미 unwrapped data를 반환
      const status = applyRes?.status;
      const message = applyRes?.message;

      if (status === 'SUCCESS' || status === 'PENDING') {
        toast.success(`🚀 배포 요청 완료: ${message}`);
      } else {
        toast.error(`❌ 배포 실패: ${message}`);
      }
    } catch (error: any) {
      console.error('배포 중 오류:', error);
      toast.error(`❌ 오류 발생: ${error.message}`);
    } finally {
      setLoadingStatus(null);
    }
  }, [projectId, droppedBlocks, buildTerraformCode]);

  return {
    loadingStatus,
    handleDeployProject,
  };
};
