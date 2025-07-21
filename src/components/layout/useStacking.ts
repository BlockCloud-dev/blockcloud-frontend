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

  // 스태킹 유효성 검증
  const isValidStack = useMemo(() => {
    if (!stackingTarget || !currentDragData) return false;

    const dragType = currentDragData.type;
    const targetType = stackingTarget.type;

    // 스태킹 규칙 정의
    const stackingRules: Record<string, string[]> = {
      vpc: [], // VPC는 최하단
      subnet: ["vpc"], // 서브넷은 VPC 위에만
      "security-group": ["vpc", "subnet"], // 보안그룹은 VPC나 서브넷 위에
      ec2: ["subnet"], // EC2는 서브넷 위에만
      "load-balancer": ["subnet"], // 로드밸런서는 서브넷 위에만
      volume: ["ec2"], // 볼륨은 EC2 위에만
    };

    const allowedTargets = stackingRules[dragType] || [];
    return allowedTargets.includes(targetType);
  }, [stackingTarget, currentDragData]);

  // 블록 높이 계산
  const getBlockHeight = useCallback((blockType: string, size?: [number, number, number]) => {
    if (blockType === 'vpc' || blockType === 'subnet') {
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
