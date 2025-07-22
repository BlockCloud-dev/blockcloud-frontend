import { BaseBlock } from "../blocks/BaseBlock";
import { Road } from "../blocks/Road";
import { StackGuide } from "../blocks/StackGuide";
import { StackConnectionLine } from "../blocks/StackConnectionLine";
import { DragPreview } from "../blocks/DragPreview";
import { EnhancedDragPreview } from "../dragAndDrop/EnhancedDragPreview";
import { SnapGuides } from "../dragAndDrop/SnapGuides";
import type { DroppedBlock, Connection } from "../../types/blocks";
import type { DragPreviewState, SnapGuide } from "./Canvas3DTypes";
import { Vector3 } from "three";

interface BlockRendererProps {
  droppedBlocks: DroppedBlock[];
  connections: Connection[];
  selectedBlockId?: string | null;
  selectedConnectionId?: string | null;
  isConnecting?: boolean;
  connectingFrom?: string | null;
  isDraggingBlock?: string | null;
  dragPosition?: Vector3 | null;
  isDropPreview?: boolean;
  previewPosition?: Vector3 | null;
  previewBlockData?: any;
  stackableBlocks?: DroppedBlock[];
  stackingTarget?: DroppedBlock | null;
  isValidStack?: boolean;
  // Enhanced drag preview props
  dragPreviewState?: DragPreviewState;
  snapGuides?: SnapGuide[];
  // 연결 모드 props
  isConnectionMode?: boolean;
  selectedFromBlockId?: string | null;
  onBlockClick?: (blockId: string) => void;
  onBlockRightClick?: (blockId: string, event?: MouseEvent) => void;
  onBlockMove?: (blockId: string, newPosition: Vector3) => void;
  onBlockResize?: (blockId: string, newSize: [number, number, number]) => void;
  onBlockDragStart?: (blockId: string) => void;
  onBlockDragEnd?: (blockId: string) => void;
  onBlockDragUpdate?: (blockId: string, position: Vector3) => void;
  onConnectionClick?: (connection: Connection) => void;
  onConnectionComplete?: (toBlockId: string) => void;
  calculateStackPosition?: (targetBlock: DroppedBlock, draggedBlockType: string) => Vector3;
  getBlockHeight?: (blockType: string, size?: [number, number, number]) => number;
}

// 블록 타입별 색상 매핑
const getBlockColor = (blockType: string): string => {
  const colorMap: Record<string, string> = {
    vpc: "#3b82f6", // blue
    subnet: "#10b981", // green
    ec2: "#f97316", // orange
    volume: "#8b5cf6", // purple
    "security-group": "#ef4444", // red
    "load-balancer": "#eab308", // yellow
  };
  return colorMap[blockType] || "#6b7280"; // default gray
};

export function BlockRenderer({
  droppedBlocks,
  connections,
  selectedBlockId,
  selectedConnectionId,
  isConnecting,
  connectingFrom,
  isDraggingBlock,
  dragPosition,
  isDropPreview,
  previewPosition,
  previewBlockData,
  stackableBlocks = [],
  dragPreviewState,
  snapGuides = [],
  isConnectionMode,
  selectedFromBlockId,
  onBlockClick,
  onBlockRightClick,
  onBlockMove,
  onBlockResize,
  onBlockDragStart,
  onBlockDragEnd,
  onBlockDragUpdate,
  onConnectionClick,
  onConnectionComplete,
}: BlockRendererProps) {
  return (
    <group>
      {/* 드롭된 블록들 렌더링 */}
      {droppedBlocks.map((block) => (
        <BaseBlock
          key={block.id}
          position={[block.position.x, block.position.y, block.position.z]}
          color={getBlockColor(block.type)}
          size={block.size || [1, 1, 1]}
          label={block.properties?.name || block.type}
          blockType={block.type}
          isSelected={selectedBlockId === block.id}
          isConnecting={isConnecting && connectingFrom === block.id}
          isConnectionMode={isConnectionMode}
          isFromBlock={selectedFromBlockId === block.id}
          onClick={() => {
            if (isConnecting && connectingFrom && connectingFrom !== block.id) {
              onConnectionComplete?.(block.id);
            } else {
              onBlockClick?.(block.id);
            }
          }}
          onRightClick={(event) => onBlockRightClick?.(block.id, event)}
          onMove={(newPosition) => onBlockMove?.(block.id, newPosition)}
          onResize={(newSize) => onBlockResize?.(block.id, newSize)}
          onDragStart={() => onBlockDragStart?.(block.id)}
          onDragEnd={() => onBlockDragEnd?.(block.id)}
          onDragUpdate={(position) => onBlockDragUpdate?.(block.id, position)}
        />
      ))}

      {/* 연결선 렌더링 */}
      {connections.map((connection) => {
        const fromBlock = droppedBlocks.find(
          (block) => block.id === connection.fromBlockId
        );
        const toBlock = droppedBlocks.find(
          (block) => block.id === connection.toBlockId
        );

        if (!fromBlock || !toBlock) return null;

        // 스택 연결인지 확인
        const isStackConnection = connection.properties?.stackConnection;

        if (isStackConnection) {
          // 스택 연결선 렌더링
          return (
            <StackConnectionLine
              key={connection.id}
              fromBlock={fromBlock}
              toBlock={toBlock}
              stackLevel={0}
            />
          );
        } else {
          // 일반 도로 연결선 렌더링
          return (
            <Road
              key={connection.id}
              connection={connection}
              fromPosition={fromBlock.position}
              toPosition={toBlock.position}
              isSelected={selectedConnectionId === connection.id}
              onClick={() => onConnectionClick?.(connection)}
            />
          );
        }
      })}

      {/* 스택 가이드 렌더링 */}
      {isDraggingBlock && dragPosition && (
        <StackGuide
          position={[dragPosition.x, dragPosition.y, dragPosition.z]}
          targetBlocks={stackableBlocks}
          isDragging={!!isDraggingBlock}
        />
      )}

      {/* 드롭 미리보기 렌더링 */}
      {isDropPreview && previewPosition && previewBlockData && (
        <DragPreview
          position={previewPosition}
          blockSize={previewBlockData.size || [1, 1, 1]}
          isValidPosition={true}
          canStack={stackableBlocks.length > 0}
          targetBlocks={stackableBlocks}
        />
      )}

      {/* Enhanced Drag Preview 렌더링 */}
      {dragPreviewState && dragPreviewState.isVisible && (
        <EnhancedDragPreview
          previewState={dragPreviewState}
        />
      )}

      {/* Snap Guides 렌더링 */}
      <SnapGuides guides={snapGuides} />
    </group>
  );
}
