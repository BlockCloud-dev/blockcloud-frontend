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
    connections: state.connections.filter(conn => conn.id !== connectionId)
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

  completeConnection: (toBlockId, _fromBlock, _toBlock) => {
    const { connectingFrom } = get();
    if (!connectingFrom || connectingFrom === toBlockId) {
      return false;
    }

    const newConnection: Connection = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromBlockId: connectingFrom,
      toBlockId,
      connectionType: 'ec2-volume', // 기본값, 실제로는 블록 타입에 따라 결정
      properties: {
        description: '수동 생성 연결',
        stackConnection: false
      }
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
      isConnecting: false,
      connectingFrom: null
    }));

    return true;
  },

  clearConnections: () => set({
    connections: [],
    selectedConnection: null,
    isConnecting: false,
    connectingFrom: null
  }),
}));
