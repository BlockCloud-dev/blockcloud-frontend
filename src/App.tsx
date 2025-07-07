import { useEffect } from "react";
import { BlockPalette } from "./components/layout/BlockPalette";
import { Canvas3D } from "./components/layout/Canvas3D";
import { CodeEditor } from "./components/layout/CodeEditor";
import { PropertiesPanel } from "./components/ui/PropertiesPanel";
import { TabHeader } from "./components/ui/TabHeader";
import { ConnectionsPanel } from "./components/ui/ConnectionsPanel";
import { Vector3 } from "three";
import type { DroppedBlock, Connection } from "./types/blocks";
import type { ProjectData } from "./utils/projectManager";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { generateTerraformCode } from "./utils/codeGenerator";
import { ResizablePanel } from "./components/ui/ResizablePanel";
import MainHeader from "./components/ui/MainHeader";

// Zustand 스토어들
import {
  useBlockStore,
  useConnectionStore,
  useUIStore,
  useProjectStore,
  useResetAllStores,
  useLoadProject
} from "./stores";

// 프로젝트 관리 유틸
import {
  saveProject,
  loadProjectFromFile,
  saveProjectToLocalStorage,
  loadProjectFromLocalStorage
} from "./utils/projectManager";
import { snapToGrid } from "./utils/snapGrid";

