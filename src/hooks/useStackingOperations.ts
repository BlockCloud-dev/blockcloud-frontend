import { useCallback } from 'react';
import type { DroppedBlock } from '../types/blocks';
import { useStackingStore, useConnectionStore } from '../stores';
import { getStackingHint, requiresParent } from '../utils/stackingRules';

export const useStackingOperations = () => {
  const {
    canStack,
    createStackingRelation,
    deriveConnectionsFromStacking,
    validateStacking,
    calculateStackedPosition,
    removeStackingRelation,
  } = useStackingStore();

  const { connections, setConnections } = useConnectionStore();

  // 새 블록의 스태킹 처리
  const handleStackingForNewBlock = useCallback(
    (
      newBlock: DroppedBlock,
      allBlocks: DroppedBlock[],
      forcePosition?: boolean
    ) => {
      console.log(
        '🎯 [NewStacking] 새 블록 스태킹 처리:',
        newBlock.type,
        'forcePosition:',
        forcePosition
      );

      const isComputeInstance =
        newBlock.type.includes('ec2') ||
        newBlock.type.includes('compute-engine') ||
        newBlock.type.includes('virtual-machine');

      if (isComputeInstance) {
        // EC2/Compute 전용 로직: 겹침 면적 기반
        console.log('🔗 [NewStacking] Compute 인스턴스 스태킹 처리');
        console.log('📍 [NewStacking] EC2 현재 위치:', {
          x: newBlock.position.x.toFixed(2),
          y: newBlock.position.y.toFixed(2),
          z: newBlock.position.z.toFixed(2),
        });

        // 1단계: 타입별로 분류
        const volumes: DroppedBlock[] = [];
        const subnets: DroppedBlock[] = [];

        allBlocks.forEach((block) => {
          if (block.id === newBlock.id) return;
          if (!canStack(newBlock.type, block.type)) return;

          const isVolumeDisk =
            block.type.includes('volume') ||
            block.type.includes('ebs') ||
            block.type.includes('disk');
          const isSubnet = block.type.includes('subnet');

          if (isVolumeDisk) volumes.push(block);
          if (isSubnet) subnets.push(block);
        });

        console.log('[NewStacking] 타입별 분류:', {
          volumeCount: volumes.length,
          subnetCount: subnets.length,
        });

        // 2단계: Volume/EBS 검증
        const validVolumes = volumes.filter((vol) => {
          const isValid = validateStacking(newBlock, vol);
          console.log(
            `[NewStacking] Volume 검증: ${vol.type.substring(0, 10)} - ${isValid ? '✅' : '❌'
            }`
          );
          return isValid;
        });

        // 3단계: Subnet 검증 - 겹침 면적 기반 선택
        const subnetOverlapData = subnets.map((subnet) => {
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

          // Y축 검증 + 스태킹 규칙 검증
          const yValid = validateStacking(newBlock, subnet);
          const stackingRuleValid = canStack(newBlock.type, subnet.type);

          console.log(`🎯 [NewStacking] Subnet 겹침 분석: ${subnet.type}`, {
            subnetId: subnet.id.substring(0, 8),
            ec2Pos: `(${newBlock.position.x.toFixed(1)}, ${newBlock.position.z.toFixed(
              1
            )})`,
            subnetPos: `(${subnet.position.x.toFixed(1)}, ${subnet.position.z.toFixed(
              1
            )})`,
            xOverlap: xOverlap.toFixed(2),
            zOverlap: zOverlap.toFixed(2),
            overlapRatio: (overlapRatio * 100).toFixed(1) + '%',
            yValid,
            stackingRuleValid: stackingRuleValid ? '✅' : '❌ (VPC 등 잘못된 타입)',
          });

          return { subnet, overlapRatio, yValid, stackingRuleValid };
        });

        // 겹침 면적이 30% 이상이고 Y축 검증 + 스태킹 규칙 모두 통과한 Subnet 필터링
        const validSubnets = subnetOverlapData
          .filter(
            (data) =>
              data.overlapRatio >= 0.3 && data.yValid && data.stackingRuleValid
          )
          .sort((a, b) => b.overlapRatio - a.overlapRatio);

        console.log('✅ [NewStacking] 최종 스태킹 타겟:', {
          volumes: validVolumes.map((v) => `${v.type}(${v.id.substring(0, 8)})`),
          subnets: validSubnets.map(
            (s) =>
              `${s.subnet.type}(${s.subnet.id.substring(0, 8)}) - ${(
                s.overlapRatio * 100
              ).toFixed(1)}%`
          ),
        });

        // 4단계: 스태킹 관계 생성
        validVolumes.forEach((vol) => {
          createStackingRelation(newBlock.id, vol.id, allBlocks);
          console.log('🔗 [NewStacking] 부트볼륨 연결:', vol.type);
        });

        if (validSubnets.length > 0) {
          const bestSubnet = validSubnets[0].subnet;
          createStackingRelation(newBlock.id, bestSubnet.id, allBlocks);
          console.log(
            '🔗 [NewStacking] Subnet 연결:',
            bestSubnet.type,
            `(${(validSubnets[0].overlapRatio * 100).toFixed(1)}%)`
          );
        }

        // 위치 조정 없음 (사용자 드래그 위치 유지)
        console.log('🎯 [NewStacking] EC2 사용자 위치 유지');

        // 즉시 연결 업데이트
        const derivedConnections = deriveConnectionsFromStacking(allBlocks);
        const nonStackingConnections = connections.filter(
          (conn) => !conn.properties?.stackConnection
        );
        const allConnections = [...nonStackingConnections, ...derivedConnections];
        setConnections(allConnections);

        console.log(
          '✅ [NewStacking] 스태킹 완료 + 연결 업데이트:',
          derivedConnections.length,
          '개'
        );
      } else {
        // 일반 블록 로직
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
            console.log('🔗 [NewStacking] 스태킹 대상 발견:', targetBlock.type);
            createStackingRelation(newBlock.id, targetBlock.id, allBlocks);

            if (forcePosition) {
              // 위치 조정은 외부에서 처리
              calculateStackedPosition(newBlock, targetBlock);
              console.log('📍 [NewStacking] 위치 강제 조정 필요');
            } else {
              console.log('🎯 [NewStacking] 사용자 위치 유지');
            }
          }

          // 즉시 연결 업데이트
          const derivedConnections = deriveConnectionsFromStacking(allBlocks);
          const nonStackingConnections = connections.filter(
            (conn) => !conn.properties?.stackConnection
          );
          const allConnections = [
            ...nonStackingConnections,
            ...derivedConnections,
          ];
          setConnections(allConnections);

          console.log(
            '✅ [NewStacking] 스태킹 완료 + 연결 업데이트:',
            derivedConnections.length,
            '개'
          );
        } else {
          console.log('ℹ️ [NewStacking] 스태킹 대상 없음');
        }
      }
    },
    [
      canStack,
      validateStacking,
      createStackingRelation,
      calculateStackedPosition,
      deriveConnectionsFromStacking,
      connections,
      setConnections,
    ]
  );

  // 블록 이동 시 스태킹 업데이트
  const handleStackingForMovedBlock = useCallback(
    (blockId: string, allBlocks: DroppedBlock[]): boolean => {
      console.log(
        '🔄🔄🔄 [NewStacking] ===== 이동된 블록 스태킹 업데이트 시작 ====='
      );
      console.log('🔄 [NewStacking] BlockID:', blockId);
      console.log('🔄 [NewStacking] AllBlocks count:', allBlocks.length);

      // 기존 스태킹 관계 제거
      console.log('🗑️ [NewStacking] 기존 스태킹 관계 제거 호출');
      removeStackingRelation(blockId);

      // 새로운 위치에서 스태킹 확인
      const movedBlock = allBlocks.find((block) => block.id === blockId);
      console.log('🔍 [NewStacking] 이동된 블록 찾기:', !!movedBlock);

      if (!movedBlock) {
        console.log('❌ [NewStacking] 이동된 블록을 찾을 수 없음');
        return false;
      }

      // 규칙 기반 검증: VPC/Virtual Network 같은 Foundation 블록은 부모가 필요없음
      const needsParent = requiresParent(movedBlock.type);

      if (!needsParent) {
        console.log(
          '✅ [NewStacking] Foundation 블록 (VPC/Virtual Network) - 스태킹 검증 생략'
        );
        return true;
      }

      console.log('🎯 [NewStacking] 새로운 스태킹 처리 호출');
      handleStackingForNewBlock(movedBlock, allBlocks);

      // 즉시 연결 업데이트
      console.log('🔗 [NewStacking] 연결 업데이트 시작');
      const derivedConnections = deriveConnectionsFromStacking(allBlocks);
      console.log(
        '🔗 [NewStacking] 파생된 연결 수:',
        derivedConnections.length
      );

      // 규칙 기반 검증: 부모가 필요한 블록은 반드시 연결이 있어야 함
      if (needsParent) {
        const hasValidConnection = derivedConnections.some(
          (conn) => conn.fromBlockId === blockId || conn.toBlockId === blockId
        );

        if (!hasValidConnection) {
          console.log(
            `❌ [NewStacking] ${movedBlock.type} 블록이 필수 부모에 연결되지 않음 - 이동 실패`
          );
          console.log(`   필수: ${getStackingHint(movedBlock.type)}`);
          return false;
        }
        console.log(
          `✅ [NewStacking] ${movedBlock.type} 블록이 올바른 부모에 연결됨`
        );
      }

      const nonStackingConnections = connections.filter(
        (conn) => !conn.properties?.stackConnection
      );
      console.log(
        '🔗 [NewStacking] 비스태킹 연결 수:',
        nonStackingConnections.length
      );

      const allConnections = [...nonStackingConnections, ...derivedConnections];
      console.log('🔗 [NewStacking] 총 연결 수:', allConnections.length);

      setConnections(allConnections);

      console.log('✅ [NewStacking] 이동 후 연결 업데이트 완료');
      console.log(
        '🔄🔄🔄 [NewStacking] ===== 이동된 블록 스태킹 업데이트 종료 ====='
      );
      return true;
    },
    [
      removeStackingRelation,
      handleStackingForNewBlock,
      deriveConnectionsFromStacking,
      connections,
      setConnections,
    ]
  );

  return {
    handleStackingForNewBlock,
    handleStackingForMovedBlock,
    removeStackingRelation,
  };
};

