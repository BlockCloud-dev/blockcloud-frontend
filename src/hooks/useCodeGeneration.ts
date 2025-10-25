import { useEffect } from 'react';
import { providerManager } from '../providers';
import { useBlockStore, useConnectionStore, useUIStore, useStackingStore } from '../stores';

export const useCodeGeneration = () => {
  const { droppedBlocks } = useBlockStore();
  const { connections, setConnections } = useConnectionStore();
  const { setGeneratedCode } = useUIStore();
  const { deriveConnectionsFromStacking } = useStackingStore();

  // 블록 변경 시 HCL 코드 자동 생성
  useEffect(() => {
    // 스태킹 상태에서 연결 자동 파생
    const derivedConnections = deriveConnectionsFromStacking(droppedBlocks);

    // 기존 비스태킹 연결과 합치기
    const nonStackingConnections = connections.filter(
      (conn) => !conn.properties?.stackConnection
    );
    const allConnections = [...nonStackingConnections, ...derivedConnections];

    // 연결 업데이트
    if (JSON.stringify(allConnections) !== JSON.stringify(connections)) {
      setConnections(allConnections);
    }

    // 코드 생성 - 현재 프로바이더 사용
    const currentProvider = providerManager.getCurrentProvider();
    let code: string;

    if (currentProvider) {
      console.log(`🔧 [CodeGen] Using ${currentProvider.displayName} provider for code generation`);
      // 기존 DroppedBlock을 CloudBlock으로 변환
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
      code = currentProvider.generateCode(cloudBlocks, allConnections);
    } else {
      console.warn('⚠️ [CodeGen] No provider found, using empty template');
      code = `# 프로바이더가 선택되지 않았습니다.
# 프로젝트를 생성할 때 클라우드 프로바이더를 선택해주세요.

terraform {
  required_version = ">= 1.0"
}
`;
    }

    setGeneratedCode(code);
  }, [
    droppedBlocks,
    deriveConnectionsFromStacking,
    connections,
    setConnections,
    setGeneratedCode,
  ]);
};
