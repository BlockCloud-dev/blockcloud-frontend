import { useState, useCallback } from "react";
import { Vector3 } from "three";
import { analyzeEBSRole } from "../../utils/ebsRoleManager";
import type { DroppedBlock, Connection } from "../../types/blocks";

export const useConnections = (
  droppedBlocks: DroppedBlock[],
  connections: Connection[],
  onDeleteConnection?: (connectionId: string) => void
) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // 블록 이동 시 연결 해제 처리
  const handleBlockMove = useCallback((blockId: string, newPosition: Vector3) => {
    const movedBlock = droppedBlocks.find((block) => block.id === blockId);
    if (!movedBlock) return;

    console.log("🔄 블록 이동 감지:", {
      blockId: blockId.substring(0, 8),
      from: movedBlock.position,
      to: newPosition,
    });

    // 1. Volume 블록이 이동했을 때 EBS 역할 분석
    if (movedBlock.type === "volume") {
      const ebsAnalysis = analyzeEBSRole(movedBlock, droppedBlocks, connections);
      console.log("💾 [EBS] 역할 분석 결과:", ebsAnalysis);
    }

    // 2. 같은 그리드가 아닌 곳으로 이동하면 스택 연결 해제
    const isGridPositionChanged =
      Math.abs(movedBlock.position.x - newPosition.x) > 0.1 ||
      Math.abs(movedBlock.position.z - newPosition.z) > 0.1;

    if (isGridPositionChanged) {
      console.log("📍 [Move] 그리드 위치 변경됨 - 스택 연결 해제");

      // 스택 연결 해제
      const stackConnections = connections.filter(
        (conn) =>
          (conn.fromBlockId === blockId || conn.toBlockId === blockId) &&
          conn.properties?.stackConnection
      );

      stackConnections.forEach((conn) => {
        console.log("🔗 [Move] 스택 연결 해제:", {
          connection: conn.id.substring(0, 8),
          type: conn.connectionType,
        });
        onDeleteConnection?.(conn.id);
      });
    }
  }, [droppedBlocks, connections, onDeleteConnection]);

  // 연결 클릭 핸들러
  const handleConnectionClick = useCallback((connection: Connection) => {
    console.log("🔗 연결 클릭:", connection);
    // 연결 선택 로직 추가 가능
  }, []);

  // 연결 호버 처리
  const handleConnectionHover = useCallback((connectionId: string | null) => {
    setHoveredConnection(connectionId);
  }, []);

  // 유효한 연결 대상 계산
  const getValidConnectionTargets = useCallback((fromBlockId: string, connectionType: string) => {
    const fromBlock = droppedBlocks.find(block => block.id === fromBlockId);
    if (!fromBlock) return [];

    return droppedBlocks
      .filter(block => block.id !== fromBlockId)
      .filter(block => {
        // 연결 타입에 따른 유효성 검증 로직
        switch (connectionType) {
          case 'ec2-security-group':
            return block.type === 'security-group';
          case 'ec2-subnet':
            return block.type === 'subnet';
          case 'ec2-volume':
            return block.type === 'volume';
          case 'load-balancer-ec2':
            return block.type === 'ec2';
          // 추가 연결 타입들...
          default:
            return false;
        }
      })
      .map(block => block.id);
  }, [droppedBlocks]);

  // 연결 미리보기 계산
  const getConnectionPreview = useCallback((fromBlockId: string, toPosition: Vector3) => {
    const fromBlock = droppedBlocks.find(block => block.id === fromBlockId);
    if (!fromBlock) return null;

    return {
      from: new Vector3(fromBlock.position.x, fromBlock.position.y, fromBlock.position.z),
      to: toPosition,
    };
  }, [droppedBlocks]);

  return {
    hoveredConnection,
    handleBlockMove,
    handleConnectionClick,
    handleConnectionHover,
    getValidConnectionTargets,
    getConnectionPreview,
  };
};
