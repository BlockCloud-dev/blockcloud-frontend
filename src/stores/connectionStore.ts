import { create } from 'zustand';
import type { Connection, DroppedBlock, ConnectionType } from '../types/blocks';

interface ConnectionState {
  // 연결 관련 상태
  connections: Connection[];
  selectedConnection: Connection | null;
  isConnecting: boolean;
  connectingFrom: string | null;

  // UI 연결 모드 (패널 클릭 연결용)
  isConnectionMode: boolean;
  selectedFromBlockId: string | null;

  // 액션들
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;
  deleteConnection: (connectionId: string) => void;
  deleteConnectionsForBlock: (blockId: string) => void;

  setSelectedConnection: (connection: Connection | null) => void;

  // 통합된 연결 모드 관리
  startConnecting: (fromBlockId: string) => void;
  cancelConnecting: () => void;
  completeConnection: (toBlockId: string, fromBlock?: DroppedBlock, toBlock?: DroppedBlock) => boolean;

  // UI 연결 모드 (패널용)
  setConnectionMode: (isActive: boolean) => void;
  setSelectedFromBlockId: (blockId: string | null) => void;
  resetConnectionMode: () => void;

  // 초기화
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // 초기 상태
  connections: [],
  selectedConnection: null,
  isConnecting: false,
  connectingFrom: null,
  isConnectionMode: false,
  selectedFromBlockId: null,

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

  // 통합된 연결 모드 관리 (Shift+우클릭용)
  startConnecting: (fromBlockId) => set({
    isConnecting: true,
    connectingFrom: fromBlockId,
    // UI 연결 모드도 함께 동기화
    isConnectionMode: true,
    selectedFromBlockId: fromBlockId
  }),

  cancelConnecting: () => set({
    isConnecting: false,
    connectingFrom: null,
    isConnectionMode: false,
    selectedFromBlockId: null
  }),

  // UI 연결 모드 관리 (패널 클릭용)
  setConnectionMode: (isActive) => set(() => ({
    isConnectionMode: isActive,
    // 연결 모드 비활성화 시 모든 연결 상태 초기화
    ...(isActive ? {} : {
      isConnecting: false,
      connectingFrom: null,
      selectedFromBlockId: null
    })
  })),

  setSelectedFromBlockId: (blockId) => set(() => ({
    selectedFromBlockId: blockId,
    // 첫 번째 블록 선택 시 연결 모드 활성화
    ...(blockId ? {
      isConnecting: true,
      connectingFrom: blockId
    } : {})
  })),

  resetConnectionMode: () => set({
    isConnectionMode: false,
    selectedFromBlockId: null,
    isConnecting: false,
    connectingFrom: null
  }),

  completeConnection: (toBlockId, fromBlock, toBlock) => {
    const { connectingFrom, connections } = get();

    if (!connectingFrom || connectingFrom === toBlockId) {
      console.log('🔗 [CONNECTION_STORE] Invalid connection state');
      return false;
    }

    // 기존 연결 확인
    const existingConnection = connections.find(conn =>
      (conn.fromBlockId === connectingFrom && conn.toBlockId === toBlockId) ||
      (conn.fromBlockId === toBlockId && conn.toBlockId === connectingFrom)
    );

    if (existingConnection) {
      console.log('⚠️ [CONNECTION_STORE] Connection already exists');
      get().resetConnectionMode();
      return false;
    }

    // 간단한 연결 검증 (실제 검증은 useConnections에서 처리)
    if (fromBlock && toBlock) {
      // 연결 타입 결정 (벤더 무관)
      let connectionType: ConnectionType = 'compute-volume';
      let properties: any = { description: '수동 생성 연결' };

      // Volume/Disk와 Compute 간의 연결 (벤더 무관)
      const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');
      const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');

      if ((isVolume(fromBlock.type) && isCompute(toBlock.type)) ||
        (isCompute(fromBlock.type) && isVolume(toBlock.type))) {
        connectionType = 'compute-volume';
        properties = {
          volumeType: 'additional',
          description: 'Block Volume (Manual Road Connection)'
        };
      }

      const newConnection: Connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromBlockId: connectingFrom,
        toBlockId,
        connectionType,
        properties
      };

      set((state) => ({
        connections: [...state.connections, newConnection],
        isConnecting: false,
        connectingFrom: null,
        isConnectionMode: false,
        selectedFromBlockId: null
      }));

      console.log('✅ [CONNECTION_STORE] Connection created:', {
        from: fromBlock.type,
        to: toBlock.type,
        type: connectionType
      });

      return true;
    }

    get().resetConnectionMode();
    return false;
  },

  clearConnections: () => set({
    connections: [],
    selectedConnection: null,
    isConnecting: false,
    connectingFrom: null,
    isConnectionMode: false,
    selectedFromBlockId: null
  }),
}));
