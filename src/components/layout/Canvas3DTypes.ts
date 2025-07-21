import { Vector3 } from "three";
import type { DroppedBlock, Connection } from "../../types/blocks";

export interface Canvas3DProps {
  onBlockDrop?: (blockData: any, position: Vector3) => void;
  onBlockClick?: (blockId: string) => void;
  onBlockRightClick?: (blockId: string, event?: MouseEvent) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockMove?: (blockId: string, newPosition: Vector3) => void;
  onBlockResize?: (blockId: string, newSize: [number, number, number]) => void;
  onBlockPropertiesChange?: (
    blockId: string,
    properties: Partial<DroppedBlock["properties"]>
  ) => void;
  onBlockDragStart?: (blockId: string) => void;
  onBlockDragEnd?: (blockId: string) => void;
  onBlockDragUpdate?: (blockId: string, position: Vector3) => void;
  onCanvasClick?: () => void;
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

export interface DragPreviewState {
  isVisible: boolean;
  position: Vector3 | null;
  blockType: string | null;
  blockData: any;
  isValidPosition: boolean;
  snapGuides: SnapGuide[];
  nearbyBlocks: DroppedBlock[];
}

export interface SnapGuide {
  id: string;
  type: 'grid' | 'alignment' | 'edge' | 'stack';
  position: Vector3;
  direction: 'x' | 'y' | 'z';
  color: string;
  opacity: number;
}

export interface DragAndDropState {
  isDragOver: boolean;
  isBlockDragging: boolean;
  dragData: any;
  dragPosition: Vector3 | null;
  preview: DragPreviewState;
}

export interface StackingState {
  stackableBlocks: DroppedBlock[];
  stackingTarget: DroppedBlock | null;
  isValidStack: boolean;
}

export interface ConnectionState {
  hoveredConnection: string | null;
  validConnectionTargets: string[];
  connectionPreview: {
    from: Vector3;
    to: Vector3;
  } | null;
}
