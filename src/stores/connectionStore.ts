import { create } from 'zustand';
import type { Connection, DroppedBlock } from '../types/blocks';

interface ConnectionState {
  // 연결 관련 상태
  connections: Connection[];
  selectedConnection: Connection | null;
  isConnecting: boolean;
  connectingFrom: string | null;

  // 액션들
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;
  deleteConnection: (connectionId: string) => void;
  deleteConnectionsForBlock: (blockId: string) => void;

  setSelectedConnection: (connection: Connection | null) => void;

  // 연결 모드 관련
  startConnecting: (fromBlockId: string) => void;
  cancelConnecting: () => void;
  completeConnection: (toBlockId: string, fromBlock?: DroppedBlock, toBlock?: DroppedBlock) => boolean;

  // 스태킹 연결 검출
  detectAndCreateStackingConnections: (blocks: DroppedBlock[]) => void;

  // 초기화
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // 초기 상태
  connections: [],
  selectedConnection: null,
  isConnecting: false,
  connectingFrom: null,

  // 기본 액션들
  setConnections: (connections) => set({ connections }),

  addConnection: (connection) => set((state) => ({
    connections: [...state.connections, connection]
  })),

  updateConnection: (connectionId, updates) => set((state) => ({
    connections: state.connections.map(conn =>
      conn.id === connectionId ? { ...conn, ...updates } : conn
    )
  })),

  deleteConnection: (connectionId) => set((state) => ({
    connections: state.connections.filter(conn => conn.id !== connectionId),
    selectedConnection: state.selectedConnection?.id === connectionId ? null : state.selectedConnection
  })),

  deleteConnectionsForBlock: (blockId) => set((state) => ({
    connections: state.connections.filter(conn =>
      conn.fromBlockId !== blockId && conn.toBlockId !== blockId
    )
  })),

  setSelectedConnection: (connection) => set({ selectedConnection: connection }),

  // 연결 모드 관련
  startConnecting: (fromBlockId) => set({
    isConnecting: true,
    connectingFrom: fromBlockId
  }),

  cancelConnecting: () => set({
    isConnecting: false,
    connectingFrom: null
  }),

  completeConnection: (toBlockId, fromBlock, toBlock) => {
    const state = get();

    // fromBlock과 toBlock이 없으면 실패
    if (!fromBlock || !toBlock) {
      return false;
    }

    // 같은 블록끼리 연결 시도하면 실패
    if (fromBlock.id === toBlock.id) {
      return false;
    }

    // 중복 연결 체크 (fromBlock.id와 toBlockId 사용)
    const existingConnection = state.connections.find(conn =>
      (conn.fromBlockId === fromBlock.id && conn.toBlockId === toBlockId) ||
      (conn.fromBlockId === toBlockId && conn.toBlockId === fromBlock.id)
    );

    if (existingConnection) {
      console.log("❌ 이미 존재하는 연결:", fromBlock.id, "↔", toBlockId);
      // 기존 연결 모드가 활성화되어 있다면 비활성화
      if (state.isConnecting) {
        set({ isConnecting: false, connectingFrom: null });
      }
      return false;
    }

    // 연결 타입 결정 (수동 연결 - 단방향만 허용)
    let connectionType: Connection['connectionType'] | null = null;

    if (fromBlock && toBlock) {
      // AWS 계층 구조에 맞는 연결만 허용 (VPC → Subnet → Resources)
      if (fromBlock.type === 'vpc' && toBlock.type === 'subnet') {
        connectionType = 'vpc-subnet';
      } else if (fromBlock.type === 'subnet' && toBlock.type === 'volume') {
        connectionType = 'subnet-volume';
      } else if (fromBlock.type === 'subnet' && toBlock.type === 'ec2') {
        connectionType = 'subnet-ec2';
      } else if (fromBlock.type === 'volume' && toBlock.type === 'ec2') {
        connectionType = 'volume-ec2';
      } else if (fromBlock.type === 'subnet' && toBlock.type === 'security-group') {
        connectionType = 'subnet-security-group';
      } else if (fromBlock.type === 'subnet' && toBlock.type === 'load-balancer') {
        connectionType = 'subnet-load-balancer';
        // 로드밸런서 관련 연결들 추가
      } else if (fromBlock.type === 'load-balancer' && toBlock.type === 'ec2') {
        connectionType = 'load-balancer-ec2';
      } else if (fromBlock.type === 'load-balancer' && toBlock.type === 'security-group') {
        connectionType = 'load-balancer-security-group';
      } else {
        // 잘못된 방향의 연결 시도
        console.log(`❌ 잘못된 연결 방향: ${fromBlock.type} → ${toBlock.type}`);
        // 기존 연결 모드가 활성화되어 있다면 비활성화
        if (state.isConnecting) {
          set({ isConnecting: false, connectingFrom: null });
        }
        return false;
      }
    }

    if (!connectionType) {
      console.log("❌ 지원하지 않는 연결 타입:", fromBlock.type, "→", toBlock.type);
      // 기존 연결 모드가 활성화되어 있다면 비활성화
      if (state.isConnecting) {
        set({ isConnecting: false, connectingFrom: null });
      }
      return false;
    }

    // 새 연결 생성
    const newConnection: Connection = {
      id: `connection_${Date.now()}`,
      fromBlockId: fromBlock.id,
      toBlockId: toBlockId,
      connectionType: connectionType,
      properties: {
        // EBS 블록 볼륨인 경우 추가 정보
        ...(connectionType.includes('ebs-block') && {
          volumeType: 'additional',
          description: 'Block Volume (Manual Connection)'
        })
      }
    };

    console.log("✅ 연결 생성 성공:", fromBlock.type, "→", toBlock.type, "타입:", connectionType);

    set((state) => ({
      connections: [...state.connections, newConnection],
      isConnecting: false,
      connectingFrom: null
    }));

    return true;
  },

