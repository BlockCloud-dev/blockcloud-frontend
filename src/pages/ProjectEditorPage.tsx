import { useEffect, useState } from "react";
import { BlockPalette } from "../components/layout/BlockPalette";
import { Canvas3D } from "../components/layout/Canvas3D";
import { CodeEditor } from "../components/layout/CodeEditor";
import { PropertiesPanel } from "../components/ui/PropertiesPanel";
import { TabHeader } from "../components/ui/TabHeader";
import { ConnectionsPanel } from "../components/ui/ConnectionsPanel";
import { Vector3 } from "three";
import type { DroppedBlock } from "../types/blocks";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { ResizablePanel } from "../components/ui/ResizablePanel";
import MainHeader from "../components/ui/MainHeader";
import toast from "react-hot-toast";
import { getStackingHint, canDeleteBlockWithStore, getStackedBlocks, requiresParent } from "../utils/stackingRules";
import { providerManager, CloudProviderType } from "../providers";

// Zustand 스토어들
import {
  useBlockStore,
  useConnectionStore,
  useUIStore,
  useProjectStore,
  useResetAllStores,
  useStackingStore,
} from "../stores";

import { snapToGrid } from "../utils/snapGrid";
import { apiFetch } from "../utils/apiClients";
import { useLocation, useParams } from "react-router-dom";

