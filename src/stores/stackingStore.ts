import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DroppedBlock, Connection, ConnectionType } from '../types/blocks';
import { Vector3 } from 'three';

// 스태킹 상태 타입 정의
interface StackingState {
  isStacked: boolean;
  parentBlockId?: string;  // 무엇 위에 스택되었는지
  childBlockIds: string[]; // 무엇이 이 블록 위에 스택되었는지
  stackingType: 'foundation' | 'compute' | 'storage' | 'boot-volume';
}

// 스태킹 규칙 정의
interface StackingRule {
  childType: string;
  parentType: string;
  connectionType: ConnectionType;
  isBootVolume?: boolean;
}

// 스태킹 미리보기 상태
interface StackingPreview {
  isValid: boolean;
  targetBlockId?: string;
  stackingType?: string;
  willCreateBootVolume: boolean;
  previewPosition?: Vector3;
}

interface StackingStoreState {
  // 상태
  stackingStates: Map<string, StackingState>; // blockId -> stackingState
  stackingPreview: StackingPreview | null;
  stackingRules: StackingRule[];

  // 액션
  setStackingState: (blockId: string, state: StackingState) => void;
  removeStackingState: (blockId: string) => void;
  clearStackingStates: () => void;

  // 스태킹 검증
  canStack: (childType: string, parentType: string) => boolean;
  validateStacking: (childBlock: DroppedBlock, parentBlock: DroppedBlock) => boolean;

  // 스태킹 관계 관리
  createStackingRelation: (childId: string, parentId: string, blocks: DroppedBlock[]) => void;
  removeStackingRelation: (blockId: string) => void;

  // 미리보기
  setStackingPreview: (preview: StackingPreview | null) => void;

  // 연결 파생
  deriveConnectionsFromStacking: (blocks: DroppedBlock[]) => Connection[];

  // 위치 계산
  calculateStackedPosition: (childBlock: DroppedBlock, parentBlock: DroppedBlock) => Vector3;
}

// AWS 스태킹 규칙 정의
const AWS_STACKING_RULES: StackingRule[] = [
  // 네트워킹 계층
  { childType: 'subnet', parentType: 'vpc', connectionType: 'vpc-subnet' },

  // 컴퓨팅 리소스
  { childType: 'ec2', parentType: 'subnet', connectionType: 'subnet-ec2' },
  { childType: 'ec2', parentType: 'volume', connectionType: 'volume-ec2-boot', isBootVolume: true },
  { childType: 'ec2', parentType: 'ebs', connectionType: 'ebs-ec2-boot', isBootVolume: true },

  // 스토리지
  { childType: 'volume', parentType: 'subnet', connectionType: 'subnet-volume' },
  { childType: 'ebs', parentType: 'subnet', connectionType: 'subnet-ebs' },

  // 보안
  { childType: 'security-group', parentType: 'subnet', connectionType: 'subnet-security-group' },

  // 로드밸런서
  { childType: 'load-balancer', parentType: 'subnet', connectionType: 'subnet-load-balancer' },

  // 데이터베이스 (기존 타입 사용)
  { childType: 'rds', parentType: 'subnet', connectionType: 'subnet-load-balancer' },
];

