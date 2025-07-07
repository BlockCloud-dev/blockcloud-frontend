import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Vector3 } from "three";
import { BaseBlock } from "../blocks/BaseBlock";
import { Road } from "../blocks/Road";
import { StackGuide } from "../blocks/StackGuide";
import { StackConnectionLine } from "../blocks/StackConnectionLine";
import { DragPreview } from "../blocks/DragPreview";
import type { DroppedBlock, Connection } from "../../types/blocks";
import { snapToGrid, arePositionsOnSameGrid } from "../../utils/snapGrid";
import { analyzeEBSRole } from "../../utils/ebsRoleManager";

interface Canvas3DProps {
  onBlockDrop?: (blockData: any, position: Vector3) => void;
  onBlockClick?: (blockId: string) => void;
  onBlockRightClick?: (blockId: string, event?: MouseEvent) => void;
  onBlockDelete?: (blockId: string) => void; // App.tsx에서 전달하지만 Canvas3D에서 직접 사용하지 않음
  onBlockMove?: (blockId: string, newPosition: Vector3) => void;
  onBlockResize?: (blockId: string, newSize: [number, number, number]) => void;
  onBlockPropertiesChange?: (
    blockId: string,
    properties: Partial<DroppedBlock["properties"]>
  ) => void;
  onBlockDragStart?: (blockId: string) => void;
  onBlockDragEnd?: (blockId: string) => void;
  onBlockDragUpdate?: (blockId: string, position: Vector3) => void;
  onCanvasClick?: () => void; // 캔버스 빈 공간 클릭 핸들러
  droppedBlocks?: DroppedBlock[];
  selectedBlockId?: string | null;
  // 연결 관련 props
  connections?: Connection[];
  selectedConnectionId?: string | null;
  isConnecting?: boolean;
  connectingFrom?: string | null;
  onConnectionClick?: (connection: Connection) => void;
  onConnectionComplete?: (toBlockId: string) => void;
  onConnectionCancel?: () => void;
  // 연결 해제 관련 props - 새로 추가
  onDeleteConnection?: (connectionId: string) => void;
  onDeleteConnectionsForBlock?: (blockId: string) => void;
  // 드래그 관련 props
  isDraggingBlock?: string | null;
  dragPosition?: Vector3 | null;
  // 드롭 미리보기 관련 props
  onDragPreview?: (position: Vector3, blockData: any) => void;
  onDragPreviewEnd?: () => void;
  isDropPreview?: boolean;
  previewPosition?: Vector3 | null;
  previewBlockData?: any;
  currentDragData?: any;
}