  // 스태킹 연결 검출
  detectAndCreateStackingConnections: (blocks) => {
    console.log("🔍 스태킹 연결 검출 시작:", blocks.length, "개의 블록");

    // 기존 스태킹 연결들 제거
    const nonStackingConnections = get().connections.filter(conn =>
      !conn.properties?.stackConnection
    );

    const newConnections: Connection[] = [];
    const processedPairs = new Set<string>(); // 중복 처리 방지

    // 이중 루프 최적화: i < j로 중복 제거
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        // 블록 쌍 ID 생성 (정렬된 순서로)
        const pairId = [block1.id, block2.id].sort().join('-');
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        // 스태킹 조건 확인 (블록이 겹치면서 Y축 차이가 있는 경우)
        const yDiff = Math.abs(block1.position.y - block2.position.y);

        // Y축 차이가 너무 작으면 스택킹이 아님
        if (yDiff < 0.1 || yDiff > 3.0) continue;

        // 블록의 실제 경계 계산 (중심점 + 크기/2)
        const block1Bounds = {
          xMin: block1.position.x - (block1.size?.[0] || 1) / 2,
          xMax: block1.position.x + (block1.size?.[0] || 1) / 2,
          zMin: block1.position.z - (block1.size?.[2] || 1) / 2,
          zMax: block1.position.z + (block1.size?.[2] || 1) / 2,
        };

        const block2Bounds = {
          xMin: block2.position.x - (block2.size?.[0] || 1) / 2,
          xMax: block2.position.x + (block2.size?.[0] || 1) / 2,
          zMin: block2.position.z - (block2.size?.[2] || 1) / 2,
          zMax: block2.position.z + (block2.size?.[2] || 1) / 2,
        };

        // 두 블록이 X, Z축에서 겹치는지 확인
        const xOverlap = block1Bounds.xMax > block2Bounds.xMin && block1Bounds.xMin < block2Bounds.xMax;
        const zOverlap = block1Bounds.zMax > block2Bounds.zMin && block1Bounds.zMin < block2Bounds.zMax;
        const isOverlapping = xOverlap && zOverlap;

        if (!isOverlapping) continue;

        console.log("🔍 스택킹 감지됨:", {
          block1: `${block1.type} (${block1.id.substring(0, 8)})`,
          block2: `${block2.type} (${block2.id.substring(0, 8)})`,
          yDiff,
          isOverlapping
        });

        // 위에 있는 블록과 아래 있는 블록 결정
        const upperBlock = block1.position.y > block2.position.y ? block1 : block2;
        const lowerBlock = block1.position.y > block2.position.y ? block2 : block1;

        // AWS 계층 구조에 맞는 스태킹 연결 타입 결정
        let connectionType: Connection['connectionType'] = 'subnet-ec2';

        // 스태킹에서는 상위 블록이 하위 블록에 연결되는 구조 (VPC → Subnet → Resources)
        if (lowerBlock.type === 'vpc' && upperBlock.type === 'subnet') {
          connectionType = 'vpc-subnet';
        } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'ec2') {
          connectionType = 'subnet-ec2';
        } else if (lowerBlock.type === 'ebs' && upperBlock.type === 'ec2') {
          // EC2가 EBS 위에 스태킹되면 부트 볼륨
          connectionType = 'ebs-ec2-boot';
        } else if (lowerBlock.type === 'volume' && upperBlock.type === 'ec2') {
          // EC2가 Volume(EBS) 위에 스태킹되면 부트 볼륨
          connectionType = 'volume-ec2-boot';
        } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'ebs') {
          connectionType = 'subnet-ebs';
        } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'volume') {
          // Volume이 Subnet 위에 스태킹 (블록 볼륨)
          connectionType = 'subnet-volume';
        } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'security-group') {
          connectionType = 'subnet-security-group';
        } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'load-balancer') {
          connectionType = 'subnet-load-balancer';
        } else {
          // 지원되지 않는 스택킹 조합이면 건너뛰기
          console.log("⚠️ 지원되지 않는 스택킹 조합:", lowerBlock.type, "→", upperBlock.type);
          continue;
        }

        // 이미 존재하는 연결인지 확인
        const existingConnection = newConnections.find(conn =>
          (conn.fromBlockId === lowerBlock.id && conn.toBlockId === upperBlock.id) ||
          (conn.fromBlockId === upperBlock.id && conn.toBlockId === lowerBlock.id)
        );

        if (existingConnection) {
          console.log("⚠️ 중복 연결 건너뛰기:", lowerBlock.type, "↔", upperBlock.type);
          continue;
        }

        // 연결 속성 결정
        const baseProperties = {
          stackConnection: true,
          description: `${lowerBlock.type} → ${upperBlock.type} 스태킹 연결`,
        };

        // EBS/Volume 부트 볼륨인 경우 추가 정보
        const connectionProperties = (connectionType === 'ebs-ec2-boot' || connectionType === 'volume-ec2-boot')
          ? {
            ...baseProperties,
            volumeType: 'boot' as const,
            isRootVolume: true,
            description: connectionType === 'volume-ec2-boot'
              ? 'Boot Volume (EC2 Stacked on Volume)'
              : 'Boot Volume (EC2 Stacked on EBS)',
          }
          : connectionType === 'subnet-volume'
            ? {
              ...baseProperties,
              volumeType: 'block' as const,
              description: 'Block Volume (Volume on Subnet)',
            }
            : baseProperties;

        const connection: Connection = {
          id: `stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromBlockId: lowerBlock.id, // AWS 계층 구조: 상위에서 하위로
          toBlockId: upperBlock.id,
          connectionType,
          properties: connectionProperties,
        };

        newConnections.push(connection);
        console.log("🔗 스태킹 연결 생성:", {
          from: `${lowerBlock.type} (${lowerBlock.id.substring(0, 8)})`,
          to: `${upperBlock.type} (${upperBlock.id.substring(0, 8)})`,
          connectionType,
          isBootVolume: connectionType === 'ebs-ec2-boot'
        });
      }
    }

    // 연결 업데이트
    set({
      connections: [...nonStackingConnections, ...newConnections]
    });

    console.log('🔗 스태킹 연결 검출 완료:', newConnections.length, '개의 새 연결 생성');
  },

  clearConnections: () => set({
    connections: [],
    selectedConnection: null,
    isConnecting: false,
    connectingFrom: null
  }),
}));
