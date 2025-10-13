import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Vector3 } from "three";

import { BlockRenderer } from "./BlockRenderer";
import { useDragAndDrop } from "./useDragAndDrop";
import { useStacking } from "./useStacking";
import { useConnectionStore } from "../../stores";
import type { Canvas3DProps } from "./Canvas3DTypes";

export function Canvas3D({
  onBlockDrop,
  onBlockClick,
  onBlockRightClick,
  onBlockMove,
  onBlockResize,
  onBlockDragStart,
  onBlockDragEnd,
  onBlockDragUpdate,
  onCanvasClick,
  droppedBlocks = [],
  selectedBlockId,
  connections = [],
  selectedConnectionId,
  isConnecting = false,
  connectingFrom,
  onConnectionClick,
  onConnectionComplete,
  // onDeleteConnection, // 레거시 - 더 이상 사용되지 않음
  isDraggingBlock,
  dragPosition,
  onDragPreview,
  onDragPreviewEnd,
  isDropPreview = false,
  previewPosition,
  previewBlockData,
  currentDragData,
}: Canvas3DProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // 연결 모드 상태 (ConnectionStore에서 가져옴)
  const isConnectionMode = useConnectionStore((state) => state.isConnectionMode);
  const selectedFromBlockId = useConnectionStore((state) => state.selectedFromBlockId);  // 블록 드래그 상태 관리 (카메라 컨트롤 비활성화용)
  const [isAnyBlockDragging, setIsAnyBlockDragging] = useState(false);

  // 드래그 앤 드롭 로직
  const {
    dragState,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    updateDragPreview,
  } = useDragAndDrop(droppedBlocks, onBlockDrop, onDragPreview, onDragPreviewEnd, currentDragData);

  // 스태킹 로직
  const {
    stackableBlocks,
  } = useStacking(droppedBlocks, dragPosition || null, currentDragData);

  // 통합된 블록 이동 핸들러 (레거시 useConnections 제거됨)
  const handleBlockMove = (blockId: string, newPosition: Vector3) => {
    onBlockMove?.(blockId, newPosition);
  };

  // 블록 드래그 시작 핸들러
  const handleBlockDragStart = (blockId: string) => {
    console.log("🎯 [Canvas3D] Block drag start:", blockId);
    setIsAnyBlockDragging(true);
    onBlockDragStart?.(blockId);
  };

  // 블록 드래그 종료 핸들러
  const handleBlockDragEnd = (blockId: string) => {
    console.log("🎯 [Canvas3D] Block drag end:", blockId);
    setIsAnyBlockDragging(false);
    onBlockDragEnd?.(blockId);
  };

  // 캔버스 클릭 핸들러
  const handleCanvasClick = (event: any) => {
    // 빈 공간 클릭 시에만 호출
    if (event.object === event.scene || !event.object) {
      onCanvasClick?.();
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full"
      style={{
        cursor: isConnectionMode ? 'crosshair' : 'default'
      }}
      onDragOver={(e) => {
        e.preventDefault(); // 중요: prevent default 추가
        handleDragOver(e);
        updateDragPreview(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        console.log("🎯 [Canvas3D] Drag enter event");
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={() => setIsAnyBlockDragging(false)}
      onMouseMove={(e) => {
        // 드래그 중일 때만 마우스 이동으로 프리뷰 업데이트
        if (currentDragData) {
          console.log("🖱️ [Canvas3D] Mouse move during drag");
          updateDragPreview(e as any);
        }
      }}
    >
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
        }}
        shadows
        onPointerMissed={handleCanvasClick}
      >
        {/* 조명 설정 */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        {/* 격자 */}
        <Grid
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />

        {/* 블록 렌더러 */}
        <BlockRenderer
          droppedBlocks={droppedBlocks}
          connections={connections}
          selectedBlockId={selectedBlockId}
          selectedConnectionId={selectedConnectionId}
          isConnecting={isConnecting}
          connectingFrom={connectingFrom}
          isDraggingBlock={isDraggingBlock}
          dragPosition={dragPosition}
          isDropPreview={isDropPreview}
          previewPosition={previewPosition}
          previewBlockData={previewBlockData}
          stackableBlocks={stackableBlocks}
          dragPreviewState={dragState.preview}
          snapGuides={dragState.preview?.snapGuides || []}
          isConnectionMode={isConnectionMode}
          selectedFromBlockId={selectedFromBlockId}
          onBlockClick={onBlockClick}
          onBlockRightClick={onBlockRightClick}
          onBlockMove={handleBlockMove}
          onBlockResize={onBlockResize}
          onBlockDragStart={handleBlockDragStart}
          onBlockDragEnd={handleBlockDragEnd}
          onBlockDragUpdate={onBlockDragUpdate}
          onConnectionClick={onConnectionClick}
          onConnectionComplete={onConnectionComplete}
        />

        {/* 카메라 컨트롤 - 블록 드래그 중에는 비활성화 */}
        <OrbitControls
          enabled={!isAnyBlockDragging}
          enablePan={!isAnyBlockDragging}
          enableZoom={!isAnyBlockDragging}
          enableRotate={!isAnyBlockDragging}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