export function Canvas3D({
  onBlockDrop,
  onBlockClick,
  onBlockRightClick,
  // onBlockDelete, // 현재 Canvas3D에서 직접 사용하지 않음
  onBlockMove,
  onBlockResize,
  // onBlockPropertiesChange,  // 현재 사용하지 않음
  onBlockDragStart,
  onBlockDragEnd,
  onBlockDragUpdate,
  onCanvasClick,
  droppedBlocks = [],
  selectedBlockId,
  // 연결 관련
  connections = [],
  selectedConnectionId,
  isConnecting = false,
  connectingFrom,
  onConnectionClick,
  onConnectionComplete,
  // onConnectionCancel,  // 현재 사용하지 않음
  // 연결 해제 관련 - 새로 추가
  onDeleteConnection,
  onDeleteConnectionsForBlock,
  // 드래그 관련
  isDraggingBlock,
  dragPosition,
  // 드롭 미리보기 관련
  onDragPreview,
  onDragPreviewEnd,
  isDropPreview = false,
  previewPosition,
  previewBlockData,
  currentDragData,
}: Canvas3DProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBlockDragging, setIsBlockDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 블록 이동 처리 및 연결 해제 로직
  const handleBlockMove = (blockId: string, newPosition: Vector3) => {
    const movedBlock = droppedBlocks.find((block) => block.id === blockId);
    if (!movedBlock) return;

    console.log("🔄 블록 이동 감지:", {
      blockId: blockId.substring(0, 8),
      blockType: movedBlock.type,
      oldPosition: {
        x: movedBlock.position.x.toFixed(3),
        y: movedBlock.position.y.toFixed(3),
        z: movedBlock.position.z.toFixed(3),
      },
      newPosition: {
        x: newPosition.x.toFixed(3),
        y: newPosition.y.toFixed(3),
        z: newPosition.z.toFixed(3),
      },
    });

    // 캔버스 경계 확인 (50x50 격자 기준)
    const canvasBounds = {
      minX: -25,
      maxX: 25,
      minZ: -25,
      maxZ: 25,
    };

    const isOutsideCanvas =
      newPosition.x < canvasBounds.minX ||
      newPosition.x > canvasBounds.maxX ||
      newPosition.z < canvasBounds.minZ ||
      newPosition.z > canvasBounds.maxZ;

    if (isOutsideCanvas) {
      console.log("🚫 블록이 캔버스 밖으로 이동:", {
        blockId: blockId.substring(0, 8),
        position: { x: newPosition.x.toFixed(3), z: newPosition.z.toFixed(3) },
        bounds: canvasBounds,
      });

      // 캔버스 밖으로 나간 블록의 모든 연결 해제
      if (onDeleteConnectionsForBlock) {
        onDeleteConnectionsForBlock(blockId);
        console.log(
          "🔗 캔버스 이탈로 인한 연결 해제:",
          blockId.substring(0, 8)
        );
      }
    } else {
      // 스택 해제 감지
      checkStackingAndDisconnect(blockId, newPosition);
    }

    // EBS 역할 재분석은 App.tsx의 handleBlockMove에서 처리됨

    // 기존 onBlockMove 호출
    onBlockMove?.(blockId, newPosition);
  };

  // 스택킹 해제 감지 및 연결 해제 함수
  const checkStackingAndDisconnect = (
    movedBlockId: string,
    newPosition: Vector3
  ) => {
    const movedBlock = droppedBlocks.find((block) => block.id === movedBlockId);
    if (!movedBlock) return;

    // 새 위치에서 겹치는 블록들 찾기
    const overlappingBlocks = droppedBlocks.filter((block) => {
      if (block.id === movedBlockId) return false;

      const blockSize = movedBlock.size || [1, 1, 1];
      const otherSize = block.size || [1, 1, 1];
      const dx = Math.abs(newPosition.x - block.position.x);
      const dz = Math.abs(newPosition.z - block.position.z);

      const minDistanceX = (blockSize[0] + otherSize[0]) / 2;
      const minDistanceZ = (blockSize[2] + otherSize[2]) / 2;

      return dx < minDistanceX && dz < minDistanceZ;
    });

    // 스택킹 규칙 정의
    const canStack = (upperType: string, lowerType: string) => {
      const stackingRules: Record<string, string[]> = {
        vpc: [],
        subnet: ["vpc"],
        ec2: ["subnet", "volume"],
        "security-group": ["subnet", "ec2", "volume"],
        "load-balancer": ["subnet"],
        volume: ["subnet"],
      };
      return stackingRules[upperType]?.includes(lowerType) || false;
    };

    // 이전 위치에서 스택되어 있던 블록들 찾기
    const previouslyStackedBlocks = droppedBlocks.filter((block) => {
      if (block.id === movedBlockId) return false;

      const blockSize = movedBlock.size || [1, 1, 1];
      const otherSize = block.size || [1, 1, 1];
      const dx = Math.abs(movedBlock.position.x - block.position.x);
      const dz = Math.abs(movedBlock.position.z - block.position.z);

      const minDistanceX = (blockSize[0] + otherSize[0]) / 2;
      const minDistanceZ = (blockSize[2] + otherSize[2]) / 2;

      return dx < minDistanceX && dz < minDistanceZ;
    });

    // 스택 해제된 블록들 찾기
    const unstackedBlocks = previouslyStackedBlocks.filter((prevBlock) => {
      return !overlappingBlocks.some(
        (newBlock) => newBlock.id === prevBlock.id
      );
    });

    console.log("🔍 스택킹 상태 변화:", {
      movedBlock: movedBlockId.substring(0, 8),
      previouslyStacked: previouslyStackedBlocks.map((b) => ({
        id: b.id.substring(0, 8),
        type: b.type,
      })),
      currentlyOverlapping: overlappingBlocks.map((b) => ({
        id: b.id.substring(0, 8),
        type: b.type,
      })),
      unstacked: unstackedBlocks.map((b) => ({
        id: b.id.substring(0, 8),
        type: b.type,
      })),
    });

    // 스택 해제된 블록들과의 연결 해제
    if (unstackedBlocks.length > 0 && onDeleteConnection) {
      unstackedBlocks.forEach((unstackedBlock) => {
        // 이동된 블록과 스택 해제된 블록 간의 연결 찾기
        const connectionsToDelete = connections.filter(
          (conn) =>
            (conn.fromBlockId === movedBlockId &&
              conn.toBlockId === unstackedBlock.id) ||
            (conn.fromBlockId === unstackedBlock.id &&
              conn.toBlockId === movedBlockId)
        );

        connectionsToDelete.forEach((conn) => {
          onDeleteConnection(conn.id);
          console.log("🔗 스택 해제로 인한 연결 삭제:", {
            connectionId: conn.id.substring(0, 8),
            from: conn.fromBlockId.substring(0, 8),
            to: conn.toBlockId.substring(0, 8),
          });
        });
      });
    }

    // 새로운 위치에서 올바르지 않은 스택킹 감지
    if (overlappingBlocks.length > 0) {
      const sortedBlocks = [movedBlock, ...overlappingBlocks].sort(
        (a, b) => a.position.y - b.position.y
      );

      // 스택킹 규칙 위반 확인
      for (let i = 1; i < sortedBlocks.length; i++) {
        const upperBlock = sortedBlocks[i];
        const lowerBlock = sortedBlocks[i - 1];

        if (!canStack(upperBlock.type, lowerBlock.type)) {
          console.log("⚠️ 잘못된 스택킹 감지:", {
            upper: { id: upperBlock.id.substring(0, 8), type: upperBlock.type },
            lower: { id: lowerBlock.id.substring(0, 8), type: lowerBlock.type },
          });

          // 잘못된 스택킹인 경우 해당 블록들 간의 연결 해제
          if (onDeleteConnection) {
            const invalidConnections = connections.filter(
              (conn) =>
                (conn.fromBlockId === upperBlock.id &&
                  conn.toBlockId === lowerBlock.id) ||
                (conn.fromBlockId === lowerBlock.id &&
                  conn.toBlockId === upperBlock.id)
            );

            invalidConnections.forEach((conn) => {
              onDeleteConnection(conn.id);
              console.log("🔗 잘못된 스택킹으로 인한 연결 삭제:", {
                connectionId: conn.id.substring(0, 8),
                from: conn.fromBlockId.substring(0, 8),
                to: conn.toBlockId.substring(0, 8),
              });
            });
          }
        }
      }
    }
  };

  // 마우스 휠로 선택된 블록 크기 조절
  const handleWheel = (event: React.WheelEvent) => {
    if (selectedBlockId && (event.shiftKey || event.ctrlKey)) {
      event.preventDefault();

      const selectedBlock = droppedBlocks.find(
        (block) => block.id === selectedBlockId
      );
      if (
        selectedBlock &&
        ["vpc", "subnet"].includes(selectedBlock.type) &&
        selectedBlock.size
      ) {
        const delta = event.deltaY > 0 ? -0.2 : 0.2;
        const newSize: [number, number, number] = [...selectedBlock.size];

        if (event.shiftKey) {
          // Shift + 휠: 전체 크기 조절 (가로, 세로만)
          newSize[0] = Math.max(1, Math.min(20, newSize[0] + delta));
          newSize[2] = Math.max(1, Math.min(20, newSize[2] + delta));
        } else if (event.ctrlKey) {
          // Ctrl + 휠: 높이만 조절
          newSize[1] = Math.max(0.1, Math.min(2, newSize[1] + delta * 0.1));
        }

        onBlockResize?.(selectedBlockId, newSize);
      }
    }
  };
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);

    // 드래그 미리보기 처리 - currentDragData 사용
    if (currentDragData) {
      console.log("🎯 DragOver with currentDragData:", currentDragData);

      // 캔버스 내 드래그 위치 계산
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 50;
      const z = ((event.clientY - rect.top) / rect.height - 0.5) * 50;

      // 격자에 스냅 - 유틸리티 함수 사용으로 일관성 보장
      let snappedX = snapToGrid(x);
      let snappedZ = snapToGrid(z);

      // 블록 높이 계산
      const getBlockHeight = (
        blockType: string,
        size?: [number, number, number]
      ) => {
        if (blockType === "vpc" || blockType === "subnet") {
          return size?.[1] || 0.2;
        }
        return size?.[1] || 1;
      };

      const getBlockYPosition = (
        blockType: string,
        size?: [number, number, number]
      ) => {
        const blockHeight = getBlockHeight(blockType, size);
        if (blockType === "vpc" || blockType === "subnet") {
          return blockHeight / 2;
        }
        return blockHeight / 2 + 0.1;
      };

      let y = getBlockYPosition(currentDragData.id, currentDragData.size);

      // 해당 위치의 기존 블록 확인 - 유틸리티 함수 사용으로 일관성 보장
      const blocksAtPosition = droppedBlocks.filter((block) =>
        arePositionsOnSameGrid(
          new Vector3(block.position.x, 0, block.position.z),
          new Vector3(snappedX, 0, snappedZ)
        )
      );

      if (blocksAtPosition.length > 0) {
        // 멀티 subnet 프리뷰 처리
        if (currentDragData.id === "subnet") {
          const vpcInPosition = blocksAtPosition.find(
            (block) => block.type === "vpc"
          );
          if (vpcInPosition) {
            const existingSubnets = blocksAtPosition.filter(
              (block) => block.type === "subnet"
            );

            // 최적 위치 계산
            const optimalPos = findOptimalSubnetPosition(
              vpcInPosition,
              existingSubnets,
              snappedX,
              snappedZ,
              currentDragData.size
            );

            snappedX = optimalPos.x;
            snappedZ = optimalPos.z;

            // VPC 위의 subnet 높이
            const vpcHeight = getBlockHeight("vpc", vpcInPosition.size);
            const subnetHeight = getBlockHeight("subnet", currentDragData.size);
            y =
              vpcInPosition.position.y +
              vpcHeight / 2 +
              subnetHeight / 2 +
              0.02;

            console.log("🎯 PREVIEW Subnet 최적 위치:", {
              vpcId: vpcInPosition.id.substring(0, 8),
              existingSubnets: existingSubnets.length,
              optimizedPos: {
                x: snappedX.toFixed(3),
                y: y.toFixed(3),
                z: snappedZ.toFixed(3),
              },
            });
          } else {
            // VPC가 없으면 일반 스택킹 처리
            const sortedBlocks = blocksAtPosition.sort(
              (a, b) => a.position.y - b.position.y
            );
            const topBlock = sortedBlocks[sortedBlocks.length - 1];
            const topBlockHeight = getBlockHeight(topBlock.type, topBlock.size);
            const topBlockTop = topBlock.position.y + topBlockHeight / 2;
            const newBlockHeight = getBlockHeight(
              currentDragData.id,
              currentDragData.size
            );
            y = topBlockTop + newBlockHeight / 2;
          }
        } else {
          // 일반 블록 스택킹 처리
          const sortedBlocks = blocksAtPosition.sort(
            (a, b) => a.position.y - b.position.y
          );
          const topBlock = sortedBlocks[sortedBlocks.length - 1];
          const topBlockHeight = getBlockHeight(topBlock.type, topBlock.size);
          const topBlockTop = topBlock.position.y + topBlockHeight / 2;
          const newBlockHeight = getBlockHeight(
            currentDragData.id,
            currentDragData.size
          );
          y = topBlockTop + newBlockHeight / 2;
        }
      }

      const position = new Vector3(snappedX, y, snappedZ);
      console.log(
        "🎯 Calling onDragPreview with position:",
        position,
        "blockData:",
        currentDragData
      );
      onDragPreview?.(position, currentDragData);
    } else {
      // 폴백: 기존 방식 시도
      try {
        const blockData = JSON.parse(
          event.dataTransfer.getData("application/json")
        );
        if (blockData && blockData.id) {
          console.log("🎯 DragOver fallback blockData:", blockData);

          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;

          const x = ((event.clientX - rect.left) / rect.width - 0.5) * 50;
          const z = ((event.clientY - rect.top) / rect.height - 0.5) * 50;
          const snappedX = snapToGrid(x);
          const snappedZ = snapToGrid(z);

          const position = new Vector3(snappedX, 0.5, snappedZ);
          onDragPreview?.(position, blockData);
        }
      } catch (error) {
        console.log("❌ DragOver fallback error:", error);
      }
    }
  };

  // 멀티 subnet을 위한 최적 위치 찾기 함수
  const findOptimalSubnetPosition = (
    vpcBlock: DroppedBlock,
    existingSubnets: DroppedBlock[],
    targetX: number,
    targetZ: number,
    newSubnetSize: [number, number, number]
  ) => {
    const vpcSize = vpcBlock.size || [4, 1, 4];
    const subnetSize = newSubnetSize || [2, 0.5, 2];

    // VPC 경계 계산 (여유 공간 포함) - 서브넷이 더 넓게 배치될 수 있도록 경계 확장
    const vpcBounds = {
      minX: vpcBlock.position.x - vpcSize[0] / 2 + subnetSize[0] / 3,
      maxX: vpcBlock.position.x + vpcSize[0] / 2 - subnetSize[0] / 3,
      minZ: vpcBlock.position.z - vpcSize[2] / 2 + subnetSize[2] / 3,
      maxZ: vpcBlock.position.z + vpcSize[2] / 2 - subnetSize[2] / 3,
    };

    console.log("🏗️ VPC 경계 및 제약:", {
      vpcCenter: { x: vpcBlock.position.x, z: vpcBlock.position.z },
      vpcSize,
      subnetSize,
      bounds: vpcBounds,
      targetPosition: { x: targetX, z: targetZ },
    });

    // 목표 위치를 VPC 내부로 제한
    let candidateX = Math.max(
      vpcBounds.minX,
      Math.min(vpcBounds.maxX, targetX)
    );
    let candidateZ = Math.max(
      vpcBounds.minZ,
      Math.min(vpcBounds.maxZ, targetZ)
    );

    // 기존 subnet들과의 최소 거리 - 더 작게 설정하여 서브넷들이 더 가까이 배치될 수 있게 함
    const minDistance = Math.max(subnetSize[0], subnetSize[2]) * 0.7;

    // 충돌 체크 및 위치 조정
    let maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      let hasCollision = false;

      // 기존 subnet들과의 거리 확인
      for (const existingSubnet of existingSubnets) {
        const distance = Math.sqrt(
          Math.pow(candidateX - existingSubnet.position.x, 2) +
          Math.pow(candidateZ - existingSubnet.position.z, 2)
        );

        if (distance < minDistance) {
          hasCollision = true;
          console.log("⚠️ Subnet 충돌 감지:", {
            candidatePos: {
              x: candidateX.toFixed(3),
              z: candidateZ.toFixed(3),
            },
            existingPos: {
              x: existingSubnet.position.x.toFixed(3),
              z: existingSubnet.position.z.toFixed(3),
            },
            distance: distance.toFixed(3),
            minDistance: minDistance.toFixed(3),
          });
          break;
        }
      }

      if (!hasCollision) {
        console.log("✅ 적절한 Subnet 위치 발견:", {
          x: candidateX.toFixed(3),
          z: candidateZ.toFixed(3),
          attempts,
        });
        break;
      }

      // 충돌이 있으면 다른 위치 시도
      const angle = (attempts * Math.PI * 2) / 8 + Math.random() * 0.5;
      // 더 작은 반경으로 시작하여 서브넷이 VPC 안에 더 많이 배치될 수 있게 함
      const radius = minDistance * (0.8 + attempts * 0.15);

      candidateX = vpcBlock.position.x + Math.cos(angle) * radius;
      candidateZ = vpcBlock.position.z + Math.sin(angle) * radius;

      // VPC 경계 내로 재조정
      candidateX = Math.max(
        vpcBounds.minX,
        Math.min(vpcBounds.maxX, candidateX)
      );
      candidateZ = Math.max(
        vpcBounds.minZ,
        Math.min(vpcBounds.maxZ, candidateZ)
      );

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.warn("⚠️ 최대 시도 횟수 도달, 기본 위치 사용");
      candidateX = vpcBlock.position.x;
      candidateZ = vpcBlock.position.z;
    }

    return { x: candidateX, z: candidateZ };
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    onDragPreviewEnd?.();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    onDragPreviewEnd?.();

    try {
      const blockData = JSON.parse(
        event.dataTransfer.getData("application/json")
      );

      // 캔버스 내 드롭 위치 계산
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 50; // 격자 크기에 맞춰 조정 (50x50)
      const z = ((event.clientY - rect.top) / rect.height - 0.5) * 50;

      // 격자에 정확한 스냅 - 유틸리티 함수 사용으로 일관성 보장
      let snappedX = snapToGrid(x);
      let snappedZ = snapToGrid(z);

      // 블록 높이 계산 함수
      const getBlockHeight = (
        blockType: string,
        size?: [number, number, number]
      ) => {
        if (blockType === "vpc" || blockType === "subnet") {
          return size?.[1] || 0.2; // foundation 블록들은 얇음
        }
        return size?.[1] || 1; // 일반 블록들
      };

      // 블록 Y 위치 계산 (블록의 중심점 기준)
      const getBlockYPosition = (
        blockType: string,
        size?: [number, number, number]
      ) => {
        const blockHeight = getBlockHeight(blockType, size);
        if (blockType === "vpc" || blockType === "subnet") {
          return blockHeight / 2; // 바닥에서 블록 높이의 절반만큼 위 (중심점)
        }
        return blockHeight / 2 + 0.1; // 일반 블록들은 약간 위
      };

      // 해당 위치의 기존 블록 확인 - 드래그 미리보기와 동일한 로직 사용
      let y = getBlockYPosition(blockData.id, blockData.size);

      // 블록 크기 정보
      const blockSizes = {
        vpc: [4, 0.2, 4] as [number, number, number],
        subnet: [3, 0.3, 3] as [number, number, number],
        ec2: [1, 1.5, 1] as [number, number, number],
        volume: [0.8, 0.8, 0.8] as [number, number, number],
        "security-group": [1, 2, 1] as [number, number, number],
        "load-balancer": [2, 1, 1] as [number, number, number],
      };

      const blockSize = blockData.size ||
        blockSizes[blockData.id as keyof typeof blockSizes] || [1, 1, 1];

      // 충돌 검사 및 스택킹 위치 계산 (미리보기와 동일한 로직)
      let hasCollision = false;
      const overlappingBlocks: typeof droppedBlocks = [];

      // 스태킹 규칙 정의 - 더 정교한 규칙
      const canStack = (upperType: string, lowerType: string) => {
        const stackingRules: Record<string, string[]> = {
          vpc: [], // VPC는 바닥에만 배치 가능
          subnet: ["vpc"], // Subnet은 VPC 위에만 배치 가능
          ec2: ["subnet", "volume"], // EC2는 Subnet 위 또는 EBS Volume(부트볼륨) 위에 배치 가능
          "security-group": ["subnet", "ec2", "volume"], // Security Group은 Subnet, EC2, 또는 Volume 위에 배치 가능
          "load-balancer": ["subnet"], // Load Balancer는 Subnet 위에만 배치 가능
          volume: ["subnet"], // EBS Volume은 Subnet 위에 배치 가능
        };
        console.log("🔍 DROP 스태킹 규칙 검사:", {
          upperType,
          lowerType,
          canStack: stackingRules[upperType]?.includes(lowerType),
        });
        return stackingRules[upperType]?.includes(lowerType) || false;
      };

      // 스택 유효성 검사 함수 - 멀티 subnet 지원 대폭 개선
      const isValidStack = (
        newBlockType: string,
        stackBlocks: typeof droppedBlocks
      ) => {
        if (stackBlocks.length === 0) {
          // 빈 위치에서는 VPC만 바닥에 배치 가능
          return {
            valid: newBlockType === "vpc",
            insertIndex: 0,
            sortedStack: [],
          };
        }

        // 스택을 Y 위치 기준으로 정렬 (아래부터 위로)
        const sortedStack = [...stackBlocks].sort(
          (a, b) => a.position.y - b.position.y
        );

        console.log(
          "🔍 DROP 현재 스택 상태:",
          sortedStack.map((b) => ({
            type: b.type,
            id: b.id,
            y: b.position.y.toFixed(3),
          }))
        );

        // 특별 처리: 여러 subnet이 같은 VPC 위에 스택되는 경우
        if (newBlockType === "subnet") {
          const vpcInStack = sortedStack.find((block) => block.type === "vpc");
          if (vpcInStack) {
            console.log(
              "🏗️ Subnet 멀티 스택킹 처리 - VPC 발견:",
              vpcInStack.id
            );

            // VPC 위의 모든 subnet 찾기
            const subnetsOnVpc = sortedStack.filter(
              (block) =>
                block.type === "subnet" &&
                Math.abs(
                  block.position.y -
                  (vpcInStack.position.y +
                    getBlockHeight("vpc", vpcInStack.size) / 2 +
                    getBlockHeight("subnet", blockSize) / 2)
                ) < 0.1
            );

            console.log("🔢 VPC 위의 기존 subnet 개수:", subnetsOnVpc.length);

            // VPC 바로 위에 새 subnet 배치 허용 (여러 개 가능)
            const insertIndex =
              sortedStack.findIndex((block) => block.type === "vpc") + 1;

            return {
              valid: true,
              insertIndex: insertIndex,
              sortedStack,
              isMultiSubnet: true,
              subnetCount: subnetsOnVpc.length,
              vpcBlock: vpcInStack,
              existingSubnets: subnetsOnVpc,
            };
          }
        }

        // 새 블록이 들어갈 위치 결정 (기존 로직)
        let insertIndex = -1;
        let canPlaceHere = false;

        // 각 위치에서 스택킹 가능성 검사 (아래부터 위로)
        for (let i = 0; i <= sortedStack.length; i++) {
          let valid = true;

          if (i === 0) {
            // 맨 아래 (바닥) 배치 - VPC만 가능
            valid = newBlockType === "vpc";
          } else {
            // 기존 블록 위에 배치 - 아래 블록과의 스택킹 규칙 확인
            const lowerBlock = sortedStack[i - 1];
            valid = canStack(newBlockType, lowerBlock.type);
          }

          // 위쪽에 기존 블록이 있다면, 그 블록이 새 블록 위에 올 수 있는지 확인
          if (valid && i < sortedStack.length) {
            const upperBlock = sortedStack[i];
            valid = canStack(upperBlock.type, newBlockType);
          }

          if (valid) {
            insertIndex = i;
            canPlaceHere = true;
            break; // 첫 번째 유효한 위치에서 배치
          }
        }

        console.log("🔍 DROP 스택 유효성 검사:", {
          newBlockType,
          stackSize: sortedStack.length,
          insertIndex,
          canPlace: canPlaceHere,
          stack: sortedStack.map((b) => ({ type: b.type, y: b.position.y })),
        });

        return { valid: canPlaceHere, insertIndex, sortedStack };
      };

      // 먼저 겹치는 모든 블록을 찾습니다
      for (const block of droppedBlocks) {
        const otherSize = block.size || [1, 1, 1];
        const dx = Math.abs(snappedX - block.position.x);
        const dz = Math.abs(snappedZ - block.position.z);

        const minDistanceX = (blockSize[0] + otherSize[0]) / 2;
        const minDistanceZ = (blockSize[2] + otherSize[2]) / 2;

        // 블록이 겹치는지 확인
        if (dx < minDistanceX && dz < minDistanceZ) {
          overlappingBlocks.push(block);
        }
      }

      console.log(
        "🔍 겹치는 블록들:",
        overlappingBlocks.map((b) => ({
          id: b.id,
          type: b.type,
          y: b.position.y,
        }))
      );

      // 겹치는 블록이 있는 경우 전체 스택 검사
      if (overlappingBlocks.length > 0) {
        const stackValidation = isValidStack(blockData.id, overlappingBlocks);

        if (stackValidation.valid) {
          console.log("✅ DROP 스택 배치 허용:", blockData.id);

          // 멀티 subnet 특별 처리 - 대폭 개선
          if (stackValidation.isMultiSubnet && blockData.id === "subnet") {
            const vpcBlock = stackValidation.vpcBlock;
            const existingSubnets = stackValidation.existingSubnets || [];

            if (vpcBlock) {
              const vpcHeight = getBlockHeight("vpc", vpcBlock.size);
              const subnetHeight = getBlockHeight("subnet", blockSize);

              // VPC 바로 위에 배치 (모든 subnet은 같은 Y 레벨)
              y = vpcBlock.position.y + vpcHeight / 2 + subnetHeight / 2 + 0.02;

              console.log("🏗️ 멀티 Subnet 배치 시작:", {
                vpcPosition: { x: vpcBlock.position.x, z: vpcBlock.position.z },
                existingSubnetCount: existingSubnets.length,
                newSubnetY: y.toFixed(3),
              });

              // 기존 subnet들과 겹치지 않는 최적 위치 찾기
              let bestPosition = findOptimalSubnetPosition(
                vpcBlock,
                existingSubnets,
                snappedX,
                snappedZ,
                blockSize
              );

              snappedX = bestPosition.x;
              snappedZ = bestPosition.z;

              console.log("🎯 Subnet 최적 위치 결정:", {
                originalX: x.toFixed(3),
                originalZ: z.toFixed(3),
                optimizedX: snappedX.toFixed(3),
                optimizedZ: snappedZ.toFixed(3),
                existingSubnets: existingSubnets.map((s) => ({
                  id: s.id.substring(0, 8),
                  x: s.position.x.toFixed(3),
                  z: s.position.z.toFixed(3),
                })),
              });
            }
          }
          // Y 위치 계산 - 스택 중간 삽입 지원 (기존 로직)
          else if (stackValidation.insertIndex === 0) {
            // 맨 아래 배치 (VPC만 가능)
            y = getBlockYPosition(blockData.id, blockSize);

            // 위쪽 블록들의 Y 위치 재계산 (새 블록으로 인해 위로 밀려남)
            if (stackValidation.sortedStack.length > 0) {
              console.log("📏 DROP 위쪽 블록들의 Y 위치 재계산 필요");
              // Note: 실제 구현에서는 위쪽 블록들의 위치를 업데이트해야 함
            }
          } else {
            // 기존 블록들 사이/위에 배치
            const lowerBlock =
              stackValidation.sortedStack[stackValidation.insertIndex - 1];
            const lowerBlockHeight = getBlockHeight(
              lowerBlock.type,
              lowerBlock.size
            );
            const newBlockHeight = getBlockHeight(blockData.id, blockSize);

            // 아래 블록 위쪽에 새 블록 배치
            y =
              lowerBlock.position.y +
              lowerBlockHeight / 2 +
              newBlockHeight / 2 +
              0.01;

            // 위쪽 블록들이 있다면 Y 위치 재계산 필요
            if (
              stackValidation.insertIndex < stackValidation.sortedStack.length
            ) {
              console.log(
                "📏 DROP 위쪽 블록들의 Y 위치 재계산 필요 (중간 삽입)"
              );
              // Note: 실제 구현에서는 위쪽 블록들의 위치를 업데이트해야 함
            }
          }

          console.log("🔄 DROP 다중 블록 스태킹:", {
            newBlockType: blockData.id,
            insertIndex: stackValidation.insertIndex,
            stackSize: stackValidation.sortedStack.length,
            isMultiSubnet: stackValidation.isMultiSubnet,
            newY: y.toFixed(3),
            newX: snappedX.toFixed(3),
            newZ: snappedZ.toFixed(3),
            stack: stackValidation.sortedStack.map((b) => ({
              type: b.type,
              id: b.id.substring(0, 8),
              y: b.position.y.toFixed(3),
            })),
          });
        } else {
          console.log("❌ DROP 스택 배치 불가능:", blockData.id);
          hasCollision = true;
        }
      } else {
        // 겹치는 블록이 없는 경우
        if (blockData.id === "vpc") {
          // VPC는 바닥에 배치 가능
          y = getBlockYPosition(blockData.id, blockSize);
          console.log("📍 VPC를 바닥에 배치:", {
            blockType: blockData.id,
            yPosition: y,
          });
        } else {
          // 다른 블록들은 바닥에 직접 배치 불가
          console.log("❌ DROP 바닥 배치 불가능 (VPC가 아님):", blockData.id);
          hasCollision = true;
        }
      }

      // 충돌이 있으면 드롭 취소
      if (hasCollision) {
        console.error("❌ 드롭 취소: 스택킹 불가능한 위치");
        return;
      }

      const position = new Vector3(snappedX, y, snappedZ);

      onBlockDrop?.(blockData, position);
      console.log("Block dropped:", blockData, "at position:", position);
    } catch (error) {
      console.error("Error parsing dropped data:", error);
    }
  };

  return (
    <div
      ref={canvasRef}
      style={{ height: "100%", width: "100%", position: "relative" }}
      className={`bg-gray-100 ${isDragOver ? "drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onWheel={handleWheel}
      onClick={() => {
        // 캔버스 빈 공간 클릭 시 핸들러 호출
        onCanvasClick?.();
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [15, 15, 15], fov: 60 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        className="three-canvas"
        onContextMenu={(e) => e.preventDefault()} // 브라우저 기본 컨텍스트 메뉴 방지
        onPointerDown={(e) => {
          // 빈 공간 클릭 감지 - 블록이나 연결선이 아닌 배경 클릭
          if (e.target === e.currentTarget) {
            onCanvasClick?.();
          }
        }}
      >
        {/* 조명 시스템 개선 */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight
          position={[10, 15, 5]}
          intensity={0.8}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        {/* 추가 보조 조명 */}
        <directionalLight
          position={[-10, 10, -5]}
          intensity={0.3}
          color="#e0f2fe"
        />
        {/* 바닥 반사광 */}
        <directionalLight
          position={[0, -5, 0]}
          intensity={0.2}
          color="#fef3c7"
        />
        {/* 격자 */}
        <Grid
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.3}
          cellColor="#666666"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#999999"
          fadeDistance={50}
          infiniteGrid
        />
        {/* 빈 공간 클릭 감지를 위한 투명한 평면 */}
        <mesh
          position={[0, -0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onCanvasClick?.();
          }}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* 배치된 블록들 렌더링 */}
        {droppedBlocks.map((block) => {
          const blockColors = {
            vpc: "#3b82f6",
            subnet: "#10b981",
            ec2: "#f97316",
            volume: "#8b5cf6",
            "security-group": "#ef4444",
            "load-balancer": "#eab308",
          };

          const blockSizes = {
            vpc: [4, 0.2, 4] as [number, number, number],
            subnet: [3, 0.3, 3] as [number, number, number],
            ec2: [1, 1.5, 1] as [number, number, number],
            volume: [0.8, 0.8, 0.8] as [number, number, number],
            "security-group": [1, 2, 1] as [number, number, number],
            "load-balancer": [2, 1, 1] as [number, number, number],
          };

          // 스택 정보 계산 (0.5 단위 스냅에 맞춰 위치 비교)
          const snapSize = 0.5;
          const blocksAtSamePosition = droppedBlocks.filter(
            (otherBlock) =>
              otherBlock.id !== block.id &&
              Math.round(otherBlock.position.x / snapSize) * snapSize ===
              Math.round(block.position.x / snapSize) * snapSize &&
              Math.round(otherBlock.position.z / snapSize) * snapSize ===
              Math.round(block.position.z / snapSize) * snapSize
          );

          const isStacked = blocksAtSamePosition.length > 0;

          // 스택 레벨 계산 (Y 위치 기준으로 정렬하여 순서 결정)
          const allBlocksAtPosition = [block, ...blocksAtSamePosition].sort(
            (a, b) => a.position.y - b.position.y
          );
          const stackLevel = allBlocksAtPosition.findIndex(
            (b) => b.id === block.id
          );

          // EBS 역할 분석 (volume 타입만)
          const ebsRole =
            block.type === "volume"
              ? analyzeEBSRole(block, droppedBlocks, connections).role
              : "unassigned";

          return (
            <BaseBlock
              key={block.id}
              position={[block.position.x, block.position.y, block.position.z]}
              color={
                blockColors[block.type as keyof typeof blockColors] || "#6b7280"
              }
              size={
                block.size ||
                blockSizes[block.type as keyof typeof blockSizes] || [1, 1, 1]
              }
              blockType={block.type}
              ebsRole={ebsRole}
              onClick={() => {
                console.log("🔗 [CANVAS3D] Block clicked:", {
                  blockId: block.id.substring(0, 8),
                  blockType: block.type,
                  isConnecting,
                  connectingFrom: connectingFrom?.substring(0, 8),
                  isSameBlock: connectingFrom === block.id,
                });

                if (
                  isConnecting &&
                  connectingFrom &&
                  connectingFrom !== block.id
                ) {
                  // 연결 모드일 때: 연결 완료
                  console.log(
                    "🔗 [CANVAS3D] Completing connection to:",
                    block.id.substring(0, 8)
                  );
                  onConnectionComplete?.(block.id);
                } else {
                  // 일반 모드일 때: 블록 선택
                  console.log(
                    "🔗 [CANVAS3D] Normal block selection:",
                    block.id.substring(0, 8)
                  );
                  onBlockClick?.(block.id);
                }
              }}
              onRightClick={(event) => onBlockRightClick?.(block.id, event)}
              onMove={(newPosition) => handleBlockMove(block.id, newPosition)}
              onResize={(newSize) => onBlockResize?.(block.id, newSize)}
              onDragStart={() => {
                setIsBlockDragging(true);
                onBlockDragStart?.(block.id);
              }}
              onDragEnd={() => {
                setIsBlockDragging(false);
                onBlockDragEnd?.(block.id);
              }}
              onDragUpdate={(position) =>
                onBlockDragUpdate?.(block.id, position)
              }
              isSelected={selectedBlockId === block.id}
              allowDrag={true}
              isConnecting={isConnecting && connectingFrom === block.id}
              isStacked={isStacked}
              stackLevel={stackLevel}
            />
          );
        })}
        {/* 도로 연결선들 */}
        {connections.map((connection) => {
          const fromBlock = droppedBlocks.find(
            (b) => b.id === connection.fromBlockId
          );
          const toBlock = droppedBlocks.find(
            (b) => b.id === connection.toBlockId
          );

          if (!fromBlock || !toBlock) return null;

          return (
            <Road
              key={connection.id}
              connection={connection}
              fromPosition={fromBlock.position}
              toPosition={toBlock.position}
              isSelected={selectedConnectionId === connection.id}
              onClick={onConnectionClick}
            />
          );
        })}
        {/* 스택 연결선들 - 같은 위치에 있는 블록들 간의 시각적 연결 */}
        {(() => {
          const stackConnections: {
            fromBlock: DroppedBlock;
            toBlock: DroppedBlock;
            stackLevel: number;
          }[] = [];

          // 각 위치별로 블록들을 그룹화 (0.5 단위 스냅에 맞춰)
          const snapSize = 0.5;
          const positionGroups: { [key: string]: DroppedBlock[] } = {};
          droppedBlocks.forEach((block) => {
            const snappedX = Math.round(block.position.x / snapSize) * snapSize;
            const snappedZ = Math.round(block.position.z / snapSize) * snapSize;
            const posKey = `${snappedX},${snappedZ}`;
            if (!positionGroups[posKey]) {
              positionGroups[posKey] = [];
            }
            positionGroups[posKey].push(block);
          });

          // 각 그룹에서 스택된 블록들 간의 연결 생성
          Object.values(positionGroups).forEach((blocksAtPosition) => {
            if (blocksAtPosition.length > 1) {
              // Y 위치로 정렬
              const sortedBlocks = blocksAtPosition.sort(
                (a, b) => a.position.y - b.position.y
              );

              // 인접한 블록들 간의 연결 생성
              for (let i = 0; i < sortedBlocks.length - 1; i++) {
                stackConnections.push({
                  fromBlock: sortedBlocks[i],
                  toBlock: sortedBlocks[i + 1],
                  stackLevel: i,
                });
              }
            }
          });

          return stackConnections.map(({ fromBlock, toBlock, stackLevel }) => (
            <StackConnectionLine
              key={`stack-${fromBlock.id}-${toBlock.id}`}
              fromBlock={fromBlock}
              toBlock={toBlock}
              stackLevel={stackLevel}
            />
          ));
        })()}
        {/* 스택 가이드 - 드래그 중일 때 표시 */}
        {isDraggingBlock &&
          dragPosition &&
          (() => {
            const snapSize = 0.5;
            const snappedX = Math.round(dragPosition.x / snapSize) * snapSize;
            const snappedZ = Math.round(dragPosition.z / snapSize) * snapSize;

            // 드래그 중인 블록 제외하고 같은 위치의 블록들 찾기
            const blocksAtPosition = droppedBlocks.filter(
              (block) =>
                block.id !== isDraggingBlock &&
                Math.round(block.position.x / snapSize) * snapSize ===
                snappedX &&
                Math.round(block.position.z / snapSize) * snapSize === snappedZ
            );

            return blocksAtPosition.length > 0 ? (
              <StackGuide
                position={[snappedX, 0, snappedZ]}
                targetBlocks={blocksAtPosition}
                isDragging={true}
              />
            ) : null;
          })()}{" "}
        {/* 드롭 미리보기 - 드래그 오버 시 표시 */}
        {isDropPreview &&
          previewPosition &&
          previewBlockData &&
          (() => {
            console.log("🎨 Rendering DragPreview:", {
              isDropPreview,
              previewPosition,
              previewBlockData,
              blockType: previewBlockData.id,
              availableBlocks: droppedBlocks.map((b) => ({
                id: b.id,
                type: b.type,
                position: b.position,
              })),
            });

            const blockSizes = {
              vpc: [4, 0.2, 4] as [number, number, number],
              subnet: [3, 0.3, 3] as [number, number, number],
              ec2: [1, 1.5, 1] as [number, number, number],
              volume: [0.8, 0.8, 0.8] as [number, number, number],
              "security-group": [1, 2, 1] as [number, number, number],
              "load-balancer": [2, 1, 1] as [number, number, number],
            };

            const blockColors = {
              vpc: "#3b82f6",
              subnet: "#10b981",
              ec2: "#f97316",
              volume: "#8b5cf6",
              "security-group": "#ef4444",
              "load-balancer": "#eab308",
            };

            const blockSize = blockSizes[
              previewBlockData.id as keyof typeof blockSizes
            ] || [1, 1, 1];
            const blockColor =
              blockColors[previewBlockData.id as keyof typeof blockColors] ||
              "#6b7280";

            // 충돌 검사 및 스택킹 위치 계산 (0.5 단위 스냅)
            const snapSize = 0.5;
            const snappedX =
              Math.round(previewPosition.x / snapSize) * snapSize;
            const snappedZ =
              Math.round(previewPosition.z / snapSize) * snapSize;

            let hasCollision = false;
            const targetBlocks: DroppedBlock[] = [];

            // 기본 Y 위치는 나중에 계산
            let finalPreviewPosition = previewPosition.clone();

            // 블록 높이 계산 함수
            const getBlockHeight = (
              blockType: string,
              size?: [number, number, number]
            ) => {
              if (blockType === "vpc" || blockType === "subnet") {
                return size?.[1] || 0.2;
              }
              return size?.[1] || 1;
            };

            // 스태킹 규칙 정의 - DROP과 동일한 규칙
            const canStackPreview = (upperType: string, lowerType: string) => {
              const stackingRules: Record<string, string[]> = {
                vpc: [], // VPC는 바닥에만 배치 가능
                subnet: ["vpc"], // Subnet은 VPC 위에만 배치 가능
                ec2: ["subnet", "volume"], // EC2는 Subnet 위 또는 EBS Volume(부트볼륨) 위에 배치 가능
                "security-group": ["subnet", "ec2", "volume"], // Security Group은 Subnet, EC2, 또는 Volume 위에 배치 가능
                "load-balancer": ["subnet"], // Load Balancer는 Subnet 위에만 배치 가능
                volume: ["subnet"], // EBS Volume은 Subnet 위에 배치 가능
              };
              console.log("🔍 PREVIEW 스태킹 규칙 검사:", {
                upperType,
                lowerType,
                canStack: stackingRules[upperType]?.includes(lowerType),
              });
              return stackingRules[upperType]?.includes(lowerType) || false;
            };

            // 스택 유효성 검사 함수 - DROP과 동일한 로직
            const isValidStackPreview = (
              newBlockType: string,
              stackBlocks: DroppedBlock[]
            ) => {
              if (stackBlocks.length === 0) {
                return {
                  valid: newBlockType === "vpc",
                  insertIndex: 0,
                  sortedStack: [],
                };
              }

              // 스택을 Y 위치 기준으로 정렬 (아래부터 위로)
              const sortedStack = [...stackBlocks].sort(
                (a, b) => a.position.y - b.position.y
              );

              // 새 블록이 들어갈 위치 결정
              let insertIndex = -1; // 유효하지 않은 인덱스로 초기화
              let canPlaceHere = false;

              // 각 위치에서 스택킹 가능성 검사 (아래부터 위로)
              for (let i = 0; i <= sortedStack.length; i++) {
                let valid = true;

                if (i === 0) {
                  // 맨 아래 (바닥) 배치 - VPC만 가능
                  valid = newBlockType === "vpc";
                } else {
                  // 기존 블록 위에 배치 - 아래 블록과의 스택킹 규칙 확인
                  const lowerBlock = sortedStack[i - 1];
                  valid = canStackPreview(newBlockType, lowerBlock.type);
                }

                // 위쪽에 기존 블록이 있다면, 그 블록이 새 블록 위에 올 수 있는지 확인
                if (valid && i < sortedStack.length) {
                  const upperBlock = sortedStack[i];
                  valid = canStackPreview(upperBlock.type, newBlockType);
                }

                if (valid) {
                  insertIndex = i;
                  canPlaceHere = true;
                  break; // 첫 번째 유효한 위치에서 배치
                }
              }

              console.log("🔍 PREVIEW 스택 유효성 검사:", {
                newBlockType,
                stackSize: sortedStack.length,
                insertIndex,
                canPlace: canPlaceHere,
                stack: sortedStack.map((b) => ({
                  type: b.type,
                  y: b.position.y,
                })),
              });

              return { valid: canPlaceHere, insertIndex, sortedStack };
            };

            // 먼저 겹치는 모든 블록을 찾습니다
            const overlappingBlocks: DroppedBlock[] = [];

            for (const block of droppedBlocks) {
              const otherSize = block.size || [1, 1, 1];
              const dx = Math.abs(snappedX - block.position.x);
              const dz = Math.abs(snappedZ - block.position.z);

              const minDistanceX = (blockSize[0] + otherSize[0]) / 2;
              const minDistanceZ = (blockSize[2] + otherSize[2]) / 2;

              // 블록이 겹치는지 확인
              if (dx < minDistanceX && dz < minDistanceZ) {
                overlappingBlocks.push(block);
              }
            }

            console.log(
              "🔍 PREVIEW 겹치는 블록들:",
              overlappingBlocks.map((b) => ({
                id: b.id,
                type: b.type,
                y: b.position.y,
              }))
            );

            // 겹치는 블록이 있는 경우 전체 스택 검사
            if (overlappingBlocks.length > 0) {
              const stackValidation = isValidStackPreview(
                previewBlockData.id,
                overlappingBlocks
              );

              if (stackValidation.valid) {
                console.log("✅ PREVIEW 스택 배치 허용:", previewBlockData.id);

                // Y 위치 계산 - 스택 중간 삽입 지원
                if (stackValidation.insertIndex === 0) {
                  // 맨 아래 배치 (VPC만 가능)
                  const blockHeight = getBlockHeight(
                    previewBlockData.id,
                    blockSize
                  );
                  const newY =
                    blockHeight / 2 +
                    (previewBlockData.id === "vpc" ||
                      previewBlockData.id === "subnet"
                      ? 0
                      : 0.1);
                  finalPreviewPosition = new Vector3(snappedX, newY, snappedZ);

                  console.log("📏 PREVIEW 맨 아래 배치:", {
                    blockType: previewBlockData.id,
                    y: newY,
                  });
                } else {
                  // 기존 블록들 사이/위에 배치
                  const lowerBlock =
                    stackValidation.sortedStack[
                    stackValidation.insertIndex - 1
                    ];
                  const lowerBlockHeight = getBlockHeight(
                    lowerBlock.type,
                    lowerBlock.size
                  );
                  const newBlockHeight = getBlockHeight(
                    previewBlockData.id,
                    blockSize
                  );

                  // 아래 블록 위쪽에 새 블록 배치
                  const newY =
                    lowerBlock.position.y +
                    lowerBlockHeight / 2 +
                    newBlockHeight / 2 +
                    0.01;
                  finalPreviewPosition = new Vector3(snappedX, newY, snappedZ);

                  console.log("📏 PREVIEW 블록 위에 배치:", {
                    lowerBlock: lowerBlock.type,
                    lowerY: lowerBlock.position.y,
                    newBlockType: previewBlockData.id,
                    newY,
                  });
                }

                // 스택킹이 가능하므로 모든 겹치는 블록을 targetBlocks에 추가
                targetBlocks.push(...overlappingBlocks);

                console.log("🔄 PREVIEW 다중 블록 스태킹:", {
                  newBlockType: previewBlockData.id,
                  insertIndex: stackValidation.insertIndex,
                  stackSize: stackValidation.sortedStack.length,
                  newY: finalPreviewPosition.y,
                  stack: stackValidation.sortedStack.map((b) => ({
                    type: b.type,
                    y: b.position.y,
                  })),
                });
              } else {
                console.log(
                  "❌ PREVIEW 스택 배치 불가능:",
                  previewBlockData.id
                );
                hasCollision = true;
                // 충돌이 있으면 빨간색으로 표시 (기본 위치에 배치)
                const defaultY =
                  getBlockHeight(previewBlockData.id, blockSize) / 2 + 0.1;
                finalPreviewPosition = new Vector3(
                  snappedX,
                  defaultY,
                  snappedZ
                );
              }
            } else {
              // 겹치는 블록이 없는 경우
              if (previewBlockData.id === "vpc") {
                // VPC는 바닥에 배치 가능
                const blockHeight = getBlockHeight(
                  previewBlockData.id,
                  blockSize
                );
                const newY = blockHeight / 2;
                finalPreviewPosition = new Vector3(snappedX, newY, snappedZ);
                console.log("📍 PREVIEW VPC를 바닥에 배치:", {
                  blockType: previewBlockData.id,
                  yPosition: newY,
                });
              } else {
                // 다른 블록들은 바닥에 직접 배치 불가
                console.log(
                  "❌ PREVIEW 바닥 배치 불가능 (VPC가 아님):",
                  previewBlockData.id
                );
                hasCollision = true;
                // 충돌이 있으면 빨간색으로 표시 (기본 위치에 배치)
                const defaultY =
                  getBlockHeight(previewBlockData.id, blockSize) / 2 + 0.1;
                finalPreviewPosition = new Vector3(
                  snappedX,
                  defaultY,
                  snappedZ
                );
              }
            }

            // 스택킹이 가능하거나 충돌이 없으면 유효한 위치
            const isValidPosition = !hasCollision;
            const canStackBlocks = targetBlocks.length > 0 && !hasCollision;

            console.log("🎨 DragPreview props:", {
              position: finalPreviewPosition,
              blockType: previewBlockData.id,
              blockSize,
              color: blockColor,
              isValidPosition,
              canStack: canStackBlocks,
              targetBlocks: targetBlocks.length,
            });

            return (
              <DragPreview
                position={finalPreviewPosition}
                blockSize={blockSize}
                isValidPosition={isValidPosition}
                canStack={canStackBlocks}
                targetBlocks={targetBlocks}
              />
            );
          })()}
        {/* 기본 정육면체 (샘플) - 블록이 없을 때만 표시 */}
        {droppedBlocks.length === 0 && (
          <>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#3b82f6" />
            </mesh>
            <mesh position={[3, 0.5, 3]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#10b981" />
            </mesh>
            <mesh position={[-3, 0.5, -3]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          </>
        )}
        {/* 카메라 컨트롤 */}
        <OrbitControls
          enabled={!isBlockDragging} // 블록 드래그 중일 때 비활성화
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          maxDistance={100}
          minDistance={2}
          panSpeed={1.5}
          zoomSpeed={1.2}
        />
        {/* 성능 모니터 (개발용)   <Stats />*/}
      </Canvas>

      {/* 헤더 */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg z-20">
        <h3 className="text-gray-800 font-medium">3D 배치 영역</h3>
      </div>

      {/* 도움말 */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg z-20 text-sm">
        <div className="text-gray-600">
          <div className="flex items-center mb-1">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              클릭
            </span>
            <span>블록 선택 및 드래그</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              드래그
            </span>
            <span>블록 이동</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              우클릭
            </span>
            <span>속성 패널 열기</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              Shift+우클릭
            </span>
            <span>연결 모드 시작</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              Delete
            </span>
            <span>선택된 블록 삭제</span>
          </div>
          <div className="flex items-center">
            <span className="bg-gray-700 text-white px-2 py-0.5 rounded mr-2 text-xs">
              휠
            </span>
            <span>확대/축소 (50x50 격자)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
