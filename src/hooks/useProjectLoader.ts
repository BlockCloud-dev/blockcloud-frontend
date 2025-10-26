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
  const initialProviderFromNav = location.state?.initialProvider as 'AWS' | 'GCP' | 'Azure' | undefined;

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

  // 초기 프로바이더 설정 (프로젝트 생성 직후)
  useEffect(() => {
    if (initialProviderFromNav) {
      console.log('🆕 [ProjectLoader] Setting initial provider from navigation:', initialProviderFromNav);
      setCurrentCSP(initialProviderFromNav);

      let providerType: CloudProviderType;
      switch (initialProviderFromNav) {
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
    }
  }, [initialProviderFromNav, setCurrentCSP]);

  // 프로젝트 데이터 로드
  useEffect(() => {
    if (!projectId) return;

    const loadBlocksFromAPI = async () => {
      try {
        // apiFetch는 항상 unwrapped data를 반환
        const data = await apiFetch(`/api/block/${projectId}`);

        // 블록 데이터 추출
        const blocks = (data?.blocks as DroppedBlock[]) ?? [];

        if (Array.isArray(blocks)) {
          setDroppedBlocks(blocks);
          console.log('✅ 프로젝트 블록 불러오기 성공:', blocks.length);
        } else {
          console.warn('⚠️ 불러온 블록 데이터 형식이 올바르지 않습니다.', data);
        }

        // 연결 데이터 추출
        const apiConnections = (data?.connections as any[]) ?? null;
        if (Array.isArray(apiConnections)) {
          setConnections(apiConnections);
          console.log('✅ 프로젝트 연결 불러오기 성공:', apiConnections.length);
        }

        // 프로젝트의 클라우드 프로바이더 설정 불러오기
        const projectProvider = data?.provider;

        // 초기 프로바이더가 navigation state로 전달되었으면 그것을 우선 사용
        // (프로젝트 생성 직후에는 서버에 provider가 없을 수 있음)
        const finalProvider = initialProviderFromNav || projectProvider || 'AWS';

        console.log('🔄 [ProjectLoader] Provider priority:', {
          fromNav: initialProviderFromNav,
          fromServer: projectProvider,
          final: finalProvider
        });

        // 프로바이더 설정 (UI 상태와 프로바이더 매니저 모두 업데이트)
        setCurrentCSP(finalProvider as 'AWS' | 'GCP' | 'Azure');

        // 프로바이더 매니저에서도 현재 프로바이더 설정
        let providerType: CloudProviderType;
        switch (finalProvider) {
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
  }, [projectId, setDroppedBlocks, setConnections, setCurrentCSP, initialProviderFromNav]);

  return { projectId };
};
