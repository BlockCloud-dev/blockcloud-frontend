import { useMemo, useCallback } from "react";
import { Vector3 } from "three";
import { arePositionsOnSameGrid } from "../../utils/snapGrid";
import type { DroppedBlock } from "../../types/blocks";

export const useStacking = (
  droppedBlocks: DroppedBlock[],
  dragPosition: Vector3 | null,
  currentDragData: any
) => {
  // 스태킹 가능한 블록들 찾기
  const stackableBlocks = useMemo(() => {
    if (!dragPosition || !currentDragData) return [];

    return droppedBlocks.filter((block) => {
      // 같은 그리드 위치에 있는 블록들만
      return arePositionsOnSameGrid(
        new Vector3(dragPosition.x, 0, dragPosition.z),
        new Vector3(block.position.x, 0, block.position.z)
      );
    });
  }, [droppedBlocks, dragPosition, currentDragData]);

  // 스태킹 대상 블록 결정
  const stackingTarget = useMemo(() => {
    if (stackableBlocks.length === 0) return null;

    // 가장 위에 있는 블록을 타겟으로 선택
    return stackableBlocks.reduce((highest, current) => {
      return current.position.y > highest.position.y ? current : highest;
    });
  }, [stackableBlocks]);

  // 스태킹 유효성 검증 (벤더 무관)
  const isValidStack = useMemo(() => {
    if (!stackingTarget || !currentDragData) return false;

    const dragType = currentDragData.type;
    const targetType = stackingTarget.type;

    // 벤더 무관 헬퍼 함수
    const isVPC = (type: string) => type.includes('vpc') || type.includes('virtual-network');
    const isSubnet = (type: string) => type.includes('subnet');
    const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');
    const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');
    const isSecurity = (type: string) => type.includes('security-group') || type.includes('firewall') || type.includes('nsg');
    const isLoadBalancer = (type: string) => type.includes('load-balancer');

    // 벤더 무관 스태킹 규칙
    if (isVPC(dragType)) return false; // VPC는 최하단
    if (isSubnet(dragType) && isVPC(targetType)) return true;
    if (isSecurity(dragType) && (isVPC(targetType) || isSubnet(targetType))) return true;
    if (isCompute(dragType) && (isSubnet(targetType) || isVolume(targetType))) return true;
    if (isLoadBalancer(dragType) && isSubnet(targetType)) return true;
    if (isVolume(dragType) && (isSubnet(targetType) || isCompute(targetType))) return true;

    return false;
  }, [stackingTarget, currentDragData]);

  // 블록 높이 계산 (벤더 무관)
  const getBlockHeight = useCallback((blockType: string, size?: [number, number, number]) => {
    // VPC/Virtual Network 또는 Subnet인 경우
    if (blockType.includes('vpc') || blockType.includes('virtual-network') || blockType.includes('subnet')) {
      return size?.[1] || 0.2; // foundation 블록들은 얇음
    }
    return size?.[1] || 1; // 일반 블록들
  }, []);

  // 스택된 위치 계산
  const calculateStackPosition = useCallback((targetBlock: DroppedBlock, draggedBlockType: string) => {
    const targetHeight = getBlockHeight(targetBlock.type, targetBlock.size);
    const draggedHeight = getBlockHeight(draggedBlockType);

    return new Vector3(
      targetBlock.position.x,
      targetBlock.position.y + targetHeight / 2 + draggedHeight / 2,
      targetBlock.position.z
    );
  }, [getBlockHeight]);

  return {
    stackableBlocks,
    stackingTarget,
    isValidStack,
    calculateStackPosition,
    getBlockHeight,
  };
};
