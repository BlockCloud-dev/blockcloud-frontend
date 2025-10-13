import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { Vector3 } from "three";
import { snapPositionToGrid } from "../../utils/snapGrid";
import { STACKING_RULES, validateStacking, getStackingHint } from "../../utils/stackingRules";
import { providerManager } from "../../providers";
import type { DragAndDropState, SnapGuide } from "./Canvas3DTypes";
import type { DroppedBlock } from "../../types/blocks";

export const useDragAndDrop = (
  droppedBlocks: DroppedBlock[] = [],
  onBlockDrop?: (blockData: any, position: Vector3) => void,
  onDragPreview?: (position: Vector3, blockData: any) => void,
  onDragPreviewEnd?: () => void,
  currentDragData?: any
) => {
  const [dragState, setDragState] = useState<DragAndDropState>({
    isDragOver: false,
    dragData: null,
    isBlockDragging: false,
    dragPosition: null,
    preview: {
      isVisible: false,
      position: null,
      blockType: null,
      blockData: null,
      isValidPosition: true,
      snapGuides: [],
      nearbyBlocks: [],
    },
  });

  // currentDragData가 변경될 때 dragData 업데이트
  useEffect(() => {
    if (currentDragData) {
      console.log("🎯 [useDragAndDrop] Current drag data updated:", currentDragData);
      setDragState(prev => ({
        ...prev,
        dragData: currentDragData,
        preview: {
          ...prev.preview,
          isVisible: true, // 드래그 시작하면 바로 visible로 설정
          position: new Vector3(0, 0, 0), // 기본 위치 설정
          blockType: currentDragData.type || currentDragData.id, // type이 없으면 id 사용
          blockData: currentDragData,
          isValidPosition: true,
          snapGuides: [],
          nearbyBlocks: [],
        }
      }));
    } else {
      setDragState(prev => ({
        ...prev,
        dragData: null,
        preview: {
          ...prev.preview,
          isVisible: false,
          position: null,
          blockType: null,
          blockData: null,
          isValidPosition: true,
          snapGuides: [],
          nearbyBlocks: [],
        }
      }));
    }
  }, [currentDragData]);

  // 충돌 검사 함수 (스태킹 허용)
  const checkCollision = useCallback((position: Vector3, blockData: any, allowStacking: boolean = false): boolean => {
    const blockSize = blockData.size || [1, 1, 1];

    return droppedBlocks.some(block => {
      const existingSize = block.size || [1, 1, 1];

      // 3D 바운딩 박스 충돌 검사
      const dx = Math.abs(position.x - block.position.x);
      const dy = Math.abs(position.y - block.position.y);
      const dz = Math.abs(position.z - block.position.z);

      // 스태킹이 허용된 경우 Y축 충돌 무시
      if (allowStacking) {
        return dx < (blockSize[0] + existingSize[0]) / 2 &&
          dz < (blockSize[2] + existingSize[2]) / 2;
      }

      return dx < (blockSize[0] + existingSize[0]) / 2 &&
        dy < (blockSize[1] + existingSize[1]) / 2 &&
        dz < (blockSize[2] + existingSize[2]) / 2;
    });
  }, [droppedBlocks]);

  // 스냅 가이드 생성 함수
  const generateSnapGuides = useCallback((position: Vector3): SnapGuide[] => {
    const guides: SnapGuide[] = [];
    const snapThreshold = 0.5;

    // 격자 스냅 가이드
    const snappedPos = snapPositionToGrid(position);
    if (position.distanceTo(snappedPos) < snapThreshold) {
      guides.push({
        id: 'grid-snap',
        type: 'grid',
        position: snappedPos,
        direction: 'x',
        color: '#00ff00',
        opacity: 0.8,
      });
    }

    // 기존 블록과의 정렬 가이드
    droppedBlocks.forEach((block, index) => {
      if (position.distanceTo(block.position) < 3) {
        // X축 정렬
        if (Math.abs(position.x - block.position.x) < snapThreshold) {
          guides.push({
            id: `align-x-${index}`,
            type: 'alignment',
            position: new Vector3(block.position.x, position.y, position.z),
            direction: 'x',
            color: '#ffff00',
            opacity: 0.6,
          });
        }

        // Z축 정렬
        if (Math.abs(position.z - block.position.z) < snapThreshold) {
          guides.push({
            id: `align-z-${index}`,
            type: 'alignment',
            position: new Vector3(position.x, position.y, block.position.z),
            direction: 'z',
            color: '#ffff00',
            opacity: 0.6,
          });
        }
      }
    });

    return guides;
  }, [droppedBlocks]);

  // 근처 블록 찾기 함수
  const findNearbyBlocks = useCallback((position: Vector3): DroppedBlock[] => {
    return droppedBlocks.filter(block => position.distanceTo(block.position) < 2);
  }, [droppedBlocks]);

  // 블록 겹침 검사 함수 (Volume/Disk 계열의 경우 더 관대한 겹침 허용)
  const areBlocksOverlapping = useCallback((pos1: Vector3, size1: [number, number, number], pos2: Vector3, size2: [number, number, number], dragType?: string): boolean => {
    // Volume/Disk 계열 블록의 경우 겹침 범위를 더 크게 설정
    const isVolumeDisk = dragType && (dragType.includes('volume') || dragType.includes('ebs') || dragType.includes('disk'));
    const tolerance = isVolumeDisk ? 0.3 : 0.1;

    const bounds1 = {
      xMin: pos1.x - size1[0] / 2 - tolerance,
      xMax: pos1.x + size1[0] / 2 + tolerance,
      zMin: pos1.z - size1[2] / 2 - tolerance,
      zMax: pos1.z + size1[2] / 2 + tolerance,
    };

    const bounds2 = {
      xMin: pos2.x - size2[0] / 2,
      xMax: pos2.x + size2[0] / 2,
      zMin: pos2.z - size2[2] / 2,
      zMax: pos2.z + size2[2] / 2,
    };

    // 두 블록이 X, Z축에서 겹치는지 확인
    const xOverlap = bounds1.xMax > bounds2.xMin && bounds1.xMin < bounds2.xMax;
    const zOverlap = bounds1.zMax > bounds2.zMin && bounds1.zMin < bounds2.zMax;
    return xOverlap && zOverlap;
  }, []);

  // 드롭 핸들러
  const handleDrop = useCallback((event: React.DragEvent) => {
    try {
      event.preventDefault();
      const blockData = dragState.dragData;

      if (!blockData) {
        console.warn("No drag data available for drop");
        return;
      }

      // BlockPalette에서 드래그한 새로운 블록인지 확인 (기존 블록 이동과 구분)
      // currentDragData가 있으면 새로운 블록, 없으면 기존 블록 이동
      if (!currentDragData) {
        console.log("🔄 [handleDrop] Skipping drop handler - existing block movement (no currentDragData)");
        return;
      }

      // 마우스 위치를 3D 좌표로 변환
      const canvas = event.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 그리드에 스냅
      const scale = 20;
      const worldPosition = new Vector3(x * scale, 0, -y * scale);
      let snappedPosition = snapPositionToGrid(worldPosition);

      // 스태킹 로직 적용 - 겹침 기반으로 변경
      const dragSize = blockData.size || [1, 1, 1];
      const stackableBlocks = droppedBlocks.filter((block) => {
        return areBlocksOverlapping(snappedPosition, dragSize, block.position, block.size || [1, 1, 1], blockData.id);
      });

      console.log("🔍 [Drop] Stackable blocks found:", {
        count: stackableBlocks.length,
        blocks: stackableBlocks.map(b => ({ type: b.type, position: b.position }))
      });

      // 스태킹 대상 블록 찾기 - 스택킹 규칙에 맞는 블록 중 가장 위에 있는 블록
      const dragType = blockData.id;

      // 현재 프로바이더에서 스태킹 규칙 가져오기
      const currentProvider = providerManager.getCurrentProvider();
      let allowedTargetTypes: string[] = [];

      if (currentProvider) {
        allowedTargetTypes = currentProvider.getStackableTargets(dragType);
        console.log(`🔍 [Drop] Using ${currentProvider.name} stacking rules for ${dragType}:`, allowedTargetTypes);
      } else {
        // 폴백으로 기존 AWS 규칙 사용
        allowedTargetTypes = STACKING_RULES[dragType] || [];
        console.log(`⚠️ [Drop] Using fallback AWS stacking rules for ${dragType}:`, allowedTargetTypes);
      }

      // 허용된 타겟 타입의 블록들만 필터링
      const validStackableBlocks = stackableBlocks.filter(block =>
        allowedTargetTypes.includes(block.type)
      );

      console.log("🔍 [Drop] Valid stackable blocks:", {
        dragType,
        allowedTargetTypes,
        validCount: validStackableBlocks.length,
        validBlocks: validStackableBlocks.map(b => ({ type: b.type, position: b.position }))
      });

      // 유효한 스택킹 대상 중 가장 위에 있는 블록 선택
      const stackingTarget = validStackableBlocks.length > 0
        ? validStackableBlocks.reduce((highest, current) => {
          return current.position.y > highest.position.y ? current : highest;
        })
        : null;

      // VPC 계열 블록을 제외한 모든 블록은 반드시 stackingTarget이 있어야만 드롭 가능
      // aws-vpc, gcp-vpc-network, azure-virtual-network 모두 체크
      const isVPCBlock = dragType.includes('vpc') || dragType.includes('virtual-network');
      if (!isVPCBlock && !stackingTarget) {
        const hint = currentProvider ?
          currentProvider.getStackingHint(blockData.id) :
          getStackingHint(blockData.id);
        toast.error(`${blockData.name || blockData.id} 블록은 ${hint} 올려야 합니다.`, {
          id: `block-drop-restriction-${blockData.id}`, // 중복 방지를 위한 고유 ID
          position: "bottom-center",
          duration: 3000
        });
        return;
      }

      // 스택킹 대상이 있다면 스택킹 규칙 검증
      if (stackingTarget && !isVPCBlock) {
        const isValidStacking = validateStacking(dragType, stackingTarget.type);

        if (!isValidStacking) {
          console.log("❌ [Drop] Invalid stacking rule detected");

          const hint = currentProvider ?
            currentProvider.getStackingHint(blockData.id) :
            getStackingHint(blockData.id);
          toast.error(`${blockData.name || blockData.id} 블록은 ${hint} 올릴 수 있습니다. ${stackingTarget.type} 위에는 올릴 수 없습니다.`, {
            id: `invalid-stacking-drop-${blockData.id}`,
            position: "bottom-center",
            duration: 3000
          });
          return;
        }
      }

      // 스태킹 유효성 검증 - 이미 유효한 블록만 선택되었으므로 단순화
      let isValidStack = false;
      if (stackingTarget && blockData) {
        const targetType = stackingTarget.type; // 저장된 블록은 type 사용
        isValidStack = true; // 이미 위에서 유효한 블록만 필터링했음

        console.log("🔍 [Drop] Stacking validation:", {
          dragType,
          targetType,
          isValidStack: true,
          reason: "Pre-filtered valid target"
        });
      }

      console.log("🎯 [Drop] Final stacking decision:", {
        hasStackingTarget: !!stackingTarget,
        isValidStack,
        willSkipCollisionCheck: isValidStack
      });

      // 스태킹이 가능한 경우 Y축만 조정 (X, Z는 마우스 위치 유지)
      if (isValidStack && stackingTarget) {
        const getBlockHeight = (blockType: string, size?: [number, number, number]) => {
          // VPC 계열 블록들
          if (blockType.includes('vpc') || blockType.includes('virtual-network')) {
            return size?.[1] || 0.2;
          }
          // Subnet 계열 블록들
          if (blockType.includes('subnet')) {
            return size?.[1] || 0.2;
          }
          // Volume/Disk 계열 블록들
          if (blockType.includes('volume') || blockType.includes('ebs') || blockType.includes('disk')) {
            return size?.[1] || 0.5;
          }
          return size?.[1] || 1;
        };

        const targetHeight = getBlockHeight(stackingTarget.type, stackingTarget.size);
        const draggedHeight = getBlockHeight(blockData.id);

        // X, Z는 마우스 위치 유지, Y만 스태킹 높이로 조정
        snappedPosition = new Vector3(
          snappedPosition.x, // 마우스 위치 유지
          stackingTarget.position.y + targetHeight / 2 + draggedHeight / 2,
          snappedPosition.z  // 마우스 위치 유지
        );

        console.log("🏗️ [Drop] Stacking position calculated:", {
          target: stackingTarget.type,
          targetHeight,
          draggedHeight,
          mousePosition: { x: snappedPosition.x, z: snappedPosition.z },
          finalPosition: snappedPosition
        });
      }

      // 충돌 검사 (스태킹이 유효한 경우 충돌 검사 완전히 건너뛰기)
      const hasCollision = isValidStack ? false : checkCollision(snappedPosition, blockData);
      if (hasCollision) {
        toast.error("이미 블록이 있는 위치입니다. 다른 위치를 선택해주세요.", {
          id: "block-collision-warning", // 중복 방지를 위한 고유 ID
          position: "bottom-center",
          duration: 2500
        });
        console.warn("❌ [Drop] Cannot drop block - collision detected");
        return;
      }

      console.log("🎯 [Drop] 블록 드롭:", {
        type: blockData.id,
        position: snappedPosition,
        isStacking: isValidStack,
        stackingTarget: stackingTarget?.type,
        originalMouse: { x, y },
      });

      // Volume/Disk 계열 블록인 경우 부트볼륨 vs 블록볼륨 분석
      const isVolumeDisk = blockData.id.includes('volume') || blockData.id.includes('ebs') || blockData.id.includes('disk');
      if (isVolumeDisk) {
        // 드롭 후 모든 블록 상태를 가져와서 분석하기 위해 잠시 대기
        setTimeout(() => {
          const volumeType = analyzeEBSVolumeType(snappedPosition, droppedBlocks);
          console.log("📦 [Drop] EBS 볼륨 타입 분석 완료:", {
            position: snappedPosition,
            volumeType
          });
        }, 100);
      }

      onBlockDrop?.(blockData, snappedPosition);
    } catch (error) {
      console.error("Error during drop:", error);
    } finally {
      onDragPreviewEnd?.();
    }
  }, [onBlockDrop, onDragPreviewEnd, droppedBlocks, checkCollision, areBlocksOverlapping, dragState.dragData]);

  // 드래그 미리보기 업데이트
  const updateDragPreview = useCallback((event: React.DragEvent | React.MouseEvent) => {
    const dragData = dragState.dragData;
    if (!dragData) {
      console.log("🤔 [updateDragPreview] No drag data available");
      return;
    }

    // 마우스 위치를 3D 좌표로 변환
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 그리드에 스냅
    const scale = 20;
    const worldPosition = new Vector3(x * scale, 0, -y * scale);
    let snappedPosition = snapPositionToGrid(worldPosition);

    // 스태킹 가능한 블록 찾기 - 겹침 기반
    const dragSize = dragData.size || [1, 1, 1];
    const stackableBlocks = droppedBlocks.filter((block) => {
      const isOverlapping = areBlocksOverlapping(snappedPosition, dragSize, block.position, block.size || [1, 1, 1], dragData.id);

      console.log("🔍 [updateDragPreview] Overlap check:", {
        dragType: dragData.id,
        targetType: block.type,
        dragPos: { x: snappedPosition.x, z: snappedPosition.z },
        targetPos: { x: block.position.x, y: block.position.y, z: block.position.z },
        dragSize,
        targetSize: block.size || [1, 1, 1],
        isOverlapping
      });

      return isOverlapping;
    });

    console.log("🔍 [updateDragPreview] Stackable blocks found:", {
      dragType: dragData.id,
      count: stackableBlocks.length,
      blocks: stackableBlocks.map(b => ({
        type: b.type,
        id: b.id.substring(0, 8),
        position: b.position,
        size: b.size
      }))
    });

    // 스태킹 대상 블록 찾기 - 스택킹 규칙에 맞는 블록 중 가장 위에 있는 블록
    const dragType = dragData.id;

    // 현재 프로바이더에서 스태킹 규칙 가져오기
    const currentProvider = providerManager.getCurrentProvider();
    let allowedTargetTypes: string[] = [];

    if (currentProvider) {
      allowedTargetTypes = currentProvider.getStackableTargets(dragType);
      console.log(`🔍 [Preview] Using ${currentProvider.name} stacking rules for ${dragType}:`, allowedTargetTypes);
    } else {
      // 폴백으로 기존 규칙 사용
      allowedTargetTypes = STACKING_RULES[dragType] || [];
      console.log(`⚠️ [Preview] Using fallback stacking rules for ${dragType}:`, allowedTargetTypes);
    }

    // 허용된 타겟 타입의 블록들만 필터링
    const validStackableBlocks = stackableBlocks.filter(block =>
      allowedTargetTypes.includes(block.type)
    );

    console.log("🔍 [Preview] Valid stackable blocks:", {
      dragType,
      allowedTargetTypes,
      validCount: validStackableBlocks.length,
      validBlocks: validStackableBlocks.map(b => ({ type: b.type, position: b.position }))
    });

    // 유효한 스택킹 대상 중 가장 위에 있는 블록 선택
    const stackingTarget = validStackableBlocks.length > 0
      ? validStackableBlocks.reduce((highest, current) => {
        return current.position.y > highest.position.y ? current : highest;
      })
      : null;

    // 스태킹 유효성 검증 - 이미 유효한 블록만 선택되었으므로 단순화
    let isValidStack = false;
    if (stackingTarget && dragData) {
      const targetType = stackingTarget.type; // 저장된 블록은 type 사용
      isValidStack = true; // 이미 위에서 유효한 블록만 필터링했음

      console.log("🔍 [updateDragPreview] Stacking validation:", {
        dragType,
        targetType,
        isValidStack: true,
        reason: "Pre-filtered valid target"
      });
    }

    // VPC 계열 블록이 아닌 블록은 반드시 스태킹 대상이 있어야 함
    const isVPCBlock = dragType.includes('vpc') || dragType.includes('virtual-network');
    const canPlaceDirectly = isVPCBlock || isValidStack;

    // 스태킹이 가능한 경우 Y축만 조정 (X, Z는 마우스 위치 유지)
    if (isValidStack && stackingTarget) {
      const getBlockHeight = (blockType: string, size?: [number, number, number]) => {
        // VPC 계열 블록들 (aws-vpc, gcp-vpc-network, azure-virtual-network)
        if (blockType.includes('vpc') || blockType.includes('virtual-network')) {
          return size?.[1] || 0.2; // foundation 블록들은 얇음
        }
        // Subnet 계열 블록들 (aws-subnet, gcp-subnet, azure-subnet)
        if (blockType.includes('subnet')) {
          return size?.[1] || 0.2; // subnet도 얇음
        }
        // Volume/Disk 계열 블록들
        if (blockType.includes('volume') || blockType.includes('ebs') || blockType.includes('disk')) {
          return size?.[1] || 0.5; // 볼륨/디스크는 작음
        }
        return size?.[1] || 1; // 일반 블록들
      };

      const targetHeight = getBlockHeight(stackingTarget.type, stackingTarget.size);
      const draggedHeight = getBlockHeight(dragData.id);

      // X, Z는 마우스 위치 유지, Y만 스태킹 높이로 조정
      snappedPosition = new Vector3(
        snappedPosition.x, // 마우스 위치 유지
        stackingTarget.position.y + targetHeight / 2 + draggedHeight / 2,
        snappedPosition.z  // 마우스 위치 유지
      );

      console.log("🏗️ [updateDragPreview] Stacking position calculated:", {
        target: stackingTarget.type,
        targetHeight,
        draggedHeight,
        mousePosition: { x: snappedPosition.x, z: snappedPosition.z },
        finalPosition: snappedPosition
      });
    }

    // 충돌 검사 (스태킹이 유효한 경우 충돌 검사 완전히 건너뛰기)
    const hasCollision = isValidStack ? false : checkCollision(snappedPosition, dragData);

    // 스냅 가이드 생성
    const snapGuides = generateSnapGuides(snappedPosition);

    // 근처 블록 찾기
    const nearbyBlocks = findNearbyBlocks(snappedPosition);

    console.log("🎯 [updateDragPreview] Updating preview:", {
      mouseCoords: { x: event.clientX, y: event.clientY },
      normalizedCoords: { x, y },
      worldPosition,
      snappedPosition,
      isVPCBlock,
      isValidStack,
      hasCollision,
      canPlaceDirectly,
      snapGuides: snapGuides.length,
      nearbyBlocks: nearbyBlocks.length,
    });

    // 상태 업데이트 - VPC가 아닌 블록은 반드시 스태킹이 되어야만 유효함
    const isValidPosition = canPlaceDirectly && !hasCollision;

    setDragState(prev => ({
      ...prev,
      preview: {
        ...prev.preview,
        isVisible: true,
        position: snappedPosition,
        blockType: dragData.id,
        blockData: dragData,
        isValidPosition,
        snapGuides,
        nearbyBlocks,
      }
    }));

    console.log("🎨 [updateDragPreview] State updated:", {
      isVisible: true,
      position: snappedPosition,
      blockType: dragData.id,
      isVPCBlock,
      isValidStack,
      hasCollision,
      canPlaceDirectly,
      isValidPosition,
      reasoning: !isVPCBlock && !isValidStack
        ? "Non-VPC block requires stacking target"
        : (hasCollision ? "Position has collision" : "Valid position")
    });

    // 부모 컴포넌트에 미리보기 정보 전달
    onDragPreview?.(snappedPosition, dragData);
  }, [dragState.dragData, currentDragData, droppedBlocks, onDragPreview, checkCollision, generateSnapGuides, findNearbyBlocks, areBlocksOverlapping]);

  // Volume/Disk 타입 분석 함수 (부트볼륨 vs 블록볼륨)
  const analyzeEBSVolumeType = useCallback((ebsPosition: Vector3, allBlocks: DroppedBlock[]) => {
    // Volume/Disk 위에 Compute 인스턴스가 있는지 확인
    const isComputeInstance = (type: string) =>
      type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');

    const ec2AboveEBS = allBlocks.find(block => {
      if (!isComputeInstance(block.type)) return false;

      // EC2가 EBS와 XZ 평면에서 겹치고 Y 좌표가 더 높은지 확인
      const isOverlapping = areBlocksOverlapping(
        ebsPosition, [0.8, 0.4, 0.8], // EBS 기본 크기
        block.position, block.size || [1, 0.6, 1], // EC2 기본 크기
        'volume'
      );

      const isAbove = block.position.y > ebsPosition.y;

      console.log("🔍 [analyzeEBSVolumeType] EC2 검사:", {
        blockId: block.id.substring(0, 8),
        blockPos: block.position,
        ebsPos: ebsPosition,
        isOverlapping,
        isAbove
      });

      return isOverlapping && isAbove;
    });

    const volumeType = ec2AboveEBS ? 'boot' : 'block';

    console.log("📦 [analyzeEBSVolumeType] EBS Volume 타입 결정:", {
      ebsPosition,
      ec2Above: ec2AboveEBS ? {
        id: ec2AboveEBS.id.substring(0, 8),
        position: ec2AboveEBS.position
      } : null,
      volumeType
    });

    return volumeType;
  }, [areBlocksOverlapping]);

  // 드래그 오버 핸들러
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    updateDragPreview(event);
  }, [updateDragPreview]);

  // 드래그 리브 핸들러
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return {
    dragState,
    setDragState,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    updateDragPreview,
    analyzeEBSVolumeType,
  };
};