function ProjectEditorPage() {
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
    // ✅ 불러온 블록을 주입할 setter
    setDroppedBlocks,
  } = useBlockStore();

  const {
    connections,
    selectedConnection,
    isConnecting,
    connectingFrom,
    setConnections,
    setSelectedConnection,
    deleteConnection,
    deleteConnectionsForBlock,
    startConnecting,
    cancelConnecting,
    completeConnection,
  } = useConnectionStore();

  const { activeTab, setActiveTab, setGeneratedCode } = useUIStore();

  // 통합된 연결 모드 상태 (ConnectionStore에서 가져옴)
  const isConnectionMode = useConnectionStore(
    (state) => state.isConnectionMode
  );
  const selectedFromBlockId = useConnectionStore(
    (state) => state.selectedFromBlockId
  );
  const setSelectedFromBlockId = useConnectionStore(
    (state) => state.setSelectedFromBlockId
  );
  const resetConnectionMode = useConnectionStore(
    (state) => state.resetConnectionMode
  );

  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const projectNameFromNav = location.state?.projectName;

  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

  const [loadingStatus, setLoadingStatus] = useState<
    null | "validating" | "deploying"
  >(null);

  useEffect(() => {
    if (projectNameFromNav) {
      setProjectName(projectNameFromNav);
    }
  }, [projectNameFromNav, setProjectName]);

  // 헬퍼 훅들
  const resetAllStores = useResetAllStores();

  // 새로운 스태킹 시스템 import
  const {
    stackingStates,
    canStack,
    createStackingRelation,
    deriveConnectionsFromStacking,
    validateStacking,
    calculateStackedPosition,
    removeStackingRelation,
  } = useStackingStore();

  // ✅ 프로젝트 진입 시 서버에 저장된 블록/연결 불러오기
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
          console.log("✅ 프로젝트 블록 불러오기 성공:", blocks.length);
        } else {
          console.warn("⚠️ 불러온 블록 데이터 형식이 올바르지 않습니다.", res);
        }

        // 연결도 내려줄 경우를 대비해 옵션 처리
        const apiConnections =
          (res?.data?.connections as any[]) ??
          (res?.connections as any[]) ??
          null;
        if (Array.isArray(apiConnections)) {
          setConnections(apiConnections);
          console.log("✅ 프로젝트 연결 불러오기 성공:", apiConnections.length);
        }

        // 프로젝트의 클라우드 프로바이더 설정 불러오기
        const projectProvider = res?.data?.provider ?? res?.provider ?? "AWS";
        console.log("🔄 [ProjectEditor] Loading project with provider:", projectProvider);

        // 프로바이더 설정 (UI 상태와 프로바이더 매니저 모두 업데이트)
        setCurrentCSP(projectProvider as "AWS" | "GCP" | "Azure");

        // 프로바이더 매니저에서도 현재 프로바이더 설정
        let providerType: CloudProviderType;
        switch (projectProvider) {
          case "GCP":
            providerType = CloudProviderType.GCP;
            break;
          case "Azure":
            providerType = CloudProviderType.AZURE;
            break;
          default:
            providerType = CloudProviderType.AWS;
        }
        providerManager.setCurrentProvider(providerType);
      } catch (error) {
        console.error("❌ 블록 불러오기 실패:", error);
        // UX상 경고창은 과도할 수 있어 console만 남김. 필요 시 alert 추가 가능.
      }
    };

    loadBlocksFromAPI();
  }, [projectId, setDroppedBlocks, setConnections]);

  // 새 블록의 스태킹 처리 (자유로운 배치 허용)
  const handleStackingForNewBlock = (
    newBlock: DroppedBlock,
    allBlocks: DroppedBlock[],
    forcePosition?: boolean
  ) => {
    console.log(
      "🎯 [NewStacking] 새 블록 스태킹 처리:",
      newBlock.type,
      "forcePosition:",
      forcePosition
    );

    const isComputeInstance = newBlock.type.includes('ec2') || newBlock.type.includes('compute-engine') || newBlock.type.includes('virtual-machine');

    if (isComputeInstance) {
      // ===== EC2/Compute 전용 로직: 겹침 면적 기반 =====
      console.log("🔗 [NewStacking] Compute 인스턴스 스태킹 처리");
      console.log("📍 [NewStacking] EC2 현재 위치:", {
        x: newBlock.position.x.toFixed(2),
        y: newBlock.position.y.toFixed(2),
        z: newBlock.position.z.toFixed(2)
      });

      // 1단계: 타입별로 분류
      const volumes: DroppedBlock[] = [];
      const subnets: DroppedBlock[] = [];

      allBlocks.forEach(block => {
        if (block.id === newBlock.id) return;
        if (!canStack(newBlock.type, block.type)) return;

        const isVolumeDisk = block.type.includes('volume') || block.type.includes('ebs') || block.type.includes('disk');
        const isSubnet = block.type.includes('subnet');

        if (isVolumeDisk) volumes.push(block);
        if (isSubnet) subnets.push(block);
      });

      console.log("[NewStacking] 타입별 분류:", {
        volumeCount: volumes.length,
        subnetCount: subnets.length,
      });

      // 2단계: Volume/EBS 검증 (validateStacking 사용)
      const validVolumes = volumes.filter(vol => {
        const isValid = validateStacking(newBlock, vol);
        console.log(`[NewStacking] Volume 검증: ${vol.type.substring(0, 10)} - ${isValid ? '✅' : '❌'}`);
        return isValid;
      });

      // 3단계: Subnet 검증 - 겹침 면적 기반 선택
      const subnetOverlapData = subnets.map(subnet => {
        const ec2SizeX = newBlock.size?.[0] || 1;
        const ec2SizeZ = newBlock.size?.[2] || 1;
        const subnetSizeX = subnet.size?.[0] || 3;
        const subnetSizeZ = subnet.size?.[2] || 3;

        // X축 겹침 계산
        const ec2Left = newBlock.position.x - ec2SizeX / 2;
        const ec2Right = newBlock.position.x + ec2SizeX / 2;
        const subnetLeft = subnet.position.x - subnetSizeX / 2;
        const subnetRight = subnet.position.x + subnetSizeX / 2;

        const xOverlapStart = Math.max(ec2Left, subnetLeft);
        const xOverlapEnd = Math.min(ec2Right, subnetRight);
        const xOverlap = Math.max(0, xOverlapEnd - xOverlapStart);

        // Z축 겹침 계산
        const ec2Front = newBlock.position.z - ec2SizeZ / 2;
        const ec2Back = newBlock.position.z + ec2SizeZ / 2;
        const subnetFront = subnet.position.z - subnetSizeZ / 2;
        const subnetBack = subnet.position.z + subnetSizeZ / 2;

        const zOverlapStart = Math.max(ec2Front, subnetFront);
        const zOverlapEnd = Math.min(ec2Back, subnetBack);
        const zOverlap = Math.max(0, zOverlapEnd - zOverlapStart);

        // 겹침 면적
        const overlapArea = xOverlap * zOverlap;
        const ec2Area = ec2SizeX * ec2SizeZ;
        const overlapRatio = ec2Area > 0 ? overlapArea / ec2Area : 0;

        // Y축 검증 + 스태킹 규칙 검증 (VPC 위에 EC2 올라가는 것 방지)
        const yValid = validateStacking(newBlock, subnet);
        const stackingRuleValid = canStack(newBlock.type, subnet.type);

        console.log(`🎯 [NewStacking] Subnet 겹침 분석: ${subnet.type}`, {
          subnetId: subnet.id.substring(0, 8),
          ec2Pos: `(${newBlock.position.x.toFixed(1)}, ${newBlock.position.z.toFixed(1)})`,
          subnetPos: `(${subnet.position.x.toFixed(1)}, ${subnet.position.z.toFixed(1)})`,
          xOverlap: xOverlap.toFixed(2),
          zOverlap: zOverlap.toFixed(2),
          overlapRatio: (overlapRatio * 100).toFixed(1) + '%',
          yValid,
          stackingRuleValid: stackingRuleValid ? '✅' : '❌ (VPC 등 잘못된 타입)'
        });

        return { subnet, overlapRatio, yValid, stackingRuleValid };
      });

      // 겹침 면적이 30% 이상이고 Y축 검증 + 스태킹 규칙 모두 통과한 Subnet 필터링
      const validSubnets = subnetOverlapData
        .filter(data => data.overlapRatio >= 0.3 && data.yValid && data.stackingRuleValid)
        .sort((a, b) => b.overlapRatio - a.overlapRatio);

      console.log("✅ [NewStacking] 최종 스태킹 타겟:", {
        volumes: validVolumes.map(v => `${v.type}(${v.id.substring(0, 8)})`),
        subnets: validSubnets.map(s => `${s.subnet.type}(${s.subnet.id.substring(0, 8)}) - ${(s.overlapRatio * 100).toFixed(1)}%`)
      });

      // 4단계: 스태킹 관계 생성
      validVolumes.forEach(vol => {
        createStackingRelation(newBlock.id, vol.id, allBlocks);
        console.log("🔗 [NewStacking] 부트볼륨 연결:", vol.type);
      });

      if (validSubnets.length > 0) {
        const bestSubnet = validSubnets[0].subnet;
        createStackingRelation(newBlock.id, bestSubnet.id, allBlocks);
        console.log("🔗 [NewStacking] Subnet 연결:", bestSubnet.type, `(${(validSubnets[0].overlapRatio * 100).toFixed(1)}%)`);
      }

      // 위치 조정 없음 (사용자 드래그 위치 유지)
      console.log("🎯 [NewStacking] EC2 사용자 위치 유지");

      // 즉시 연결 업데이트
      const derivedConnections = deriveConnectionsFromStacking(allBlocks);
      const nonStackingConnections = connections.filter(
        (conn) => !conn.properties?.stackConnection
      );
      const allConnections = [...nonStackingConnections, ...derivedConnections];
      setConnections(allConnections);

      console.log(
        "✅ [NewStacking] 스태킹 완료 + 연결 업데이트:",
        derivedConnections.length,
        "개"
      );
    } else {
      // ===== 일반 블록 로직 =====
      const potentialTargets = allBlocks
        .filter((block) => block.id !== newBlock.id)
        .filter((block) => canStack(newBlock.type, block.type))
        .filter((block) => validateStacking(newBlock, block));

      if (potentialTargets.length > 0) {
        const targetBlock = selectStackingTargetByPriority(
          newBlock,
          potentialTargets
        );

        if (targetBlock) {
          console.log("🔗 [NewStacking] 스태킹 대상 발견:", targetBlock.type);
          createStackingRelation(newBlock.id, targetBlock.id, allBlocks);

          if (forcePosition) {
            const stackedPosition = calculateStackedPosition(newBlock, targetBlock);
            moveBlock(newBlock.id, stackedPosition);
            console.log("📍 [NewStacking] 위치 강제 조정됨");
          } else {
            console.log("🎯 [NewStacking] 사용자 위치 유지");
          }
        }

        // 즉시 연결 업데이트
        const derivedConnections = deriveConnectionsFromStacking(allBlocks);
        const nonStackingConnections = connections.filter(
          (conn) => !conn.properties?.stackConnection
        );
        const allConnections = [...nonStackingConnections, ...derivedConnections];
        setConnections(allConnections);

        console.log(
          "✅ [NewStacking] 스태킹 완료 + 연결 업데이트:",
          derivedConnections.length,
          "개"
        );
      } else {
        console.log("ℹ️ [NewStacking] 스태킹 대상 없음");
      }
    }
  };

  // AWS 우선순위에 따른 스태킹 대상 선택
  const selectStackingTargetByPriority = (
    block: DroppedBlock,
    potentialTargets: DroppedBlock[]
  ): DroppedBlock | null => {
    console.log("🎯 [SelectTarget] 스태킹 대상 선택 시작:", {
      blockType: block.type,
      blockId: block.id.substring(0, 8),
      potentialTargets: potentialTargets.map(
        (t) => `${t.type}(${t.id.substring(0, 8)})`
      ),
    });

    // Compute 인스턴스: 거리 기반 우선순위 (가까운 블록 우선)
    const isComputeInstance = block.type.includes('ec2') || block.type.includes('compute-engine') || block.type.includes('virtual-machine');
    if (isComputeInstance) {
      const subnetTargets = potentialTargets.filter((t) => t.type.includes('subnet'));
      const storageTargets = potentialTargets.filter((t) =>
        t.type.includes('volume') || t.type.includes('ebs') || t.type.includes('disk')
      );

      console.log("🎯 [SelectTarget] EC2 타겟 분류:", {
        subnetTargets: subnetTargets.length,
        storageTargets: storageTargets.length,
      });

      // 모든 가능한 타겟을 거리순으로 정렬
      const allTargetsWithDistance = [...subnetTargets, ...storageTargets]
        .map((target) => {
          const distance = Math.sqrt(
            Math.pow(block.position.x - target.position.x, 2) +
            Math.pow(block.position.z - target.position.z, 2)
          );
          return {
            target,
            distance,
            isStorage: target.type.includes('volume') || target.type.includes('ebs') || target.type.includes('disk'),
          };
        })
        .sort((a, b) => a.distance - b.distance);

      console.log(
        "🎯 [SelectTarget] 거리 순 정렬 결과:",
        allTargetsWithDistance.map((t) => ({
          type: t.target.type,
          id: t.target.id.substring(0, 8),
          distance: t.distance.toFixed(2),
          isStorage: t.isStorage,
        }))
      );

      if (allTargetsWithDistance.length > 0) {
        const closest = allTargetsWithDistance[0];
        console.log("🎯 [ProjectEditor] EC2 거리 기반 스태킹 선택:", {
          target: closest.target.type,
          targetId: closest.target.id.substring(0, 8),
          distance: closest.distance.toFixed(2),
          isBootVolume: closest.isStorage,
        });
        return closest.target;
      }
    }

    // Subnet: VPC
    if (block.type.includes('subnet')) {
      const vpcTarget = potentialTargets.find((t) => t.type.includes('vpc') || t.type.includes('virtual-network'));
      if (vpcTarget) return vpcTarget;
    }

    // Storage: Subnet
    const isVolumeDisk = block.type.includes('volume') || block.type.includes('ebs') || block.type.includes('disk');
    if (isVolumeDisk) {
      const subnetTarget = potentialTargets.find((t) => t.type.includes('subnet'));
      if (subnetTarget) return subnetTarget;
    }

    // 기타: Y축 높은 순
    return (
      potentialTargets.sort((a, b) => b.position.y - a.position.y)[0] || null
    );
  };

  // 블록 이동 시 스태킹 업데이트 (검증 실패 시 false 반환)
  const handleStackingForMovedBlock = (
    blockId: string,
    allBlocks: DroppedBlock[]
  ): boolean => {
    console.log(
      "🔄🔄🔄 [NewStacking] ===== 이동된 블록 스태킹 업데이트 시작 ====="
    );
    console.log("🔄 [NewStacking] BlockID:", blockId);
    console.log("🔄 [NewStacking] AllBlocks count:", allBlocks.length);

    // 기존 스태킹 관계 제거
    console.log("🗑️ [NewStacking] 기존 스태킹 관계 제거 호출");
    removeStackingRelation(blockId);

    // 새로운 위치에서 스태킹 확인
    const movedBlock = allBlocks.find((block) => block.id === blockId);
    console.log("🔍 [NewStacking] 이동된 블록 찾기:", !!movedBlock);

    if (!movedBlock) {
      console.log("❌ [NewStacking] 이동된 블록을 찾을 수 없음");
      return false;
    }

    // 규칙 기반 검증: VPC/Virtual Network 같은 Foundation 블록은 부모가 필요없음
    const needsParent = requiresParent(movedBlock.type);

    if (!needsParent) {
      console.log("✅ [NewStacking] Foundation 블록 (VPC/Virtual Network) - 스태킹 검증 생략");
      return true;
    }

    console.log("🎯 [NewStacking] 새로운 스태킹 처리 호출");
    handleStackingForNewBlock(movedBlock, allBlocks);

    // 즉시 연결 업데이트
    console.log("🔗 [NewStacking] 연결 업데이트 시작");
    const derivedConnections = deriveConnectionsFromStacking(allBlocks);
    console.log(
      "🔗 [NewStacking] 파생된 연결 수:",
      derivedConnections.length
    );

    // 규칙 기반 검증: 부모가 필요한 블록은 반드시 연결이 있어야 함
    if (needsParent) {
      const hasValidConnection = derivedConnections.some(conn =>
        conn.fromBlockId === blockId || conn.toBlockId === blockId
      );

      if (!hasValidConnection) {
        console.log(`❌ [NewStacking] ${movedBlock.type} 블록이 필수 부모에 연결되지 않음 - 이동 실패`);
        console.log(`   필수: ${getStackingHint(movedBlock.type)}`);
        return false;
      }
      console.log(`✅ [NewStacking] ${movedBlock.type} 블록이 올바른 부모에 연결됨`);
    }

    const nonStackingConnections = connections.filter(
      (conn) => !conn.properties?.stackConnection
    );
    console.log(
      "🔗 [NewStacking] 비스태킹 연결 수:",
      nonStackingConnections.length
    );

    const allConnections = [...nonStackingConnections, ...derivedConnections];
    console.log("🔗 [NewStacking] 총 연결 수:", allConnections.length);

    setConnections(allConnections);

    console.log("✅ [NewStacking] 이동 후 연결 업데이트 완료");
    console.log(
      "🔄🔄🔄 [NewStacking] ===== 이동된 블록 스태킹 업데이트 종료 ====="
    );
    return true;
  };

  // 블록 변경 시 HCL 코드 자동 생성 (연결 정보 포함)
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
        category: 'network' as any, // 기본값, 실제로는 블록 타입에 따라 매핑 필요
        icon: null, // 실제로는 블록 타입에 따라 아이콘 매핑 필요
        color: 'bg-blue-500', // 기본 색상
        size: block.size,
        properties: block.properties,
      }));
      code = currentProvider.generateCode(cloudBlocks, allConnections);
    } else {
      console.warn("⚠️ [CodeGen] No provider found, using empty template");
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

  const handleBlockDrop = (blockData: any, position: Vector3) => {
    // 블록 타입에 따른 크기 결정 (벤더 접두사 무관)
    const getBlockSizeByType = (blockId: string): [number, number, number] => {
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
    };

    const blockSize = getBlockSizeByType(blockData.id);

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

    // 블록 유형에 따른 기본 속성 추가 (벤더 접두사 무관)
    if (blockData.id.includes('vpc') || blockData.id.includes('virtual-network')) {
      newBlock.properties.cidrBlock = "10.0.0.0/16";
      newBlock.properties.enableDnsSupport = true;
      newBlock.properties.enableDnsHostnames = true;
    } else if (blockData.id.includes('subnet')) {
      newBlock.properties.cidrBlock = "10.0.1.0/24";
      newBlock.properties.availabilityZone = "ap-northeast-2a";
    } else if (blockData.id.includes('ec2') || blockData.id.includes('compute-engine') || blockData.id.includes('virtual-machine')) {
      newBlock.properties.instanceType = "t2.micro";
      newBlock.properties.ami = "ami-12345678";
    } else if (blockData.id.includes('security-group') || blockData.id.includes('firewall') || blockData.id.includes('nsg')) {
      newBlock.properties.securityRules = [
        {
          type: "ingress",
          protocol: "tcp",
          fromPort: 22,
          toPort: 22,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ];
    } else if (blockData.id.includes('load-balancer')) {
      newBlock.properties.loadBalancerType = "application";
    } else if (blockData.id.includes('volume') || blockData.id.includes('ebs') || blockData.id.includes('disk')) {
      newBlock.properties.volumeSize = 8;
      newBlock.properties.volumeType = "gp2";
    }

    addBlock(newBlock);
    console.log("✅ Block added to scene:", newBlock);

    // 새로운 스태킹 시스템: 자유로운 배치 허용 (위치 강제 조정 비활성화)
    const updatedBlocks = [...droppedBlocks, newBlock];
    handleStackingForNewBlock(newBlock, updatedBlocks, false); // forcePosition: false

    console.log("📊 Total blocks:", droppedBlocks.length + 1);
  };

  const handleBlockClick = (blockId: string) => {
    console.log("🎯 Block clicked:", blockId);

    // 연결 모드가 활성화된 경우
    if (isConnectionMode) {
      if (!selectedFromBlockId) {
        // 첫 번째 블록 선택
        setSelectedFromBlockId(blockId);
        console.log("🔗 연결 시작 블록 선택:", blockId);
      } else if (selectedFromBlockId !== blockId) {
        // 두 번째 블록 선택 - 연결 생성
        const fromBlock = droppedBlocks.find(
          (b) => b.id === selectedFromBlockId
        );
        const toBlock = droppedBlocks.find((b) => b.id === blockId);

        if (fromBlock && toBlock) {
          const success = completeConnection(blockId, fromBlock, toBlock);
          if (success) {
            console.log(
              "🔗 연결 생성 성공:",
              selectedFromBlockId,
              "->",
              blockId
            );
            resetConnectionMode(); // 연결 모드 종료
          } else {
            console.log("❌ 연결 생성 실패");
            // 실패 시 첫 번째 블록을 현재 클릭한 블록으로 변경
            setSelectedFromBlockId(blockId);
          }
        } else {
          resetConnectionMode();
        }
      } else {
        // 같은 블록을 다시 클릭한 경우 - 선택 해제하고 연결 모드 종료
        resetConnectionMode();
      }
      return; // 연결 모드에서는 일반 선택 로직을 실행하지 않음
    }

    // 일반 블록 선택 로직
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
    // 스태킹 스토어 기반 삭제 검증 (더 정확함)
    const deleteValidation = canDeleteBlockWithStore(blockId, stackingStates, droppedBlocks);

    if (!deleteValidation.canDelete) {
      const targetBlock = droppedBlocks.find(b => b.id === blockId);
      const stackedBlocks = deleteValidation.stackedBlocks || [];

      // 사용자에게 구체적인 안내 메시지 표시
      const stackedBlockNames = stackedBlocks.map(b => b.type).join(", ");

      toast.error(
        `${targetBlock?.type || "블록"}을 삭제할 수 없습니다.\n` +
        `위에 스택된 블록들을 먼저 삭제해주세요: ${stackedBlockNames}`,
        {
          id: `delete-blocked-${blockId}`,
          position: "bottom-center",
          duration: 3000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );

      return; // 삭제 중단
    }

    // 삭제 가능한 경우 기존 로직 실행
    // 스태킹 관계 제거
    removeStackingRelation(blockId);

    // 블록과 관련된 모든 연결 삭제
    deleteConnectionsForBlock(blockId);

    deleteBlock(blockId);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
      setPropertiesBlockId(null);
      setActiveTab("code"); // 블록 삭제 시 코드 탭으로 전환
    }

    toast.success(`${droppedBlocks.find(b => b.id === blockId)?.type || "블록"}이 삭제되었습니다.`, {
      position: "bottom-center",
      duration: 2000
    });

    console.log("🗑️ Block deleted:", blockId);
  };

  const handleBlockMove = (blockId: string, newPosition: Vector3) => {
    console.log("🎯 [APP_MOVE] ========== BLOCK MOVE START ==========");
    console.log("🎯 [APP_MOVE] Block ID:", blockId);
    console.log("🎯 [APP_MOVE] Received position from BaseBlock:", newPosition);

    // 위에 스택된 블록이 있는지 검증
    const stackedBlocks = getStackedBlocks(blockId, droppedBlocks);
    if (stackedBlocks.length > 0) {
      const movingBlock = droppedBlocks.find(b => b.id === blockId);
      const stackedBlockNames = stackedBlocks.map(b => b.type).join(", ");

      toast.error(
        `${movingBlock?.type || "블록"}을 이동할 수 없습니다.\n` +
        `위에 스택된 블록들을 먼저 이동해주세요: ${stackedBlockNames}`,
        {
          id: `move-blocked-${blockId}`,
          position: "bottom-center",
          duration: 3000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );

      console.log("❌ [APP_MOVE] Cannot move block - has stacked blocks above:", stackedBlockNames);
      return; // 이동 중단
    }

    // 블록 높이 계산 함수
    const getBlockHeight = (
      blockType: string,
      size?: [number, number, number]
    ) => {
      if (blockType.includes('vpc') || blockType.includes('virtual-network') || blockType.includes('subnet')) {
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
      if (blockType.includes('vpc') || blockType.includes('virtual-network') || blockType.includes('subnet')) {
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

      // 벤더 접두사 무관하게 블록 타입으로 크기 결정
      if (blockType.includes('vpc') || blockType.includes('virtual-network')) {
        return [4, 0.2, 4] as [number, number, number];
      }
      if (blockType.includes('subnet')) {
        return [3, 0.3, 3] as [number, number, number];
      }
      if (blockType.includes('ec2') || blockType.includes('compute-engine') || blockType.includes('virtual-machine')) {
        return [1, 1.5, 1] as [number, number, number];
      }
      if (blockType.includes('volume') || blockType.includes('ebs') || blockType.includes('disk')) {
        return [0.8, 0.8, 0.8] as [number, number, number];
      }
      if (blockType.includes('security-group') || blockType.includes('firewall') || blockType.includes('nsg')) {
        return [1, 2, 1] as [number, number, number];
      }
      if (blockType.includes('load-balancer')) {
        return [2, 1, 1] as [number, number, number];
      }

      return [1, 1, 1] as [number, number, number];
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

    // 겹치는 블록이 있다면, 스택킹 규칙을 검사
    if (overlappingBlocks.length > 0) {
      // 이동하는 블록 자신은 제외
      const otherBlocks = overlappingBlocks.filter(b => b.id !== blockId);

      console.log("🔍 [APP_MOVE] 자신 제외한 겹치는 블록들:", otherBlocks.length);

      if (otherBlocks.length === 0) {
        console.log("⚠️ [APP_MOVE] No other blocks to stack on");
      } else {
        // Compute-Volume 스태킹 우선 확인 (부트볼륨)
        const isComputeBlock = movingBlock.type.includes('ec2') ||
          movingBlock.type.includes('compute-engine') ||
          movingBlock.type.includes('virtual-machine');

        let volumeBlock = null;
        if (isComputeBlock) {
          // Volume 타입 블록 찾기
          volumeBlock = otherBlocks.find(b =>
            b.type.includes('volume') ||
            b.type.includes('persistent-disk') ||
            b.type.includes('managed-disk')
          );

          if (volumeBlock) {
            console.log("🔍 [APP_MOVE] Volume 블록 발견:", volumeBlock.type);

            // Volume과 스태킹 가능한지 확인
            if (canStack(movingBlock.type, volumeBlock.type)) {
              console.log("✅ [APP_MOVE] Compute-Volume 스태킹 허용");
              stackingTarget = volumeBlock;
            }
          }
        }

        // Volume 스태킹이 없으면 기존 방식 (가장 위 블록)
        if (!stackingTarget) {
          const topBlock = otherBlocks.reduce((highest, current) =>
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
      }
    }

    let finalPosition: Vector3;

    if (stackingTarget) {
      // 스태킹 규칙 검증 - 새 위치로 임시 블록 생성하여 검증
      const blockWithNewPosition = {
        ...movingBlock,
        position: newPosition  // 새 위치 사용!
      };

      const isValidStacking = validateStacking(blockWithNewPosition, stackingTarget);

      if (!isValidStacking) {
        console.log("❌ [APP_MOVE] Invalid stacking rule detected");

        // 구체적인 에러 메시지 표시
        const hint = getStackingHint(movingBlock.type);
        toast.error(`${movingBlock.type} 블록은 ${hint} 올릴 수 있습니다. ${stackingTarget.type} 위에는 올릴 수 없습니다.`, {
          id: `invalid-stacking-${blockId}`,
          position: "bottom-center",
          duration: 3000
        });

        console.log("🔄 [APP_MOVE] Invalid stacking, reverting to original position:", movingBlock.position);
        return; // 이동을 중단하고 원래 위치 유지
      }

      // 스택킹 위치 계산 - 현재 드래그 위치 유지
      finalPosition = calculateStackingPosition(
        stackingTarget,
        movingBlock.type,
        blockSize,
        snappedX,
        snappedZ
      );
      console.log(
        "📚 [APP_MOVE] Valid stacking - block on top of:",
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
      // VPC 계열 블록이 아닌 블록은 반드시 스태킹 대상이 있어야 함
      const isVPCBlock = movingBlock.type.includes('vpc') || movingBlock.type.includes('virtual-network');
      if (!isVPCBlock) {
        console.log("❌ [APP_MOVE] Non-VPC block cannot be placed in empty space");

        // 구체적인 에러 메시지 표시
        const hint = getStackingHint(movingBlock.type);
        toast.error(`${movingBlock.type} 블록은 ${hint} 올려야 합니다. 빈 공간에는 올릴 수 없습니다.`, {
          id: `block-move-restriction-${blockId}`, // 중복 방지를 위한 고유 ID
          position: "bottom-center",
          duration: 3000
        });

        // 원래 위치로 복원
        console.log("🔄 [APP_MOVE] Reverting to original position:", movingBlock.position);
        return; // 이동을 중단하고 원래 위치 유지
      }

      // VPC 블록은 빈 공간에 배치 가능
      finalPosition = new Vector3(snappedX, newPosition.y, snappedZ);
      console.log(
        "✅ [APP_MOVE] VPC block placed at requested position:",
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

    // 원래 위치 저장 (복원용)
    const originalPosition = movingBlock.position;
    console.log("💾 [APP_MOVE] 원래 위치 저장:", originalPosition);

    moveBlock(blockId, finalPosition);

    // 드래그 종료 시 상태 초기화
    setIsDraggingBlock(null);
    setDragPosition(null);

    // 새로운 스태킹 시스템: 위치 업데이트 후 스태킹 처리
    // 업데이트된 블록 배열을 직접 생성하여 전달
    const updatedBlocks = droppedBlocks.map((block) =>
      block.id === blockId ? { ...block, position: finalPosition } : block
    );

    console.log("🔄 [APP_MOVE] 업데이트된 블록 배열로 스태킹 처리");
    const stackingSuccess = handleStackingForMovedBlock(blockId, updatedBlocks);

    // 스태킹 검증 실패 시 원래 위치로 복원
    if (!stackingSuccess) {
      console.log("❌ [APP_MOVE] 스태킹 검증 실패 - 원래 위치로 복원");
      moveBlock(blockId, originalPosition);

      const hint = getStackingHint(movingBlock.type);
      toast.error(
        `${movingBlock.type} 블록은 ${hint} 올려야 합니다.\n현재 위치에서는 올바른 연결을 찾을 수 없습니다.`,
        {
          id: `stacking-failed-${blockId}`,
          position: "bottom-center",
          duration: 4000,
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '400px'
          }
        }
      );

      console.log("🔄 [APP_MOVE] 원래 위치로 복원 완료:", originalPosition);
      console.log("🎯 [APP_MOVE] ========== BLOCK MOVE REVERTED ==========");
      return;
    }

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
      // 드래그 중에는 위치만 업데이트, 연결은 드롭 후에 처리
    }
  };

  const handleBlockResize = (
    blockId: string,
    newSize: [number, number, number]
  ) => {
    resizeBlock(blockId, newSize);
    console.log("📏 Block resized:", blockId, newSize);

    // 새로운 스태킹 시스템: 크기 변경 후 스태킹 재검토
    handleStackingForMovedBlock(blockId, droppedBlocks);
    console.log("🔗 블록 크기 변경 후 스태킹 연결 재검출 완료");
  };

  // 연결 관련 핸들러들
  const handleConnectionComplete = (toBlockId: string) => {
    // 연결 중인 블록들의 정보 가져오기
    const fromBlock = connectingFrom
      ? droppedBlocks.find((block) => block.id === connectingFrom)
      : undefined;
    const toBlock = droppedBlocks.find((block) => block.id === toBlockId);

    const success = completeConnection(toBlockId, fromBlock, toBlock);
    if (success) {
      console.log("🔗 Connection created:", {
        from: fromBlock?.type,
        to: toBlock?.type,
        isVolumeConnection:
          (fromBlock?.type.includes('volume') || fromBlock?.type.includes('ebs') || fromBlock?.type.includes('disk')) ||
          (toBlock?.type.includes('volume') || toBlock?.type.includes('ebs') || toBlock?.type.includes('disk')),
      });
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

  // 탭 변경 핸들러
  const handleTabChange = (tab: "connections" | "code" | "properties") => {
    setActiveTab(tab);
  };

  // 프로젝트 관리 핸들러
  const handleNewProject = () => {
    resetAllStores();
    console.log("🆕 New project created");
  };

  const handleSaveProject = async () => {
    if (!projectId) {
      alert("URL에서 projectId를 찾을 수 없습니다.");
      return;
    }

    if (droppedBlocks.length === 0) {
      alert("저장할 블록이 없습니다.");
      return;
    }

    try {
      await apiFetch(`/api/block/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ blocks: droppedBlocks }),
      });

      alert("✅ 프로젝트가 성공적으로 저장되었습니다.");
    } catch (err) {
      console.error("❌ 저장 실패:", err);
      alert("❌ 저장 중 오류가 발생했습니다.");
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
        if (selectedBlock && selectedBlock.size) {
          const newSize: [number, number, number] = [...selectedBlock.size];

          // 축에 따라 크기 조절
          if (axis === "width") {
            // 가로 크기는 제한 없이 조절 (최소값 0.5만 유지)
            newSize[0] = Math.max(0.5, newSize[0] + delta);
          } else if (axis === "height") {
            // 높이는 고정 - 조절하지 않음
            console.log("높이 조절은 제한됩니다.");
            return;
          } else if (axis === "depth") {
            // 세로 크기는 제한 없이 조절 (최소값 0.5만 유지)
            newSize[2] = Math.max(0.5, newSize[2] + delta);
          }

          console.log("🔧 블록 크기 조절:", {
            blockType: selectedBlock.type,
            axis,
            delta,
            oldSize: selectedBlock.size,
            newSize,
          });

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

  // ✅ Terraform 코드 생성 함수
  const buildTerraformCode = (): string => {
    const derivedConnections = deriveConnectionsFromStacking(droppedBlocks);
    const nonStackingConnections = connections.filter(
      (conn) => !conn.properties?.stackConnection
    );
    const allConnections = [...nonStackingConnections, ...derivedConnections];

    // 현재 프로바이더를 사용한 코드 생성
    const currentProvider = providerManager.getCurrentProvider();
    if (currentProvider) {
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
      return currentProvider.generateCode(cloudBlocks, allConnections);
    } else {
      console.warn("⚠️ [Deploy] No provider found");
      return `# 프로바이더가 선택되지 않았습니다.`;
    }
  };

  const handleDeployProject = async () => {
    if (!projectId) {
      toast.error("⚠️ projectId가 없습니다.");
      return;
    }

    if (droppedBlocks.length === 0) {
      toast.error("❌ 배포할 블록이 없습니다.");
      return;
    }

    try {
      setLoadingStatus("validating"); // ✅ 유효성 검사 시작

      const terraformCode = buildTerraformCode();

      const validateRes = await apiFetch(
        `/api/projects/${projectId}/terraform/validate`,
        {
          method: "POST",
          body: JSON.stringify({ terraformCode }),
        }
      );

      const isValid = validateRes?.data?.valid;

      if (!isValid) {
        setLoadingStatus(null); // ✅ 중단 시 로딩 종료
        toast.error(
          "배포 요건이 충족되지 않았습니다. \n연결 누락 등을 확인하세요."
        );
        return;
      }

      toast.success("🛠️ Terraform 코드가 유효합니다. \n배포를 시작합니다...");
      setLoadingStatus("deploying"); // ✅ 배포 시작

      const applyRes = await apiFetch(
        `/api/projects/${projectId}/terraform/apply`,
        {
          method: "POST",
          body: JSON.stringify({ terraformCode }),
        }
      );

      const status = applyRes?.data?.status;
      const message = applyRes?.data?.message;

      if (status === "SUCCESS" || status === "PENDING") {
        toast.success(`🚀 배포 요청 완료: ${message}`);
      } else {
        toast.error(`❌ 배포 실패: ${message}`);
      }
    } catch (error: any) {
      console.error("배포 중 오류:", error);
      toast.error(`❌ 오류 발생: ${error.message}`);
    } finally {
      setLoadingStatus(null); // ✅ 항상 로딩 종료
    }
  };

  // ✅ 추가된 로딩 오버레이
  return (
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden relative">
      {/* 메인 헤더 */}
      <MainHeader
        onSaveProject={handleSaveProject}
      />      {/* 메인 3-Panel 레이아웃 */}
      <div className="flex-1 flex flex-row h-[calc(100vh-120px)] min-w-0">
        {/* 왼쪽 패널 */}
        <ResizablePanel side="left" initialWidth={320}>
          <div className="h-full w-full bg-gray-50 px-4 py-4 overflow-auto">
            <BlockPalette
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
            <TabHeader onDeploy={handleDeployProject} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === "connections" && <ConnectionsPanel />}
              {activeTab === "code" && <CodeEditor key="code-editor" />}
              {activeTab === "properties" && propertiesBlockId && (
                <PropertiesPanel />
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

      {/* ✅ 로딩 스피너 오버레이 */}
      {loadingStatus && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <p className="text-sm text-gray-700">
              {loadingStatus === "validating"
                ? "Terraform 코드 유효성 검사 중... 3분 정도 소요됩니다."
                : "Terraform 배포 중...\n시간이 소요될 수 있습니다."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectEditorPage;
