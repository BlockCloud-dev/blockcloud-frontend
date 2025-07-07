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
  completeConnection: (toBlockId: string) => boolean;

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

  completeConnection: (toBlockId) => {
    const state = get();
    if (!state.isConnecting || !state.connectingFrom || state.connectingFrom === toBlockId) {
      return false;
    }

    // 중복 연결 체크
    const existingConnection = state.connections.find(conn =>
      (conn.fromBlockId === state.connectingFrom && conn.toBlockId === toBlockId) ||
      (conn.fromBlockId === toBlockId && conn.toBlockId === state.connectingFrom)
    );

    if (existingConnection) {
      set({ isConnecting: false, connectingFrom: null });
      return false;
    }

    // 새 연결 생성
    const newConnection: Connection = {
      id: `connection_${Date.now()}`,
      fromBlockId: state.connectingFrom,
      toBlockId: toBlockId,
      connectionType: 'ec2-subnet', // 기본값
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
      isConnecting: false,
      connectingFrom: null
    }));

    return true;
  },

  // 스태킹 연결 검출
  detectAndCreateStackingConnections: (blocks) => {
    // 스태킹 연결 검출 로직
    const newConnections: Connection[] = [];

    blocks.forEach(block => {
      blocks.forEach(otherBlock => {
        if (block.id === otherBlock.id) return;

        // 스태킹 조건 확인 (Y 위치 차이와 X,Z 위치 근접성)
        const yDiff = Math.abs(block.position.y - otherBlock.position.y);
        const xDiff = Math.abs(block.position.x - otherBlock.position.x);
        const zDiff = Math.abs(block.position.z - otherBlock.position.z);

        if (yDiff > 0.1 && yDiff < 2.0 && xDiff < 1.0 && zDiff < 1.0) {
          // 스태킹 연결 타입 결정
          let connectionType: Connection['connectionType'] = 'ec2-subnet';

          if (block.type === 'ec2' && otherBlock.type === 'subnet') {
            connectionType = 'ec2-subnet';
          } else if (block.type === 'subnet' && otherBlock.type === 'vpc') {
            connectionType = 'subnet-vpc';
          } else if (block.type === 'ec2' && otherBlock.type === 'volume') {
            connectionType = 'ec2-volume';
          }

          const connection: Connection = {
            id: `stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromBlockId: block.id,
            toBlockId: otherBlock.id,
            connectionType,
            properties: {
              stackConnection: true,
              description: '스태킹 연결',
            },
          };

          newConnections.push(connection);
        }
      });
    });

    // 중복 연결 제거하고 새 연결 추가
    set((state) => {
      const existingConnections = state.connections.filter(conn =>
        !conn.properties?.stackConnection
      );

      return {
        connections: [...existingConnections, ...newConnections]
      };
    });

    console.log('🔗 스태킹 연결 검출 완료:', newConnections.length, '개의 연결 생성');
  },

  clearConnections: () => set({
    connections: [],
    selectedConnection: null,
    isConnecting: false,
    connectingFrom: null
  }),
}));
