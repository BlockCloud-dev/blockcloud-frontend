import { BlockPalette } from "../components/layout/BlockPalette";
import { Canvas3D } from "../components/layout/Canvas3D";
import { CodeEditor } from "../components/layout/CodeEditor";
import { PropertiesPanel } from "../components/ui/PropertiesPanel";
import { TabHeader } from "../components/ui/TabHeader";
import { ConnectionsPanel } from "../components/ui/ConnectionsPanel";
import { ResizablePanel } from "../components/ui/ResizablePanel";
import MainHeader from "../components/ui/MainHeader";

// Zustand 스토어들
import {
  useBlockStore,
  useConnectionStore,
  useUIStore,
} from "../stores";

// 커스텀 훅들
import {
  useProjectLoader,
  useStackingOperations,
  useBlockOperations,
  useCodeGeneration,
  useDeployment,
  useDragPreview,
  useProjectManagement,
  useConnectionHandlers,
  useKeyboardShortcuts,
} from "../hooks";

function NewProjectEditorPage() {
  // ============================================
  // 1. 프로젝트 로더 (프로젝트 데이터 불러오기)
  // ============================================
  const { projectId } = useProjectLoader();

  // ============================================
  // 2. Zustand 스토어에서 상태 가져오기
  // ============================================
  const {
    droppedBlocks,
    selectedBlockId,
    propertiesBlockId,
    isDraggingBlock,
    dragPosition,
    isDropPreview,
    previewPosition,
    previewBlockData,
    currentDragData,
  } = useBlockStore();

  const {
    connections,
    selectedConnection,
    isConnecting,
    connectingFrom,
    isConnectionMode,
    selectedFromBlockId,
    setSelectedFromBlockId,
    resetConnectionMode,
    completeConnection,
    startConnecting,
    cancelConnecting,
    deleteConnection,
    deleteConnectionsForBlock,
  } = useConnectionStore();

  const { activeTab, setActiveTab } = useUIStore();

  // ============================================
  // 3. 스태킹 작업 (스택 관계 관리)
  // ============================================
  const {
    handleStackingForNewBlock,
    handleStackingForMovedBlock,
    removeStackingRelation,
  } = useStackingOperations();

  // ============================================
  // 4. 블록 작업 (드롭, 클릭, 삭제, 이동 등)
  // ============================================
  const {
    handleBlockDrop,
    handleBlockClick,
    handleBlockRightClick,
    handleBlockDelete,
    handleBlockMove,
    handleBlockDragStart,
    handleBlockDragEnd,
    handleBlockDragUpdate,
    handleBlockResize,
  } = useBlockOperations({
    handleStackingForNewBlock,
    handleStackingForMovedBlock,
    removeStackingRelation,
  });

  // ============================================
  // 5. 코드 생성 (Terraform 코드 자동 생성)
  // ============================================
  useCodeGeneration();

  // ============================================
  // 6. 배포 관리
  // ============================================
  const { loadingStatus, handleDeployProject } = useDeployment(projectId);

  // ============================================
  // 7. 드래그 미리보기
  // ============================================
  const {
    handleDragPreview,
    handleDragPreviewEnd,
    handlePaletteDragStart,
    handlePaletteDragEnd,
  } = useDragPreview();

  // ============================================
  // 8. 프로젝트 관리 (저장, 새 프로젝트)
  // ============================================
  const { handleNewProject, handleSaveProject } = useProjectManagement(
    projectId,
    droppedBlocks
  );

  // ============================================
  // 9. 연결 핸들러
  // ============================================
  const {
    handleConnectionComplete,
    handleConnectionClick,
    handleCanvasClick,
  } = useConnectionHandlers();

  // ============================================
  // 10. 탭 변경 핸들러
  // ============================================
  const handleTabChange = (tab: "connections" | "code" | "properties") => {
    setActiveTab(tab);
  };

  // ============================================
  // 11. 키보드 단축키
  // ============================================
  useKeyboardShortcuts({
    onDelete: () => {
      if (selectedBlockId) {
        handleBlockDelete(selectedBlockId);
      }
    },
    onEscape: () => {
      useBlockStore.getState().setSelectedBlockId(null);
      useBlockStore.getState().setPropertiesBlockId(null);
      setActiveTab("code");
    },
    onResize: (axis, delta) => {
      if (selectedBlockId) {
        const selectedBlock = droppedBlocks.find(
          (block) => block.id === selectedBlockId
        );
        if (selectedBlock && selectedBlock.size) {
          const newSize: [number, number, number] = [...selectedBlock.size];

          if (axis === "width") {
            newSize[0] = Math.max(0.5, newSize[0] + delta);
          } else if (axis === "height") {
            console.log("높이 조절은 제한됩니다.");
            return;
          } else if (axis === "depth") {
            newSize[2] = Math.max(0.5, newSize[2] + delta);
          }

          console.log("🔧 블록 크기 조절:", {
            blockType: selectedBlock.type,
            axis,
            delta,
            oldSize: selectedBlock.size,
            newSize,
          });

          handleBlockResize(selectedBlockId, newSize);
        }
      }
    },
    onNewProject: handleNewProject,
    onToggleTab: handleTabChange,
  });

  // ============================================
  // 12. 블록 클릭 래퍼 (연결 모드 처리)
  // ============================================
  const onBlockClick = (blockId: string) => {
    handleBlockClick(
      blockId,
      isConnectionMode,
      selectedFromBlockId,
      setSelectedFromBlockId,
      resetConnectionMode,
      completeConnection
    );
  };

  // ============================================
  // 13. 블록 우클릭 래퍼 (연결 모드 시작)
  // ============================================
  const onBlockRightClick = (blockId: string, event?: MouseEvent) => {
    handleBlockRightClick(blockId, event, startConnecting);
  };

  // ============================================
  // 14. 블록 드래그 업데이트 래퍼
  // ============================================
  const onBlockDragUpdate = (blockId: string, position: any) => {
    handleBlockDragUpdate(blockId, position, isDraggingBlock);
  };

  // ============================================
  // 렌더링
  // ============================================
  return (
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden relative">
      {/* 메인 헤더 */}
      <MainHeader onSaveProject={handleSaveProject} />

      {/* 메인 3-Panel 레이아웃 */}
      <div className="flex-1 flex flex-row h-[calc(100vh-120px)] min-w-0">
        {/* 왼쪽 패널 - 블록 팔레트 */}
        <ResizablePanel side="left" initialWidth={320}>
          <div className="h-full w-full bg-gray-50 px-4 py-4 overflow-auto">
            <BlockPalette
              onDragStart={handlePaletteDragStart}
              onDragEnd={handlePaletteDragEnd}
            />
          </div>
        </ResizablePanel>

        {/* 중앙 패널 - 3D 캔버스 */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-gray-300">
          <Canvas3D
            onBlockDrop={handleBlockDrop}
            onBlockClick={onBlockClick}
            onBlockRightClick={onBlockRightClick}
            onBlockDelete={handleBlockDelete}
            onBlockMove={handleBlockMove}
            onBlockResize={handleBlockResize}
            onBlockDragStart={handleBlockDragStart}
            onBlockDragEnd={handleBlockDragEnd}
            onBlockDragUpdate={onBlockDragUpdate}
            onCanvasClick={handleCanvasClick}
            droppedBlocks={droppedBlocks}
            selectedBlockId={selectedBlockId}
            connections={connections}
            selectedConnectionId={selectedConnection?.id || null}
            isConnecting={isConnecting}
            connectingFrom={connectingFrom}
            onConnectionClick={handleConnectionClick}
            onConnectionComplete={handleConnectionComplete}
            onConnectionCancel={cancelConnecting}
            onDeleteConnection={deleteConnection}
            onDeleteConnectionsForBlock={deleteConnectionsForBlock}
            isDraggingBlock={isDraggingBlock}
            dragPosition={dragPosition}
            onDragPreview={handleDragPreview}
            onDragPreviewEnd={handleDragPreviewEnd}
            isDropPreview={isDropPreview}
            previewPosition={previewPosition}
            previewBlockData={previewBlockData}
            currentDragData={currentDragData}
          />
        </div>

        {/* 오른쪽 패널 - 속성/코드/연결 */}
        <ResizablePanel side="right" initialWidth={340}>
          <div className="h-full w-full flex flex-col overflow-hidden">
            <TabHeader onDeploy={handleDeployProject} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === "connections" && <ConnectionsPanel />}
              {activeTab === "code" && <CodeEditor key="code-editor" />}
              {activeTab === "properties" && propertiesBlockId && (
                <PropertiesPanel />
              )}
            </div>
          </div>
        </ResizablePanel>
      </div>

      {/* 하단 상태바 */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-600 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>배치된 블록: {droppedBlocks.length}개</span>
            <span>•</span>
            <span>연결: {connections.length}개</span>
            <span>•</span>
            <span>
              마지막 업데이트:{" "}
              {droppedBlocks.length > 0
                ? new Date(
                  Math.max(...droppedBlocks.map((b) => b.timestamp))
                ).toLocaleTimeString()
                : "없음"}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500">단축키:</span>
              <span>⌘N 새프로젝트</span>
              <span>•</span>
              <span>1/2/3 탭전환</span>
              <span>•</span>
              <span>Del 삭제</span>
            </div>
            <span className="text-green-400">● 준비됨</span>
          </div>
        </div>
      </div>

      {/* 로딩 스피너 오버레이 */}
      {loadingStatus && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <p className="text-sm text-gray-700">
              {loadingStatus === "validating"
                ? "Terraform 코드 유효성 검사 중... 3분 정도 소요됩니다."
                : "Terraform 배포 중...\n시간이 소요될 수 있습니다."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewProjectEditorPage;