export const useStackingStore = create<StackingStoreState>()(
  subscribeWithSelector((set, get) => ({
    // 초기 상태
    stackingStates: new Map(),
    stackingPreview: null,
    stackingRules: AWS_STACKING_RULES,

    // 기본 액션
    setStackingState: (blockId, state) => set(prev => ({
      stackingStates: new Map(prev.stackingStates).set(blockId, state)
    })),

    removeStackingState: (blockId) => set(prev => {
      const newMap = new Map(prev.stackingStates);
      newMap.delete(blockId);
      return { stackingStates: newMap };
    }),

    clearStackingStates: () => set({ stackingStates: new Map() }),

    // 스태킹 검증
    canStack: (childType, parentType) => {
      const rules = get().stackingRules;
      return rules.some(rule =>
        rule.childType === childType && rule.parentType === parentType
      );
    },

    validateStacking: (childBlock, parentBlock) => {
      const { canStack } = get();

      console.log('🔍 [ValidateStacking] 스태킹 검증 시작:', {
        child: `${childBlock.type}(${childBlock.id.substring(0, 8)})`,
        parent: `${parentBlock.type}(${parentBlock.id.substring(0, 8)})`,
        childPos: [childBlock.position.x, childBlock.position.y, childBlock.position.z],
        parentPos: [parentBlock.position.x, parentBlock.position.y, parentBlock.position.z]
      });

      // 1. 타입 규칙 검증
      const typeCheck = canStack(childBlock.type, parentBlock.type);
      console.log('🔍 [ValidateStacking] 타입 규칙 검증:', typeCheck);
      if (!typeCheck) {
        return false;
      }

      // 2. 위치 검증 (겹침 확인) - 더 유연하게
      const childBounds = {
        xMin: childBlock.position.x - (childBlock.size?.[0] || 1) / 2,
        xMax: childBlock.position.x + (childBlock.size?.[0] || 1) / 2,
        zMin: childBlock.position.z - (childBlock.size?.[2] || 1) / 2,
        zMax: childBlock.position.z + (childBlock.size?.[2] || 1) / 2,
      };

      const parentBounds = {
        xMin: parentBlock.position.x - (parentBlock.size?.[0] || 1) / 2,
        xMax: parentBlock.position.x + (parentBlock.size?.[0] || 1) / 2,
        zMin: parentBlock.position.z - (parentBlock.size?.[2] || 1) / 2,
        zMax: parentBlock.position.z + (parentBlock.size?.[2] || 1) / 2,
      };

      // 겹침 조건을 더 관대하게 (부분 겹침도 허용)
      const xOverlap = childBounds.xMax > parentBounds.xMin && childBounds.xMin < parentBounds.xMax;
      const zOverlap = childBounds.zMax > parentBounds.zMin && childBounds.zMin < parentBounds.zMax;

      console.log('🔍 [ValidateStacking] 겹침 검사:', { xOverlap, zOverlap });

      // 또는 일정 거리 내에 있으면 스태킹 가능 (사용자 자유도 증가)
      const distance = Math.sqrt(
        Math.pow(childBlock.position.x - parentBlock.position.x, 2) +
        Math.pow(childBlock.position.z - parentBlock.position.z, 2)
      );

      // 부트볼륨 관련 스태킹(EC2-Volume/EBS)은 거리 제한을 더 관대하게
      let maxStackingDistance: number;
      if ((childBlock.type === 'ec2' && (parentBlock.type === 'volume' || parentBlock.type === 'ebs')) ||
        (parentBlock.type === 'ec2' && (childBlock.type === 'volume' || childBlock.type === 'ebs'))) {
        // 부트볼륨 연결은 더 넓은 범위 허용 (최대 6.0 거리까지)
        maxStackingDistance = 6.0;
      } else {
        // 기본 스태킹은 블록 크기 기반
        maxStackingDistance = Math.max(
          (parentBlock.size?.[0] || 1) * 0.8,
          (parentBlock.size?.[2] || 1) * 0.8
        );
      }

      const isWithinRange = distance <= maxStackingDistance;
      console.log('🔍 [ValidateStacking] 거리 검사:', {
        distance: distance.toFixed(2),
        maxDistance: maxStackingDistance.toFixed(2),
        isWithinRange,
        isBootVolumeCase: (childBlock.type === 'ec2' && (parentBlock.type === 'volume' || parentBlock.type === 'ebs'))
      });

      // 3. Y축 차이 검증 (더 관대하게)
      const yDiff = Math.abs(childBlock.position.y - parentBlock.position.y);
      const isProperHeight = yDiff > 0.05 && yDiff < 5.0; // 더 넓은 범위
      console.log('🔍 [ValidateStacking] Y축 검사:', { yDiff: yDiff.toFixed(2), isProperHeight });

      const result = (xOverlap && zOverlap) || (isWithinRange && isProperHeight);
      console.log('🔍 [ValidateStacking] 최종 결과:', result);

      return result;
    },

    // 스태킹 관계 생성
    createStackingRelation: (childId, parentId, blocks) => {
      const { stackingStates, stackingRules } = get();

      const childBlock = blocks.find(b => b.id === childId);
      const parentBlock = blocks.find(b => b.id === parentId);

      if (!childBlock || !parentBlock) return;

      // 스태킹 규칙 찾기
      const rule = stackingRules.find(r =>
        r.childType === childBlock.type && r.parentType === parentBlock.type
      );

      if (!rule) return;

      // 자식 블록 스태킹 상태 업데이트
      const childStackingState: StackingState = {
        isStacked: true,
        parentBlockId: parentId,
        childBlockIds: [],
        stackingType: rule.isBootVolume ? 'boot-volume' :
          childBlock.type === 'vpc' || childBlock.type === 'subnet' ? 'foundation' :
            childBlock.type === 'ec2' ? 'compute' : 'storage'
      };

      // 부모 블록 자식 목록 업데이트
      const parentStackingState = stackingStates.get(parentId) || {
        isStacked: false,
        childBlockIds: [],
        stackingType: 'foundation' as const
      };

      const updatedParentState = {
        ...parentStackingState,
        childBlockIds: [...parentStackingState.childBlockIds, childId]
      };

      // 상태 업데이트
      set(prev => {
        const newMap = new Map(prev.stackingStates);
        newMap.set(childId, childStackingState);
        newMap.set(parentId, updatedParentState);
        return { stackingStates: newMap };
      });

      console.log('🔗 스태킹 관계 생성:', {
        child: `${childBlock.type}(${childId.substring(0, 8)})`,
        parent: `${parentBlock.type}(${parentId.substring(0, 8)})`,
        connectionType: rule.connectionType,
        isBootVolume: rule.isBootVolume
      });
    },

    // 스태킹 관계 제거
    removeStackingRelation: (blockId) => {
      const { stackingStates } = get();
      const blockState = stackingStates.get(blockId);

      if (!blockState) return;

      set(prev => {
        const newMap = new Map(prev.stackingStates);

        // 자신의 스태킹 상태 제거
        newMap.delete(blockId);

        // 부모에서 자신을 제거
        if (blockState.parentBlockId) {
          const parentState = newMap.get(blockState.parentBlockId);
          if (parentState) {
            newMap.set(blockState.parentBlockId, {
              ...parentState,
              childBlockIds: parentState.childBlockIds.filter(id => id !== blockId)
            });
          }
        }

        // 자식들의 부모 정보 제거
        blockState.childBlockIds.forEach(childId => {
          const childState = newMap.get(childId);
          if (childState) {
            newMap.set(childId, {
              ...childState,
              isStacked: false,
              parentBlockId: undefined
            });
          }
        });

        return { stackingStates: newMap };
      });

      console.log('🗑️ 스태킹 관계 제거:', blockId.substring(0, 8));
    },

    // 미리보기 설정
    setStackingPreview: (preview) => set({ stackingPreview: preview }),

    // 연결 파생 (스태킹 상태에서 자동 생성)
    deriveConnectionsFromStacking: (blocks) => {
      const { stackingStates, stackingRules } = get();
      const connections: Connection[] = [];

      // 각 스택된 블록에 대해 연결 생성
      for (const [blockId, state] of stackingStates.entries()) {
        if (!state.isStacked || !state.parentBlockId) continue;

        const childBlock = blocks.find(b => b.id === blockId);
        const parentBlock = blocks.find(b => b.id === state.parentBlockId);

        if (!childBlock || !parentBlock) continue;

        const rule = stackingRules.find(r =>
          r.childType === childBlock.type && r.parentType === parentBlock.type
        );

        if (!rule) continue;

        // 결정적 연결 ID 생성
        const connectionId = `${rule.connectionType}_${[state.parentBlockId, blockId].sort().join('_')}`;

        const connection: Connection = {
          id: connectionId,
          fromBlockId: state.parentBlockId,
          toBlockId: blockId,
          connectionType: rule.connectionType,
          properties: {
            stackConnection: true,
            description: rule.isBootVolume
              ? `${parentBlock.type} → ${childBlock.type} 부트 볼륨 연결`
              : `${parentBlock.type} → ${childBlock.type} 스태킹 연결`,
            ...(rule.isBootVolume && {
              volumeType: 'boot' as const,
              isRootVolume: true,
              deviceName: '/dev/sda1',
              deleteOnTermination: true
            })
          }
        };

        connections.push(connection);

        if (rule.isBootVolume) {
          console.log('🥾 [StackingStore] 부트볼륨 연결 생성:', {
            connection: connectionId,
            from: `${parentBlock.type}(${state.parentBlockId.substring(0, 8)})`,
            to: `${childBlock.type}(${blockId.substring(0, 8)})`,
            type: rule.connectionType
          });
        }
      }

      console.log('📊 스태킹에서 연결 파생:', connections.length, '개');
      return connections;
    },

    // 도로 연결 생성 (같은 평면의 블록들 간)
    createRoadConnections: (blocks: DroppedBlock[]) => {
      const roadConnections: Connection[] = [];

      // EC2와 EBS 간의 도로 연결 찾기
      const ec2Blocks = blocks.filter(b => b.type === 'ec2');
      const ebsBlocks = blocks.filter(b => b.type === 'ebs' || b.type === 'volume');

      ec2Blocks.forEach(ec2 => {
        ebsBlocks.forEach(ebs => {
          // 같은 높이(Y축)에 있고 가까운 거리에 있는지 확인
          const yDiff = Math.abs(ec2.position.y - ebs.position.y);
          const distance = Math.sqrt(
            Math.pow(ec2.position.x - ebs.position.x, 2) +
            Math.pow(ec2.position.z - ebs.position.z, 2)
          );

          // 같은 평면(Y축 차이 0.5 이하)이고 도로 연결 거리(3.0 이하) 내에 있으면 연결
          // 단, 너무 가까우면(1.5 이하) 스태킹으로 처리하므로 제외
          if (yDiff <= 0.5 && distance <= 3.0 && distance > 1.5) {
            const connectionId = `road_${[ec2.id, ebs.id].sort().join('_')}`;

            const roadConnection: Connection = {
              id: connectionId,
              fromBlockId: ec2.id,
              toBlockId: ebs.id,
              connectionType: 'ebs-ec2-block',
              properties: {
                roadConnection: true,
                description: `${ec2.type} ↔ ${ebs.type} 도로 연결 (블록 볼륨)`,
                volumeType: 'block' as const,
                isRootVolume: false,
                distance: distance.toFixed(2)
              }
            };

            roadConnections.push(roadConnection);

            console.log('🛣️ [StackingStore] 도로 연결 생성:', {
              connection: connectionId,
              from: `${ec2.type}(${ec2.id.substring(0, 8)})`,
              to: `${ebs.type}(${ebs.id.substring(0, 8)})`,
              distance: distance.toFixed(2),
              yDiff: yDiff.toFixed(2)
            });
          }
        });
      });

      return roadConnections;
    },

    // 스택된 위치 계산
    calculateStackedPosition: (childBlock, parentBlock) => {
      const parentHeight = parentBlock.type === 'vpc' || parentBlock.type === 'subnet'
        ? (parentBlock.size?.[1] || 0.2)
        : (parentBlock.size?.[1] || 1);

      const childHeight = childBlock.size?.[1] || 1;

      return new Vector3(
        parentBlock.position.x,
        parentBlock.position.y + parentHeight / 2 + childHeight / 2,
        parentBlock.position.z
      );
    }
  }))
);

// 스태킹 상태 변경 시 자동으로 연결 업데이트하는 구독
useStackingStore.subscribe(
  (state) => state.stackingStates,
  (_stackingStates) => {
    console.log('🔄 스태킹 상태 변경됨, 연결 업데이트 필요');
    // 여기서 connectionStore 업데이트 트리거
  },
  { equalityFn: (a, b) => a.size === b.size }
);
