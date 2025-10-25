import { useCallback } from 'react';
import { Vector3 } from 'three';
import toast from 'react-hot-toast';
import type { DroppedBlock } from '../types/blocks';
import { useBlockStore, useConnectionStore, useUIStore } from '../stores';
import { canDeleteBlockWithStore, getStackedBlocks, getStackingHint } from '../utils/stackingRules';
import { useStackingStore } from '../stores';
import { snapToGrid } from '../utils/snapGrid';

interface UseBlockOperationsProps {
  handleStackingForNewBlock: (newBlock: DroppedBlock, allBlocks: DroppedBlock[], forcePosition?: boolean) => void;
  handleStackingForMovedBlock: (blockId: string, allBlocks: DroppedBlock[]) => boolean;
  removeStackingRelation: (blockId: string) => void;
}

export const useBlockOperations = ({
  handleStackingForNewBlock,
  handleStackingForMovedBlock,
  removeStackingRelation,
}: UseBlockOperationsProps) => {
  const {
    droppedBlocks,
    selectedBlockId,
    addBlock,
    deleteBlock,
    setSelectedBlockId,
    setPropertiesBlockId,
    setIsDraggingBlock,
    setDragPosition,
    moveBlock,
    resizeBlock,
  } = useBlockStore();

  const {
    deleteConnectionsForBlock,
  } = useConnectionStore();

  const { setActiveTab } = useUIStore();
  const { stackingStates, validateStacking } = useStackingStore();
  const { canStack } = useStackingStore();

  // 블록 타입별 크기 결정
  const getBlockSizeByType = useCallback((blockId: string): [number, number, number] => {
    if (blockId.includes('vpc') || blockId.includes('virtual-network')) {
      return [4, 0.2, 4];
    }
    if (blockId.includes('subnet')) {
      return [3, 0.3, 3];
    }
    if (blockId.includes('ec2') || blockId.includes('compute-engine') || blockId.includes('virtual-machine')) {
      return [1, 1.5, 1];
    }
    if (blockId.includes('volume') || blockId.includes('ebs') || blockId.includes('disk')) {
      return [0.8, 0.8, 0.8];
    }
    if (blockId.includes('security-group') || blockId.includes('firewall') || blockId.includes('nsg')) {
      return [1, 2, 1];
    }
    if (blockId.includes('load-balancer')) {
      return [2, 1, 1];
    }
    return [1, 1, 1];
  }, []);

  // 블록 드롭
  const handleBlockDrop = useCallback((blockData: any, position: Vector3) => {
    const blockSize = getBlockSizeByType(blockData.id);
    const finalPosition = position;

    console.log('📦 Using calculated position from Canvas3D:', {
      blockType: blockData.id,
      position: finalPosition,
      isStacked: finalPosition.y > blockSize[1] / 2 + 0.2,
    });

    const newBlock: DroppedBlock = {
      id: `${blockData.id}-${Date.now()}`,
      type: blockData.id,
      name: blockData.name,
      position: finalPosition,
      timestamp: Date.now(),
      properties: {
        name: blockData.name || `New ${blockData.id}`,
        description: `${blockData.name} created at ${new Date().toLocaleString()}`,
      },
      size: blockSize,
    };

    // 블록 유형에 따른 기본 속성 추가
    if (blockData.id.includes('vpc') || blockData.id.includes('virtual-network')) {
      newBlock.properties.cidrBlock = '10.0.0.0/16';
      newBlock.properties.enableDnsSupport = true;
      newBlock.properties.enableDnsHostnames = true;
    } else if (blockData.id.includes('subnet')) {
      newBlock.properties.cidrBlock = '10.0.1.0/24';
      newBlock.properties.availabilityZone = 'ap-northeast-2a';
    } else if (blockData.id.includes('ec2') || blockData.id.includes('compute-engine') || blockData.id.includes('virtual-machine')) {
      newBlock.properties.instanceType = 't2.micro';
      newBlock.properties.ami = 'ami-12345678';
    } else if (blockData.id.includes('security-group') || blockData.id.includes('firewall') || blockData.id.includes('nsg')) {
      newBlock.properties.securityRules = [
        {
          type: 'ingress',
          protocol: 'tcp',
          fromPort: 22,
          toPort: 22,
          cidrBlocks: ['0.0.0.0/0'],
        },
      ];
    } else if (blockData.id.includes('load-balancer')) {
      newBlock.properties.loadBalancerType = 'application';
    } else if (blockData.id.includes('volume') || blockData.id.includes('ebs') || blockData.id.includes('disk')) {
      newBlock.properties.volumeSize = 8;
      newBlock.properties.volumeType = 'gp2';
    }

    addBlock(newBlock);
    console.log('✅ Block added to scene:', newBlock);

    const updatedBlocks = [...droppedBlocks, newBlock];
    handleStackingForNewBlock(newBlock, updatedBlocks, false);

    console.log('📊 Total blocks:', droppedBlocks.length + 1);
  }, [droppedBlocks, addBlock, getBlockSizeByType, handleStackingForNewBlock]);

  // 블록 클릭
  const handleBlockClick = useCallback((blockId: string, isConnectionMode: boolean, selectedFromBlockId: string | null, setSelectedFromBlockId: (id: string | null) => void, resetConnectionMode: () => void, completeConnection: (toBlockId: string, fromBlock?: DroppedBlock, toBlock?: DroppedBlock) => boolean) => {
    console.log('🎯 Block clicked:', blockId);

    if (isConnectionMode) {
      if (!selectedFromBlockId) {
        setSelectedFromBlockId(blockId);
        console.log('🔗 연결 시작 블록 선택:', blockId);
      } else if (selectedFromBlockId !== blockId) {
        const fromBlock = droppedBlocks.find((b) => b.id === selectedFromBlockId);
        const toBlock = droppedBlocks.find((b) => b.id === blockId);

        if (fromBlock && toBlock) {
          const success = completeConnection(blockId, fromBlock, toBlock);
          if (success) {
            console.log('🔗 연결 생성 성공:', selectedFromBlockId, '->', blockId);
            resetConnectionMode();
          } else {
            console.log('❌ 연결 생성 실패');
            setSelectedFromBlockId(blockId);
          }
        } else {
          resetConnectionMode();
        }
      } else {
        resetConnectionMode();
      }
      return;
    }

    console.log('🎯 Block clicked for selection:', blockId);
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
    setPropertiesBlockId(null);
    setActiveTab('code');
    console.log('🔍 Block selected:', blockId);
  }, [droppedBlocks, selectedBlockId, setSelectedBlockId, setPropertiesBlockId, setActiveTab]);

  // 블록 우클릭
  const handleBlockRightClick = useCallback((blockId: string, event?: MouseEvent, startConnecting?: (id: string) => void) => {
    console.log('🔗 [APP] handleBlockRightClick called:', {
      blockId: blockId.substring(0, 8),
      hasEvent: !!event,
      shiftKey: event?.shiftKey,
      eventType: event?.type,
    });

    if (event?.shiftKey && startConnecting) {
      console.log('🔗 [APP] Starting connection mode from block:', blockId.substring(0, 8));
      startConnecting(blockId);
      return;
    }

    console.log('🔗 [APP] Normal right click - showing properties panel');
    setSelectedBlockId(blockId);
    setPropertiesBlockId(blockId);
    setActiveTab('properties');
    console.log('📋 Block right-clicked, showing properties panel:', blockId);
  }, [setSelectedBlockId, setPropertiesBlockId, setActiveTab]);

  // 블록 삭제
  const handleBlockDelete = useCallback((blockId: string) => {
    const deleteValidation = canDeleteBlockWithStore(blockId, stackingStates, droppedBlocks);

    if (!deleteValidation.canDelete) {
      const targetBlock = droppedBlocks.find(b => b.id === blockId);
      const stackedBlocks = deleteValidation.stackedBlocks || [];
      const stackedBlockNames = stackedBlocks.map(b => b.type).join(', ');

      toast.error(
        `${targetBlock?.type || '블록'}을 삭제할 수 없습니다.\n` +
        `위에 스택된 블록들을 먼저 삭제해주세요: ${stackedBlockNames}`,
        {
          id: `delete-blocked-${blockId}`,
          position: 'bottom-center',
          duration: 3000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );
      return;
    }

    removeStackingRelation(blockId);
    deleteConnectionsForBlock(blockId);
    deleteBlock(blockId);

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      setPropertiesBlockId(null);
      setActiveTab('code');
    }

    toast.success(`${droppedBlocks.find(b => b.id === blockId)?.type || '블록'}이 삭제되었습니다.`, {
      position: 'bottom-center',
      duration: 2000
    });

    console.log('🗑️ Block deleted:', blockId);
  }, [droppedBlocks, selectedBlockId, stackingStates, removeStackingRelation, deleteConnectionsForBlock, deleteBlock, setSelectedBlockId, setPropertiesBlockId, setActiveTab]);

  // 블록 크기 계산
  const getBlockSize = useCallback((
    blockType: string,
    customSize?: [number, number, number]
  ): [number, number, number] => {
    if (customSize) return customSize;
    return getBlockSizeByType(blockType);
  }, [getBlockSizeByType]);

  // 블록 높이 계산
  const getBlockHeight = useCallback((
    blockType: string,
    size?: [number, number, number]
  ) => {
    if (blockType.includes('vpc') || blockType.includes('virtual-network') || blockType.includes('subnet')) {
      return size?.[1] || 0.2;
    }
    return size?.[1] || 1;
  }, []);

  // 블록 Y 위치 계산
  const getBlockYPosition = useCallback((
    blockType: string,
    size?: [number, number, number]
  ) => {
    const blockHeight = getBlockHeight(blockType, size);
    if (blockType.includes('vpc') || blockType.includes('virtual-network') || blockType.includes('subnet')) {
      return blockHeight / 2;
    }
    return blockHeight / 2 + 0.1;
  }, [getBlockHeight]);

  // 충돌 감지
  const isColliding = useCallback((
    pos1: Vector3,
    size1: [number, number, number],
    pos2: Vector3,
    size2: [number, number, number],
    blockType1: string,
    blockType2: string
  ) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dz = Math.abs(pos1.z - pos2.z);

    const minDistanceX = (size1[0] + size2[0]) / 2;
    const minDistanceZ = (size1[2] + size2[2]) / 2;

    const overlapping = dx < minDistanceX && dz < minDistanceZ;

    if (overlapping && canStack(blockType1, blockType2)) {
      return false;
    }

    return overlapping;
  }, [canStack]);

  // 스태킹 위치 계산
  const calculateStackingPosition = useCallback((
    targetBlock: DroppedBlock,
    movingBlockType: string,
    movingBlockSize: [number, number, number],
    currentX: number,
    currentZ: number
  ) => {
    const targetHeight = getBlockHeight(targetBlock.type, targetBlock.size);
    const movingHeight = getBlockHeight(movingBlockType, movingBlockSize);

    const newY = targetBlock.position.y + targetHeight / 2 + movingHeight / 2 + 0.01;

    return new Vector3(currentX, newY, currentZ);
  }, [getBlockHeight]);

  // 빈 위치 찾기
  const findEmptyPosition = useCallback((
    startX: number,
    startZ: number,
    blockSize: [number, number, number],
    blockType: string
  ) => {
    const searchRadius = 10;
    const snapSize = 0.5;

    for (let radius = 0; radius <= searchRadius; radius += snapSize) {
      for (let angle = 0; angle < 360; angle += 30) {
        const radian = (angle * Math.PI) / 180;
        const testX = Math.round((startX + radius * Math.cos(radian)) / snapSize) * snapSize;
        const testZ = Math.round((startZ + radius * Math.sin(radian)) / snapSize) * snapSize;

        const testPosition = new Vector3(testX, 0, testZ);
        let hasCollision = false;

        for (const block of droppedBlocks) {
          const otherSize = getBlockSize(block.type, block.size);
          if (isColliding(testPosition, blockSize, block.position, otherSize, blockType, block.type)) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          return new Vector3(testX, getBlockYPosition(blockType, blockSize), testZ);
        }
      }
    }

    return new Vector3(startX, getBlockYPosition(blockType, blockSize), startZ);
  }, [droppedBlocks, getBlockSize, getBlockYPosition, isColliding]);

  // 블록 이동
  const handleBlockMove = useCallback((blockId: string, newPosition: Vector3) => {
    console.log('🎯 [APP_MOVE] ========== BLOCK MOVE START ==========');
    console.log('🎯 [APP_MOVE] Block ID:', blockId);
    console.log('🎯 [APP_MOVE] Received position from BaseBlock:', newPosition);

    const stackedBlocks = getStackedBlocks(blockId, droppedBlocks);
    if (stackedBlocks.length > 0) {
      const movingBlock = droppedBlocks.find(b => b.id === blockId);
      const stackedBlockNames = stackedBlocks.map(b => b.type).join(', ');

      toast.error(
        `${movingBlock?.type || '블록'}을 이동할 수 없습니다.\n` +
        `위에 스택된 블록들을 먼저 이동해주세요: ${stackedBlockNames}`,
        {
          id: `move-blocked-${blockId}`,
          position: 'bottom-center',
          duration: 3000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );

      console.log('❌ [APP_MOVE] Cannot move block - has stacked blocks above:', stackedBlockNames);
      return;
    }

    const movingBlock = droppedBlocks.find((block) => block.id === blockId);
    if (!movingBlock) {
      console.log('❌ [APP_MOVE] Block not found:', blockId);
      return;
    }

    console.log('🎯 [APP_MOVE] Moving block details:', {
      id: movingBlock.id,
      type: movingBlock.type,
      currentPosition: movingBlock.position,
    });

    const snappedX = snapToGrid(newPosition.x);
    const snappedZ = snapToGrid(newPosition.z);
    console.log('🎯 [APP_MOVE] Position after snap:', {
      x: snappedX,
      z: snappedZ,
      originalY: newPosition.y,
    });

    const blockSize = getBlockSize(movingBlock.type, movingBlock.size);
    console.log('🎯 [APP_MOVE] Block size:', blockSize);

    let stackingTarget: DroppedBlock | null = null;
    let hasCollision = false;
    const testPosition = new Vector3(snappedX, 0, snappedZ);
    const overlappingBlocks: DroppedBlock[] = [];

    for (const block of droppedBlocks) {
      if (block.id === blockId) continue;

      const otherSize = getBlockSize(block.type, block.size);
      const dx = Math.abs(testPosition.x - block.position.x);
      const dz = Math.abs(testPosition.z - block.position.z);

      const minDistanceX = (blockSize[0] + otherSize[0]) / 2;
      const minDistanceZ = (blockSize[2] + otherSize[2]) / 2;

      if (dx < minDistanceX && dz < minDistanceZ) {
        overlappingBlocks.push(block);
      }
    }

    console.log(
      '🔍 [APP_MOVE] 겹치는 블록들:',
      overlappingBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        y: b.position.y,
      }))
    );

    if (overlappingBlocks.length > 0) {
      const otherBlocks = overlappingBlocks.filter(b => b.id !== blockId);

      console.log('🔍 [APP_MOVE] 자신 제외한 겹치는 블록들:', otherBlocks.length);

      if (otherBlocks.length > 0) {
        const isComputeBlock = movingBlock.type.includes('ec2') ||
          movingBlock.type.includes('compute-engine') ||
          movingBlock.type.includes('virtual-machine');

        let volumeBlock = null;
        if (isComputeBlock) {
          volumeBlock = otherBlocks.find(b =>
            b.type.includes('volume') ||
            b.type.includes('persistent-disk') ||
            b.type.includes('managed-disk')
          );

          if (volumeBlock) {
            console.log('🔍 [APP_MOVE] Volume 블록 발견:', volumeBlock.type);

            if (canStack(movingBlock.type, volumeBlock.type)) {
              console.log('✅ [APP_MOVE] Compute-Volume 스태킹 허용');
              stackingTarget = volumeBlock;
            }
          }
        }

        if (!stackingTarget) {
          const topBlock = otherBlocks.reduce((highest, current) =>
            current.position.y > highest.position.y ? current : highest
          );

          console.log('🔍 [APP_MOVE] 가장 위에 있는 블록:', {
            id: topBlock.id,
            type: topBlock.type,
            y: topBlock.position.y,
          });

          if (canStack(movingBlock.type, topBlock.type)) {
            console.log(
              '✅ [APP_MOVE] 스태킹 허용:',
              movingBlock.type,
              'on',
              topBlock.type
            );
            stackingTarget = topBlock;
          } else {
            console.log(
              '❌ [APP_MOVE] 스택킹 불가능:',
              movingBlock.type,
              'on',
              topBlock.type
            );
            hasCollision = true;
          }
        }
      }
    }

    let finalPosition: Vector3;

    if (stackingTarget) {
      const blockWithNewPosition = {
        ...movingBlock,
        position: newPosition
      };

      const isValidStacking = validateStacking(blockWithNewPosition, stackingTarget);

      if (!isValidStacking) {
        console.log('❌ [APP_MOVE] Invalid stacking rule detected');

        const hint = getStackingHint(movingBlock.type);
        toast.error(`${movingBlock.type} 블록은 ${hint} 올릴 수 있습니다. ${stackingTarget.type} 위에는 올릴 수 없습니다.`, {
          id: `invalid-stacking-${blockId}`,
          position: 'bottom-center',
          duration: 3000
        });

        console.log('🔄 [APP_MOVE] Invalid stacking, reverting to original position:', movingBlock.position);
        return;
      }

      finalPosition = calculateStackingPosition(
        stackingTarget,
        movingBlock.type,
        blockSize,
        snappedX,
        snappedZ
      );
      console.log(
        '📚 [APP_MOVE] Valid stacking - block on top of:',
        stackingTarget.type,
        'at position:',
        finalPosition
      );
    } else if (hasCollision) {
      finalPosition = findEmptyPosition(
        snappedX,
        snappedZ,
        blockSize,
        movingBlock.type
      );
      console.log(
        '🚫 [APP_MOVE] Collision detected, moving to empty position:',
        finalPosition
      );
    } else {
      const isVPCBlock = movingBlock.type.includes('vpc') || movingBlock.type.includes('virtual-network');
      if (!isVPCBlock) {
        console.log('❌ [APP_MOVE] Non-VPC block cannot be placed in empty space');

        const hint = getStackingHint(movingBlock.type);
        toast.error(`${movingBlock.type} 블록은 ${hint} 올려야 합니다. 빈 공간에는 올릴 수 없습니다.`, {
          id: `block-move-restriction-${blockId}`,
          position: 'bottom-center',
          duration: 3000
        });

        console.log('🔄 [APP_MOVE] Reverting to original position:', movingBlock.position);
        return;
      }

      finalPosition = new Vector3(snappedX, newPosition.y, snappedZ);
      console.log(
        '✅ [APP_MOVE] VPC block placed at requested position:',
        finalPosition
      );
    }

    console.log(
      '🎯 [APP_MOVE] FINAL DECISION - Block will be placed at:',
      finalPosition
    );

    const originalPosition = movingBlock.position;
    console.log('💾 [APP_MOVE] 원래 위치 저장:', originalPosition);

    moveBlock(blockId, finalPosition);

    setIsDraggingBlock(null);
    setDragPosition(null);

    const updatedBlocks = droppedBlocks.map((block) =>
      block.id === blockId ? { ...block, position: finalPosition } : block
    );

    console.log('🔄 [APP_MOVE] 업데이트된 블록 배열로 스태킹 처리');
    const stackingSuccess = handleStackingForMovedBlock(blockId, updatedBlocks);

    if (!stackingSuccess) {
      console.log('❌ [APP_MOVE] 스태킹 검증 실패 - 원래 위치로 복원');
      moveBlock(blockId, originalPosition);

      const hint = getStackingHint(movingBlock.type);
      toast.error(
        `${movingBlock.type} 블록은 ${hint} 올려야 합니다.\n현재 위치에서는 올바른 연결을 찾을 수 없습니다.`,
        {
          id: `stacking-failed-${blockId}`,
          position: 'bottom-center',
          duration: 4000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );

      console.log('🔄 [APP_MOVE] 원래 위치로 복원 완료:', originalPosition);
      console.log('🎯 [APP_MOVE] ========== BLOCK MOVE REVERTED ==========');
      return;
    }

    console.log('🔄 [APP_MOVE] Block moved:', blockId, finalPosition);
    console.log('🎯 [APP_MOVE] ========== BLOCK MOVE END ==========');
  }, [
    droppedBlocks,
    getBlockSize,
    canStack,
    validateStacking,
    calculateStackingPosition,
    findEmptyPosition,
    moveBlock,
    setIsDraggingBlock,
    setDragPosition,
    handleStackingForMovedBlock,
  ]);

  // 블록 드래그 시작
  const handleBlockDragStart = useCallback((blockId: string) => {
    setIsDraggingBlock(blockId);
    console.log('🎯 Block drag started:', blockId);
  }, [setIsDraggingBlock]);

  // 블록 드래그 종료
  const handleBlockDragEnd = useCallback((blockId: string) => {
    setIsDraggingBlock(null);
    setDragPosition(null);
    console.log('🎯 Block drag ended:', blockId);
  }, [setIsDraggingBlock, setDragPosition]);

  // 블록 드래그 업데이트
  const handleBlockDragUpdate = useCallback((blockId: string, position: Vector3, isDraggingBlock: string | null) => {
    if (isDraggingBlock === blockId) {
      setDragPosition(position);
    }
  }, [setDragPosition]);

  // 블록 리사이즈
  const handleBlockResize = useCallback((blockId: string, newSize: [number, number, number]) => {
    resizeBlock(blockId, newSize);
    console.log('📏 Block resized:', blockId, newSize);

    handleStackingForMovedBlock(blockId, droppedBlocks);
    console.log('🔗 블록 크기 변경 후 스태킹 연결 재검출 완료');
  }, [resizeBlock, droppedBlocks, handleStackingForMovedBlock]);

  return {
    handleBlockDrop,
    handleBlockClick,
    handleBlockRightClick,
    handleBlockDelete,
    handleBlockMove,
    handleBlockDragStart,
    handleBlockDragEnd,
    handleBlockDragUpdate,
    handleBlockResize,
  };
};