function App() {
  // Zustand 스토어에서 상태와 액션들 가져오기
  const {
    droppedBlocks,
    selectedBlockId,
    propertiesBlockId,
    isDraggingBlock,
    dragPosition,
    isDropPreview,
    previewPosition,
    previewBlockData,
    currentDragData,
    addBlock,
    deleteBlock,
    setSelectedBlockId,
    setPropertiesBlockId,
    setIsDraggingBlock,
    setDragPosition,
    setDropPreview,
    setCurrentDragData,
    moveBlock,
    resizeBlock,
    updateBlockProperties,
  } = useBlockStore();

  const {
    connections,
    selectedConnection,
    isConnecting,
    connectingFrom,
    setSelectedConnection,
    deleteConnection,
    deleteConnectionsForBlock,
    startConnecting,
    cancelConnecting,
    completeConnection,
    detectAndCreateStackingConnections,
  } = useConnectionStore();

  const {
    activeTab,
    generatedCode,
    setActiveTab,
    setGeneratedCode,
  } = useUIStore();

  const {
    projectName,
    currentCSP,
    setProjectName,
    setCurrentCSP,
  } = useProjectStore();

  // 헬퍼 훅들
  const resetAllStores = useResetAllStores();
  const loadProjectData = useLoadProject();

  // 스태킹 규칙 함수
  const canStack = (type1: string, type2: string) => {
    const stackingRules: { [key: string]: string[] } = {
      vpc: [], // VPC는 바닥에만 배치 가능
      subnet: ["vpc"], // Subnet은 VPC 위에만 배치 가능
      ec2: ["subnet", "volume"], // EC2는 Subnet 위 또는 EBS Volume(부트볼륨) 위에 배치 가능
      "security-group": ["subnet", "ec2", "volume"], // Security Group은 Subnet, EC2, 또는 Volume 위에 배치 가능 (더 유연함)
      "load-balancer": ["subnet"], // Load Balancer는 Subnet 위에만 배치 가능
      volume: ["subnet"], // EBS Volume은 Subnet 위에 배치 가능 (EC2 제거 - 스태킹은 부트볼륨용)
    };
    return stackingRules[type1]?.includes(type2) || false;
  };

  // 블록 변경 시 HCL 코드 자동 생성 (연결 정보 포함)
  useEffect(() => {
    const code = generateTerraformCode(droppedBlocks, connections);
    setGeneratedCode(code);
  }, [droppedBlocks, connections]);

  const handleBlockDrop = (blockData: any, position: Vector3) => {
    const blockSizes = {
      vpc: [4, 0.2, 4] as [number, number, number],
      subnet: [3, 0.3, 3] as [number, number, number],
      ec2: [1, 1.5, 1] as [number, number, number],
      volume: [0.8, 0.8, 0.8] as [number, number, number],
      "security-group": [1, 2, 1] as [number, number, number],
      "load-balancer": [2, 1, 1] as [number, number, number],
    };

    const blockSize = blockSizes[blockData.id as keyof typeof blockSizes] || [
      1, 1, 1,
    ];

    // Canvas3D에서 이미 스택킹과 충돌 검사가 완료된 위치를 그대로 사용
    const finalPosition = position;

    console.log("📦 Using calculated position from Canvas3D:", {
      blockType: blockData.id,
      position: finalPosition,
      isStacked: finalPosition.y > blockSize[1] / 2 + 0.2, // 기본 높이보다 높으면 스택킹된 것
    });

    const newBlock: DroppedBlock = {
      id: `${blockData.id}-${Date.now()}`,
      type: blockData.id,
      name: blockData.name,
      position: finalPosition,
      timestamp: Date.now(),
      properties: {
        name: blockData.name || `New ${blockData.id}`,
        description: `${blockData.name
          } created at ${new Date().toLocaleString()}`,
      },
      size: blockSize,
    };

    // 블록 유형에 따른 기본 속성 추가
    if (blockData.id === "vpc") {
      newBlock.properties.cidrBlock = "10.0.0.0/16";
      newBlock.properties.enableDnsSupport = true;
      newBlock.properties.enableDnsHostnames = true;
    } else if (blockData.id === "subnet") {
      newBlock.properties.cidrBlock = "10.0.1.0/24";
      newBlock.properties.availabilityZone = "ap-northeast-2a";
    } else if (blockData.id === "ec2") {
      newBlock.properties.instanceType = "t2.micro";
      newBlock.properties.ami = "ami-12345678";
    } else if (blockData.id === "security-group") {
      newBlock.properties.securityRules = [
        {
          type: "ingress",
          protocol: "tcp",
          fromPort: 22,
          toPort: 22,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ];
    } else if (blockData.id === "load-balancer") {
      newBlock.properties.loadBalancerType = "application";
    } else if (blockData.id === "volume") {
      newBlock.properties.volumeSize = 8;
      newBlock.properties.volumeType = "gp2";
    }

    addBlock(newBlock);
    console.log("✅ Block added to scene:", newBlock);

    // 스택킹 연결 검출
    setTimeout(() => {
      detectAndCreateStackingConnections(droppedBlocks);
    }, 50);

    console.log("📊 Total blocks:", droppedBlocks.length + 1);

    // TODO: HCL 코드 업데이트 로직 추가
  };

  const handleBlockClick = (blockId: string) => {
    console.log("🎯 Block clicked for selection:", blockId);
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
    setPropertiesBlockId(null); // 클릭으로는 속성 패널을 열지 않음
    setActiveTab("code"); // 클릭 시 코드 탭으로 전환
    setSelectedConnection(null); // 블록 선택 시 연결 선택 해제
    console.log("🔍 Block selected:", blockId);
  };

  // 블록 우클릭 시 속성 편집기를 오른쪽 패널에 표시
  const handleBlockRightClick = (blockId: string, event?: MouseEvent) => {
    console.log("🔗 [APP] handleBlockRightClick called:", {
      blockId: blockId.substring(0, 8),
      hasEvent: !!event,
      shiftKey: event?.shiftKey,
      eventType: event?.type,
    });

    // Shift + 우클릭: 연결 모드 시작 (EBS-EC2 도로 연결용)
    if (event?.shiftKey) {
      console.log(
        "🔗 [APP] Starting connection mode from block:",
        blockId.substring(0, 8)
      );
      console.log("🔗 [APP] Current connection state:", {
        isConnecting,
        connectingFrom: connectingFrom?.substring(0, 8),
      });
      startConnecting(blockId);
      return;
    }

    // 일반 우클릭: 속성 패널 표시
    console.log("🔗 [APP] Normal right click - showing properties panel");
    setSelectedBlockId(blockId);
    setPropertiesBlockId(blockId);
    setActiveTab("properties");
    console.log("📋 Block right-clicked, showing properties panel:", blockId);
  };

  const handleBlockDelete = (blockId: string) => {
    // 블록과 관련된 모든 연결 삭제
    deleteConnectionsForBlock(blockId);

    deleteBlock(blockId);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      setPropertiesBlockId(null);
      setActiveTab("code"); // 블록 삭제 시 코드 탭으로 전환
    }
    console.log("🗑️ Block deleted:", blockId);
  };

  const handleBlockPropertiesChange = (
    blockId: string,
    properties: Partial<DroppedBlock["properties"]>
  ) => {
    updateBlockProperties(blockId, properties);
    console.log("✏️ Block properties updated:", blockId, properties);
  };

  const handleBlockMove = (blockId: string, newPosition: Vector3) => {
    console.log("🎯 [APP_MOVE] ========== BLOCK MOVE START ==========");
    console.log("🎯 [APP_MOVE] Block ID:", blockId);
    console.log("🎯 [APP_MOVE] Received position from BaseBlock:", newPosition);

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

    // 블록 크기 계산 함수
    const getBlockSize = (
      blockType: string,
      customSize?: [number, number, number]
    ) => {
      if (customSize) return customSize;

      const defaultSizes: { [key: string]: [number, number, number] } = {
        vpc: [4, 0.2, 4],
        subnet: [3, 0.3, 3],
        ec2: [1, 1.5, 1],
        volume: [0.8, 0.8, 0.8],
        "security-group": [1, 2, 1],
        "load-balancer": [2, 1, 1],
      };

      return defaultSizes[blockType] || [1, 1, 1];
    };

    // 두 블록이 충돌하는지 확인하는 함수 (스택킹 허용 여부 고려)
    const isColliding = (
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

      // 겹치지만 스택킹 가능하면 충돌이 아님
      if (overlapping && canStack(blockType1, blockType2)) {
        return false;
      }

      return overlapping;
    };

    // 스택킹 위치 계산 함수
    const calculateStackingPosition = (
      targetBlock: DroppedBlock,
      movingBlockType: string,
      movingBlockSize: [number, number, number],
      currentX: number,
      currentZ: number
    ) => {
      const targetHeight = getBlockHeight(targetBlock.type, targetBlock.size);
      const movingHeight = getBlockHeight(movingBlockType, movingBlockSize);

      // 타겟 블록 위쪽에 위치 (타겟 상단 + 이동 블록 높이의 절반)
      const newY =
        targetBlock.position.y + targetHeight / 2 + movingHeight / 2 + 0.01;

      // X, Z 좌표는 현재 드래그 위치를 유지 (중앙으로 강제 이동하지 않음)
      return new Vector3(currentX, newY, currentZ);
    };

    // 빈 위치 찾기 함수
    const findEmptyPosition = (
      startX: number,
      startZ: number,
      blockSize: [number, number, number],
      blockType: string
    ) => {
      const searchRadius = 10; // 검색 반경
      const snapSize = 0.5; // 스냅 크기

      // 나선형으로 빈 위치 검색
      for (let radius = 0; radius <= searchRadius; radius += snapSize) {
        for (let angle = 0; angle < 360; angle += 30) {
          const radian = (angle * Math.PI) / 180;
          const testX =
            Math.round((startX + radius * Math.cos(radian)) / snapSize) *
            snapSize;
          const testZ =
            Math.round((startZ + radius * Math.sin(radian)) / snapSize) *
            snapSize;

          const testPosition = new Vector3(testX, 0, testZ);
          let hasCollision = false;

          // 다른 모든 블록과 충돌 검사
          for (const block of droppedBlocks) {
            if (block.id === blockId) continue; // 자기 자신 제외

            const otherSize = getBlockSize(block.type, block.size);
            if (
              isColliding(
                testPosition,
                blockSize,
                block.position,
                otherSize,
                blockType,
                block.type
              )
            ) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            return new Vector3(
              testX,
              getBlockYPosition(blockType, blockSize),
              testZ
            );
          }
        }
      }

      // 빈 위치를 찾지 못하면 원래 위치 반환
      return new Vector3(
        startX,
        getBlockYPosition(blockType, blockSize),
        startZ
      );
    };

    // 이동할 블록 찾기
    const movingBlock = droppedBlocks.find((block) => block.id === blockId);
    if (!movingBlock) {
      console.log("❌ [APP_MOVE] Block not found:", blockId);
      return;
    }

    console.log("🎯 [APP_MOVE] Moving block details:", {
      id: movingBlock.id,
      type: movingBlock.type,
      currentPosition: movingBlock.position,
    });

    // BaseBlock.tsx에서 이미 스냅된 위치를 전달받으므로 추가 스냅 처리 불필요
    // 하지만 정확한 스냅 그리드 재적용으로 부동소수점 오차 방지
    const snappedX = snapToGrid(newPosition.x);
    const snappedZ = snapToGrid(newPosition.z);
    console.log("🎯 [APP_MOVE] Position after snap:", {
      x: snappedX,
      z: snappedZ,
      originalY: newPosition.y,
    });

    const blockSize = getBlockSize(movingBlock.type, movingBlock.size);
    console.log("🎯 [APP_MOVE] Block size:", blockSize);

    // 스택킹 가능한 블록 찾기 - Canvas3D와 동일한 로직
    let stackingTarget: DroppedBlock | null = null;
    let hasCollision = false;
    const testPosition = new Vector3(snappedX, 0, snappedZ);
    const overlappingBlocks: DroppedBlock[] = [];

    // 먼저 겹치는 모든 블록을 찾습니다
    for (const block of droppedBlocks) {
      if (block.id === blockId) continue; // 자기 자신 제외

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
      "🔍 [APP_MOVE] 겹치는 블록들:",
      overlappingBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        y: b.position.y,
      }))
    );

    // 겹치는 블록이 있다면, 가장 위에 있는 블록과만 스택킹 규칙을 검사
    if (overlappingBlocks.length > 0) {
      // 가장 위에 있는 블록 찾기
      const topBlock = overlappingBlocks.reduce((highest, current) =>
        current.position.y > highest.position.y ? current : highest
      );

      console.log("🔍 [APP_MOVE] 가장 위에 있는 블록:", {
        id: topBlock.id,
        type: topBlock.type,
        y: topBlock.position.y,
      });

      // 가장 위에 있는 블록과만 스택킹 규칙 검사
      if (canStack(movingBlock.type, topBlock.type)) {
        console.log(
          "✅ [APP_MOVE] 스태킹 허용:",
          movingBlock.type,
          "on",
          topBlock.type
        );
        stackingTarget = topBlock;
      } else {
        console.log(
          "❌ [APP_MOVE] 스택킹 불가능:",
          movingBlock.type,
          "on",
          topBlock.type
        );
        hasCollision = true;
      }
    }

    let finalPosition: Vector3;

    if (stackingTarget) {
      // 스택킹 위치 계산 - 현재 드래그 위치 유지
      finalPosition = calculateStackingPosition(
        stackingTarget,
        movingBlock.type,
        blockSize,
        snappedX,
        snappedZ
      );
      console.log(
        "📚 [APP_MOVE] Stacking block on top of:",
        stackingTarget.type,
        "at position:",
        finalPosition
      );
    } else if (hasCollision) {
      // 충돌 시 빈 위치 찾기
      finalPosition = findEmptyPosition(
        snappedX,
        snappedZ,
        blockSize,
        movingBlock.type
      );
      console.log(
        "🚫 [APP_MOVE] Collision detected, moving to empty position:",
        finalPosition
      );
    } else {
      // 충돌 없으면 BaseBlock.tsx에서 전달받은 위치 그대로 사용
      finalPosition = new Vector3(snappedX, newPosition.y, snappedZ);
      console.log(
        "✅ [APP_MOVE] No collision, placing at requested position:",
        finalPosition
      );
    }

    console.log(
      "🎯 [APP_MOVE] FINAL DECISION - Block will be placed at:",
      finalPosition
    );

    console.log(
      "🎯 [APP_MOVE] Updating block state with final position:",
      finalPosition
    );

    moveBlock(blockId, finalPosition);

    // 드래그 종료 시 상태 초기화
    setIsDraggingBlock(null);
    setDragPosition(null);

    // 블록 이동 후 자동으로 스택킹 연결 검출
    setTimeout(() => {
      console.log(
        "🔄 [BlockMove] Calling detectAndCreateStackingConnections with",
        droppedBlocks.length,
        "blocks"
      );
      detectAndCreateStackingConnections(droppedBlocks);
      console.log(
        "🔄 [BlockMove] Stacking detection completed after block move"
      );

      // EBS 역할 재분석 (volume 블록이 이동되었거나 EC2 블록이 이동되었을 때)
      // TODO: EBS 역할 분석 로직을 blockStore로 이전
      if (movingBlock.type === "volume" || movingBlock.type === "ec2") {
        console.log(
          "🔄 [EBS] EBS 역할 재분석 필요하지만 임시로 비활성화 - blockStore로 이전 예정"
        );
      }
    }, 30); // 더 빠른 응답을 위해 지연 시간 단축

    console.log("🔄 [APP_MOVE] Block moved:", blockId, finalPosition);
    console.log("🎯 [APP_MOVE] ========== BLOCK MOVE END ==========");
  };

  const handleBlockDragStart = (blockId: string) => {
    setIsDraggingBlock(blockId);
    console.log("🎯 Block drag started:", blockId);
  };

  const handleBlockDragEnd = (blockId: string) => {
    setIsDraggingBlock(null);
    setDragPosition(null);
    console.log("🎯 Block drag ended:", blockId);
  };

  const handleBlockDragUpdate = (blockId: string, position: Vector3) => {
    if (isDraggingBlock === blockId) {
      setDragPosition(position);
    }
  };

  const handleBlockResize = (
    blockId: string,
    newSize: [number, number, number]
  ) => {
    resizeBlock(blockId, newSize);
    console.log("📏 Block resized:", blockId, newSize);
  };

  // 연결 관련 핸들러들
  const handleConnectionComplete = (toBlockId: string) => {
    const success = completeConnection(toBlockId);
    if (success) {
      console.log("🔗 Connection created");
    } else {
      console.log("❌ Connection failed");
    }
  };

  const handleConnectionClick = (connection: any) => {
    setSelectedConnection(connection);
    setSelectedBlockId(null); // 블록 선택 해제
    setPropertiesBlockId(null);
    setActiveTab("code"); // 연결 선택 시 코드 탭으로 전환
    console.log("🔗 Connection selected:", connection.id);
  };

  // 새로운 연결 관련 핸들러들
  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
    setActiveTab("connections"); // 연결 탭으로 전환
  };

  const handleConnectionDelete = (connectionId: string) => {
    deleteConnection(connectionId);
    console.log("🗑️ Connection deleted:", connectionId);
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab: "connections" | "code" | "properties") => {
    setActiveTab(tab);
  };

  // 프로젝트 관리 핸들러
  const handleLoadProject = (projectData: ProjectData) => {
    loadProjectData(projectData);
    console.log(
      "🔄 Project loaded:",
      projectData.name,
      "with",
      projectData.blocks.length,
      "blocks and",
      projectData.connections.length,
      "connections"
    );
  };

  const handleNewProject = () => {
    resetAllStores();
    console.log("🆕 New project created");
  };

  const handleSaveProject = () => {
    if (droppedBlocks.length === 0) {
      alert('저장할 블록이 없습니다.');
      return;
    }

    const projectData = saveProject(
      projectName,
      droppedBlocks,
      connections,
      `${currentCSP} 인프라 프로젝트`
    );

    // localStorage에 저장
    const key = `project_${Date.now()}`;
    if (saveProjectToLocalStorage(projectData, key)) {
      alert('프로젝트가 저장되었습니다.');
    } else {
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  const handleQuickLoadProject = () => {
    // 가장 최근 저장된 프로젝트 로드
    const recentProject = loadProjectFromLocalStorage('current_project');
    if (recentProject) {
      handleLoadProject(recentProject);
      alert('프로젝트가 로드되었습니다.');
    } else {
      // 파일 로드 다이얼로그 열기
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const projectData = await loadProjectFromFile(file);
            handleLoadProject(projectData);
            alert('프로젝트가 로드되었습니다.');
          } catch (error) {
            alert('프로젝트 파일을 로드할 수 없습니다: ' + (error as Error).message);
          }
        }
      };
      input.click();
    }
  };

  // 키보드 단축키 활성화
  useKeyboardShortcuts({
    onDelete: () => {
      if (selectedBlockId) {
        handleBlockDelete(selectedBlockId);
      }
    },
    onEscape: () => {
      setSelectedBlockId(null);
      setPropertiesBlockId(null);
      setActiveTab("code"); // ESC 키로 선택 해제 시 코드 탭으로 전환
    },
    onResize: (axis, delta) => {
      if (selectedBlockId) {
        const selectedBlock = droppedBlocks.find(
          (block) => block.id === selectedBlockId
        );
        if (
          selectedBlock &&
          ["vpc", "subnet"].includes(selectedBlock.type) &&
          selectedBlock.size
        ) {
          const newSize: [number, number, number] = [...selectedBlock.size];

          // 축에 따라 크기 조절
          if (axis === "width") {
            newSize[0] = Math.max(1, Math.min(20, newSize[0] + delta));
          } else if (axis === "height") {
            newSize[1] = Math.max(0.1, Math.min(2, newSize[1] + delta));
          } else if (axis === "depth") {
            newSize[2] = Math.max(1, Math.min(20, newSize[2] + delta));
          }

          handleBlockResize(selectedBlockId, newSize);
        }
      }
    },
    onNewProject: handleNewProject,
    onToggleTab: handleTabChange,
  });

  // 드래그 미리보기 핸들러 함수들
  const handleDragPreview = (position: Vector3, blockData: any) => {
    console.log("📱 App handleDragPreview called:", position, blockData);
    setDropPreview(true, position, blockData);
  };

  const handleDragPreviewEnd = () => {
    console.log("📱 App handleDragPreviewEnd called");
    setDropPreview(false);
  };

  // 팔레트 드래그 핸들러
  const handlePaletteDragStart = (blockData: any) => {
    console.log("🎯 Palette drag start:", blockData);
    setCurrentDragData(blockData);
  };

  const handlePaletteDragEnd = () => {
    console.log("🎯 Palette drag end");
    setCurrentDragData(null);
    handleDragPreviewEnd();
  };

  // 캔버스 빈 공간 클릭 핸들러
  const handleCanvasClick = () => {
    setSelectedBlockId(null);
    setPropertiesBlockId(null);
    setActiveTab("code"); // 빈 공간 클릭 시 코드 탭으로 전환
    console.log("📋 Canvas background clicked, clearing selection");
  };

  return (
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
      {/* 메인 헤더 */}
      <MainHeader
        projectName={projectName}
        onProjectNameChange={(newName) => setProjectName(newName)}
        currentCSP={currentCSP}
        onCSPChange={setCurrentCSP}
        isSaved={true}
        onNewProject={handleNewProject}
        onLoadProject={handleQuickLoadProject}
        onSaveProject={handleSaveProject}
        userName="홍길동"
        userImageUrl="/my-profile.jpg"
      />

      {/* 메인 3-Panel 레이아웃 */}
      <div className="flex-1 flex flex-row h-[calc(100vh-120px)] min-w-0">
        {/* 왼쪽 패널 */}
        <ResizablePanel side="left" initialWidth={320}>
          <div className="h-full w-full bg-gray-50 px-4 py-4 overflow-auto">
            <BlockPalette
              selectedCSP={currentCSP}
              onCSPChange={setCurrentCSP}
              onDragStart={handlePaletteDragStart}
              onDragEnd={handlePaletteDragEnd}
            />
          </div>
        </ResizablePanel>

        {/* 중앙 패널 */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-gray-300">
          <Canvas3D
            onBlockDrop={handleBlockDrop}
            onBlockClick={handleBlockClick}
            onBlockRightClick={handleBlockRightClick}
            onBlockDelete={handleBlockDelete}
            onBlockMove={handleBlockMove}
            onBlockResize={handleBlockResize}
            onBlockPropertiesChange={handleBlockPropertiesChange}
            onBlockDragStart={handleBlockDragStart}
            onBlockDragEnd={handleBlockDragEnd}
            onBlockDragUpdate={handleBlockDragUpdate}
            onCanvasClick={handleCanvasClick}
            droppedBlocks={droppedBlocks}
            selectedBlockId={selectedBlockId}
            connections={connections}
            selectedConnectionId={selectedConnection?.id || null}
            isConnecting={isConnecting}
            connectingFrom={connectingFrom}
            onConnectionClick={handleConnectionClick}
            onConnectionComplete={handleConnectionComplete}
            onConnectionCancel={cancelConnecting}
            onDeleteConnection={deleteConnection}
            onDeleteConnectionsForBlock={deleteConnectionsForBlock}
            isDraggingBlock={isDraggingBlock}
            dragPosition={dragPosition}
            onDragPreview={handleDragPreview}
            onDragPreviewEnd={handleDragPreviewEnd}
            isDropPreview={isDropPreview}
            previewPosition={previewPosition}
            previewBlockData={previewBlockData}
            currentDragData={currentDragData}
          />
        </div>
        {/* 오른쪽 패널 */}
        <ResizablePanel side="right" initialWidth={340}>
          <div className="h-full w-full flex flex-col overflow-hidden">
            <TabHeader
              activeTab={activeTab}
              onTabChange={handleTabChange}
              connectionCount={connections.length}
            />
            <div className="flex-1 overflow-y-auto">
              {activeTab === "connections" && (
                <ConnectionsPanel
                  connections={connections}
                  blocks={droppedBlocks}
                  selectedConnectionId={selectedConnection?.id}
                  onConnectionSelect={handleConnectionSelect}
                  onConnectionDelete={handleConnectionDelete}
                />
              )}
              {activeTab === "code" && (
                <CodeEditor key="code-editor" generatedCode={generatedCode} />
              )}
              {activeTab === "properties" && propertiesBlockId && (
                <PropertiesPanel
                  selectedBlock={
                    droppedBlocks.find(
                      (block) => block.id === propertiesBlockId
                    ) || null
                  }
                  onPropertiesChange={handleBlockPropertiesChange}
                  onResize={handleBlockResize}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </div>
      {/* 하단 상태바 */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-600 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>배치된 블록: {droppedBlocks.length}개</span>
            <span>•</span>
            <span>연결: {connections.length}개</span>
            <span>•</span>
            <span>
              마지막 업데이트:{" "}
              {droppedBlocks.length > 0
                ? new Date(
                  Math.max(...droppedBlocks.map((b) => b.timestamp))
                ).toLocaleTimeString()
                : "없음"}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500">단축키:</span>
              <span>⌘N 새프로젝트</span>
              <span>•</span>
              <span>1/2/3 탭전환</span>
              <span>•</span>
              <span>Del 삭제</span>
            </div>
            <span className="text-green-400">● 준비됨</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
