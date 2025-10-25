import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/apiClients';
import { useBlockStore, useConnectionStore, useProjectStore } from '../stores';
import { providerManager, CloudProviderType } from '../providers';
import type { DroppedBlock } from '../types/blocks';

export const useProjectLoader = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const projectNameFromNav = location.state?.projectName;

  const setDroppedBlocks = useBlockStore((state) => state.setDroppedBlocks);
  const setConnections = useConnectionStore((state) => state.setConnections);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

  // 프로젝트 이름 설정
  useEffect(() => {
    if (projectNameFromNav) {
      setProjectName(projectNameFromNav);
    }
  }, [projectNameFromNav, setProjectName]);

  // 프로젝트 데이터 로드
  useEffect(() => {
    if (!projectId) return;

    const loadBlocksFromAPI = async () => {
      try {
        const res = await apiFetch(`/api/block/${projectId}`);

        // 응답 스키마 호환 처리: res.blocks 또는 res.data.blocks
        const blocks =
          (res?.data?.blocks as DroppedBlock[]) ??
          (res?.blocks as DroppedBlock[]) ??
          [];

        if (Array.isArray(blocks)) {
          setDroppedBlocks(blocks);
          console.log('✅ 프로젝트 블록 불러오기 성공:', blocks.length);
        } else {
          console.warn('⚠️ 불러온 블록 데이터 형식이 올바르지 않습니다.', res);
        }

        // 연결도 내려줄 경우를 대비해 옵션 처리
        const apiConnections =
          (res?.data?.connections as any[]) ??
          (res?.connections as any[]) ??
          null;
        if (Array.isArray(apiConnections)) {
          setConnections(apiConnections);
          console.log('✅ 프로젝트 연결 불러오기 성공:', apiConnections.length);
        }

        // 프로젝트의 클라우드 프로바이더 설정 불러오기
        const projectProvider = res?.data?.provider ?? res?.provider ?? 'AWS';
        console.log('🔄 [ProjectEditor] Loading project with provider:', projectProvider);

        // 프로바이더 설정 (UI 상태와 프로바이더 매니저 모두 업데이트)
        setCurrentCSP(projectProvider as 'AWS' | 'GCP' | 'Azure');

        // 프로바이더 매니저에서도 현재 프로바이더 설정
        let providerType: CloudProviderType;
        switch (projectProvider) {
          case 'GCP':
            providerType = CloudProviderType.GCP;
            break;
          case 'Azure':
            providerType = CloudProviderType.AZURE;
            break;
          default:
            providerType = CloudProviderType.AWS;
        }
        providerManager.setCurrentProvider(providerType);
      } catch (error) {
        console.error('❌ 블록 불러오기 실패:', error);
      }
    };

    loadBlocksFromAPI();
  }, [projectId, setDroppedBlocks, setConnections, setCurrentCSP]);

  return { projectId };
};