// AWS 우선순위에 따른 스태킹 대상 선택
const selectStackingTargetByPriority = (
  block: DroppedBlock,
  potentialTargets: DroppedBlock[]
): DroppedBlock | null => {
  console.log('🎯 [SelectTarget] 스태킹 대상 선택 시작:', {
    blockType: block.type,
    blockId: block.id.substring(0, 8),
    potentialTargets: potentialTargets.map(
      (t) => `${t.type}(${t.id.substring(0, 8)})`
    ),
  });

  // Compute 인스턴스: 거리 기반 우선순위
  const isComputeInstance =
    block.type.includes('ec2') ||
    block.type.includes('compute-engine') ||
    block.type.includes('virtual-machine');
  if (isComputeInstance) {
    const subnetTargets = potentialTargets.filter((t) =>
      t.type.includes('subnet')
    );
    const storageTargets = potentialTargets.filter(
      (t) =>
        t.type.includes('volume') ||
        t.type.includes('ebs') ||
        t.type.includes('disk')
    );

    console.log('🎯 [SelectTarget] EC2 타겟 분류:', {
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
          isStorage:
            target.type.includes('volume') ||
            target.type.includes('ebs') ||
            target.type.includes('disk'),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    console.log(
      '🎯 [SelectTarget] 거리 순 정렬 결과:',
      allTargetsWithDistance.map((t) => ({
        type: t.target.type,
        id: t.target.id.substring(0, 8),
        distance: t.distance.toFixed(2),
        isStorage: t.isStorage,
      }))
    );

    if (allTargetsWithDistance.length > 0) {
      const closest = allTargetsWithDistance[0];
      console.log('🎯 [ProjectEditor] EC2 거리 기반 스태킹 선택:', {
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
    const vpcTarget = potentialTargets.find(
      (t) => t.type.includes('vpc') || t.type.includes('virtual-network')
    );
    if (vpcTarget) return vpcTarget;
  }

  // Storage: Subnet
  const isVolumeDisk =
    block.type.includes('volume') ||
    block.type.includes('ebs') ||
    block.type.includes('disk');
  if (isVolumeDisk) {
    const subnetTarget = potentialTargets.find((t) => t.type.includes('subnet'));
    if (subnetTarget) return subnetTarget;
  }

  // 기타: Y축 높은 순
  return (
    potentialTargets.sort((a, b) => b.position.y - a.position.y)[0] || null
  );
};
