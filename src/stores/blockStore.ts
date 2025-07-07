import { create } from 'zustand';
import { Vector3 } from 'three';
import type { DroppedBlock } from '../types/blocks';

interface BlockState {
  // 블록 관련 상태
  droppedBlocks: DroppedBlock[];
  selectedBlockId: string | null;
  propertiesBlockId: string | null;

  // 드래그 관련 상태
  isDraggingBlock: string | null;
  dragPosition: Vector3 | null;
  isDropPreview: boolean;
  previewPosition: Vector3 | null;
  previewBlockData: any;
  currentDragData: any;

  // 액션들
  setDroppedBlocks: (blocks: DroppedBlock[] | ((prev: DroppedBlock[]) => DroppedBlock[])) => void;
  addBlock: (block: DroppedBlock) => void;
  updateBlock: (blockId: string, updates: Partial<DroppedBlock>) => void;
  deleteBlock: (blockId: string) => void;

  setSelectedBlockId: (id: string | null) => void;
  setPropertiesBlockId: (id: string | null) => void;

  setIsDraggingBlock: (id: string | null) => void;
  setDragPosition: (position: Vector3 | null) => void;
  setDropPreview: (isPreview: boolean, position?: Vector3 | null, blockData?: any) => void;
  setCurrentDragData: (data: any) => void;

  // 복합 액션들
  moveBlock: (blockId: string, newPosition: Vector3) => void;
  resizeBlock: (blockId: string, newSize: [number, number, number]) => void;
  updateBlockProperties: (blockId: string, properties: Partial<DroppedBlock['properties']>) => void;

  // 초기화
  clearAll: () => void;
}

export const useBlockStore = create<BlockState>((set) => ({
  // 초기 상태
  droppedBlocks: [],
  selectedBlockId: null,
  propertiesBlockId: null,
  isDraggingBlock: null,
  dragPosition: null,
  isDropPreview: false,
  previewPosition: null,
  previewBlockData: null,
  currentDragData: null,

  // 기본 액션들
  setDroppedBlocks: (blocks) => set((state) => ({
    droppedBlocks: typeof blocks === 'function' ? blocks(state.droppedBlocks) : blocks
  })),

  addBlock: (block) => set((state) => ({
    droppedBlocks: [...state.droppedBlocks, block]
  })),

  updateBlock: (blockId, updates) => set((state) => ({
    droppedBlocks: state.droppedBlocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    )
  })),

  deleteBlock: (blockId) => set((state) => ({
    droppedBlocks: state.droppedBlocks.filter(block => block.id !== blockId),
    selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
    propertiesBlockId: state.propertiesBlockId === blockId ? null : state.propertiesBlockId,
  })),

  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setPropertiesBlockId: (id) => set({ propertiesBlockId: id }),

  setIsDraggingBlock: (id) => set({ isDraggingBlock: id }),
  setDragPosition: (position) => set({ dragPosition: position }),

  setDropPreview: (isPreview, position = null, blockData = null) => set({
    isDropPreview: isPreview,
    previewPosition: position,
    previewBlockData: blockData
  }),

  setCurrentDragData: (data) => set({ currentDragData: data }),

  // 복합 액션들
  moveBlock: (blockId, newPosition) => set((state) => ({
    droppedBlocks: state.droppedBlocks.map(block =>
      block.id === blockId
        ? { ...block, position: newPosition, timestamp: Date.now() }
        : block
    )
  })),

  resizeBlock: (blockId, newSize) => set((state) => ({
    droppedBlocks: state.droppedBlocks.map(block =>
      block.id === blockId
        ? { ...block, size: newSize, timestamp: Date.now() }
        : block
    )
  })),

  updateBlockProperties: (blockId, properties) => set((state) => ({
    droppedBlocks: state.droppedBlocks.map(block =>
      block.id === blockId
        ? {
          ...block,
          properties: { ...block.properties, ...properties },
          timestamp: Date.now()
        }
        : block
    )
  })),

  clearAll: () => set({
    droppedBlocks: [],
    selectedBlockId: null,
    propertiesBlockId: null,
    isDraggingBlock: null,
    dragPosition: null,
    isDropPreview: false,
    previewPosition: null,
    previewBlockData: null,
    currentDragData: null,
  }),
}));
