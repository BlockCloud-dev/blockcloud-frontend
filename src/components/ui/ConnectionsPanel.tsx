import React, { useState } from 'react';
import { Trash2, Route, Link2, Plus, X } from 'lucide-react';
import { useConnectionStore, useBlockStore } from '../../stores';

interface ConnectionsPanelProps {
  // props 없이 Zustand에서 직접 상태 가져오기
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({ }) => {
  // Zustand에서 필요한 상태만 구독 (통합된 ConnectionStore 사용)
  const connections = useConnectionStore((state) => state.connections);
  const selectedConnection = useConnectionStore((state) => state.selectedConnection);
  const setSelectedConnection = useConnectionStore((state) => state.setSelectedConnection);
  const deleteConnection = useConnectionStore((state) => state.deleteConnection);
  const completeConnection = useConnectionStore((state) => state.completeConnection);
  const blocks = useBlockStore((state) => state.droppedBlocks);

  // 통합된 연결 모드 상태
  const isConnectionMode = useConnectionStore((state) => state.isConnectionMode);
  const selectedFromBlockId = useConnectionStore((state) => state.selectedFromBlockId);
  const setConnectionMode = useConnectionStore((state) => state.setConnectionMode);
  const setSelectedFromBlockId = useConnectionStore((state) => state.setSelectedFromBlockId);
  const resetConnectionMode = useConnectionStore((state) => state.resetConnectionMode);

  // 새 연결 생성 UI 상태 (드롭다운용으로 유지)
  const [showNewConnectionUI, setShowNewConnectionUI] = useState(false);
  const [selectedFromBlock, setSelectedFromBlock] = useState<string>('');
  const [selectedToBlock, setSelectedToBlock] = useState<string>('');

  // 클릭 모드로 새 연결 시작
  const handleStartClickConnection = () => {
    setConnectionMode(true);
    setSelectedFromBlockId(null);
    setShowNewConnectionUI(false); // 드롭다운 UI 숨기기
  };

  // 새 연결 생성 핸들러
  const handleCreateConnection = () => {
    if (!selectedFromBlock || !selectedToBlock || selectedFromBlock === selectedToBlock) {
      return;
    }

    const fromBlock = blocks.find(b => b.id === selectedFromBlock);
    const toBlock = blocks.find(b => b.id === selectedToBlock);

    if (fromBlock && toBlock) {
      const success = completeConnection(selectedToBlock, fromBlock, toBlock);
      if (success) {
        // 연결 성공 시 UI 초기화
        setShowNewConnectionUI(false);
        setSelectedFromBlock('');
        setSelectedToBlock('');
      }
    }
  };

  const handleCancelNewConnection = () => {
    setShowNewConnectionUI(false);
    setSelectedFromBlock('');
    setSelectedToBlock('');
  };

  // 연결 디버깅 로그
  console.log('🔗 ConnectionsPanel: Received connections:', connections?.length || 0);
  console.log('🔗 ConnectionsPanel: Connections data:', connections);
  console.log('🔗 ConnectionsPanel: Blocks count:', blocks?.length || 0);

  const getBlockName = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    return block ? `${block.properties.name || block.type} (${block.type})` : blockId;
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      // 벤더 무관 타입
      case 'compute-security-group': return '🛡️';
      case 'subnet-compute': return '🌐';
      case 'compute-volume': return '💾';
      case 'load-balancer-compute': return '⚖️';
      case 'load-balancer-security-group': return '🛡️⚖️';
      case 'subnet-load-balancer': return '🌐⚖️';
      case 'subnet-security-group': return '🛡️🌐';
      case 'vpc-subnet': return '🏢';
      case 'subnet-volume': return '💾';
      case 'volume-compute-boot': return '🥾';
      case 'volume-compute-block': return '💾';
      // 레거시 AWS 타입 (호환성)
      case 'ec2-security-group': return '🛡️';
      case 'subnet-ec2': return '🌐';
      case 'ec2-volume': return '💾';
      case 'load-balancer-ec2': return '⚖️';
      case 'subnet-ebs': return '💾';
      default: return '🔗';
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      // 벤더 무관 타입
      case 'compute-security-group': return 'from-red-500 to-red-600';
      case 'subnet-compute': return 'from-green-500 to-green-600';
      case 'compute-volume': return 'from-purple-500 to-purple-600';
      case 'load-balancer-compute': return 'from-orange-500 to-orange-600';
      case 'load-balancer-security-group': return 'from-pink-500 to-pink-600';
      case 'subnet-load-balancer': return 'from-cyan-500 to-cyan-600';
      case 'subnet-security-group': return 'from-orange-500 to-orange-600';
      case 'vpc-subnet': return 'from-blue-500 to-blue-600';
      case 'subnet-volume': return 'from-purple-500 to-purple-600';
      case 'volume-compute-boot': return 'from-yellow-500 to-yellow-600';
      case 'volume-compute-block': return 'from-purple-500 to-purple-600';
      // 레거시 AWS 타입 (호환성)
      case 'ec2-security-group': return 'from-red-500 to-red-600';
      case 'subnet-ec2': return 'from-green-500 to-green-600';
      case 'ec2-volume': return 'from-purple-500 to-purple-600';
      case 'load-balancer-ec2': return 'from-orange-500 to-orange-600';
      case 'subnet-ebs': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (connections.length === 0) {
    return (
      <div className="h-full bg-gray-800 text-white p-4">
        <div className="mb-4 pb-2 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center">
                <Route className="w-5 h-5 mr-2" />
                연결
              </h2>
              <p className="text-sm text-gray-400">AWS 리소스 간 연결 상태</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStartClickConnection}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                title="블록을 클릭해서 연결 생성"
              >
                <Link2 className="w-4 h-4 mr-1" />
                클릭 연결
              </button>
              <button
                onClick={() => setShowNewConnectionUI(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                title="드롭다운으로 연결 생성"
              >
                <Plus className="w-4 h-4 mr-1" />
                새 연결
              </button>
            </div>
          </div>
        </div>

        {/* 클릭 연결 모드 안내 */}
        {isConnectionMode && (
          <div className="mb-4 p-3 bg-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selectedFromBlockId
                    ? `도착 블록을 클릭하세요 (시작: ${getBlockName(selectedFromBlockId)})`
                    : "시작 블록을 클릭하세요"
                  }
                </p>
                <p className="text-xs text-green-200 mt-1">
                  캔버스에서 블록을 순서대로 클릭해서 연결을 만드세요
                </p>
              </div>
              <button
                onClick={resetConnectionMode}
                className="text-green-200 hover:text-white"
                title="연결 모드 취소"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showNewConnectionUI ? (
          <div className="space-y-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-3">새 연결 만들기</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">시작 블록</label>
                  <select
                    value={selectedFromBlock}
                    onChange={(e) => setSelectedFromBlock(e.target.value)}
                    className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
                  >
                    <option value="">블록을 선택하세요</option>
                    {blocks.map(block => (
                      <option key={block.id} value={block.id}>
                        {getBlockName(block.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">도착 블록</label>
                  <select
                    value={selectedToBlock}
                    onChange={(e) => setSelectedToBlock(e.target.value)}
                    className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
                  >
                    <option value="">블록을 선택하세요</option>
                    {blocks.filter(block => block.id !== selectedFromBlock).map(block => (
                      <option key={block.id} value={block.id}>
                        {getBlockName(block.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleCreateConnection}
                    disabled={!selectedFromBlock || !selectedToBlock}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded text-sm"
                  >
                    연결 만들기
                  </button>
                  <button
                    onClick={handleCancelNewConnection}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Link2 className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">
              아직 연결이 없습니다.<br />
              새 연결 버튼을 눌러 블록들을 연결해보세요!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-4 pb-2 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center">
              <Route className="w-5 h-5 mr-2" />
              연결 ({connections.length})
            </h2>
            <p className="text-sm text-gray-400">연결된 AWS 리소스들</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartClickConnection}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
              title="블록을 클릭해서 연결 생성"
            >
              <Link2 className="w-4 h-4 mr-1" />
              클릭 연결
            </button>
            <button
              onClick={() => setShowNewConnectionUI(!showNewConnectionUI)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
            >
              {showNewConnectionUI ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  취소
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  새 연결
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 클릭 연결 모드 안내 */}
      {isConnectionMode && (
        <div className="mb-4 p-3 bg-green-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {selectedFromBlockId
                  ? `도착 블록을 클릭하세요 (시작: ${getBlockName(selectedFromBlockId)})`
                  : "시작 블록을 클릭하세요"
                }
              </p>
              <p className="text-xs text-green-200 mt-1">
                캔버스에서 블록을 순서대로 클릭해서 연결을 만드세요
              </p>
            </div>
            <button
              onClick={resetConnectionMode}
              className="text-green-200 hover:text-white"
              title="연결 모드 취소"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 새 연결 UI */}
      {showNewConnectionUI && (
        <div className="mb-4 bg-gray-700 p-4 rounded-lg">
          <h3 className="text-md font-medium mb-3">새 연결 만들기</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">시작 블록</label>
              <select
                value={selectedFromBlock}
                onChange={(e) => setSelectedFromBlock(e.target.value)}
                className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
              >
                <option value="">블록을 선택하세요</option>
                {blocks.map(block => (
                  <option key={block.id} value={block.id}>
                    {getBlockName(block.id)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">도착 블록</label>
              <select
                value={selectedToBlock}
                onChange={(e) => setSelectedToBlock(e.target.value)}
                className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
              >
                <option value="">블록을 선택하세요</option>
                {blocks.filter(block => block.id !== selectedFromBlock).map(block => (
                  <option key={block.id} value={block.id}>
                    {getBlockName(block.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleCreateConnection}
                disabled={!selectedFromBlock || !selectedToBlock}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded text-sm"
              >
                연결 만들기
              </button>
              <button
                onClick={handleCancelNewConnection}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedConnection?.id === connection.id
              ? 'border-blue-500 bg-blue-900/30'
              : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
              }`}
            onClick={() => setSelectedConnection(connection)}
          >
            {/* 연결 헤더 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getConnectionColor(connection.connectionType)} flex items-center justify-center text-xs`}>
                  {getConnectionIcon(connection.connectionType)}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {connection.connectionType.replace('-', ' → ').toUpperCase()}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConnection(connection.id);
                }}
                className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/30 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* 연결 정보 */}
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex items-center">
                <span className="text-gray-400">From:</span>
                <span className="ml-2 text-white">{getBlockName(connection.fromBlockId)}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400">To:</span>
                <span className="ml-2 text-white">{getBlockName(connection.toBlockId)}</span>
              </div>

              {/* 연결 속성 */}
              {connection.properties && Object.keys(connection.properties).length > 0 && (
                <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
                  <div className="text-gray-400 mb-1">Properties:</div>
                  {Object.entries(connection.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400">{key}:</span>
                      <span className="text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
