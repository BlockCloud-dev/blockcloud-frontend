import React from 'react';
import { Trash2, Route, Link2 } from 'lucide-react';
import type { Connection, DroppedBlock } from '../../types/blocks';

interface ConnectionsPanelProps {
    connections: Connection[];
    blocks: DroppedBlock[];
    selectedConnectionId?: string | null;
    onConnectionSelect: (connection: Connection) => void;
    onConnectionDelete: (connectionId: string) => void;
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({
    connections,
    blocks,
    selectedConnectionId,
    onConnectionSelect,
    onConnectionDelete
}) => {
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
            case 'ec2-security-group': return '🛡️';
            case 'ec2-subnet': return '🌐';
            case 'ec2-volume': return '💾';
            case 'load-balancer-ec2': return '⚖️';
            case 'load-balancer-security-group': return '🛡️⚖️';
            case 'load-balancer-subnet': return '🌐⚖️';
            case 'security-group-subnet': return '🛡️🌐';
            case 'subnet-vpc': return '🏢';
            default: return '🔗';
        }
    };

    const getConnectionColor = (type: string) => {
        switch (type) {
            case 'ec2-security-group': return 'from-red-500 to-red-600';
            case 'ec2-subnet': return 'from-green-500 to-green-600';
            case 'ec2-volume': return 'from-purple-500 to-purple-600';
            case 'load-balancer-ec2': return 'from-orange-500 to-orange-600';
            case 'load-balancer-security-group': return 'from-pink-500 to-pink-600';
            case 'load-balancer-subnet': return 'from-cyan-500 to-cyan-600';
            case 'security-group-subnet': return 'from-orange-500 to-orange-600';
            case 'subnet-vpc': return 'from-blue-500 to-blue-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    if (connections.length === 0) {
        return (
            <div className="h-full bg-gray-800 text-white p-4">
                <div className="mb-4 pb-2 border-b border-gray-600">
                    <h2 className="text-lg font-semibold flex items-center">
                        <Route className="w-5 h-5 mr-2" />
                        도로 연결
                    </h2>
                    <p className="text-sm text-gray-400">AWS 리소스 간 연결 상태</p>
                </div>

                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Link2 className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center">
                        아직 연결된 도로가 없습니다.<br />
                        블록들을 연결해보세요!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-800 text-white p-4 overflow-y-auto">
            <div className="mb-4 pb-2 border-b border-gray-600">
                <h2 className="text-lg font-semibold flex items-center">
                    <Route className="w-5 h-5 mr-2" />
                    도로 연결 ({connections.length})
                </h2>
                <p className="text-sm text-gray-400">연결된 AWS 리소스들</p>
            </div>

            <div className="space-y-3">
                {connections.map((connection) => (
                    <div
                        key={connection.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedConnectionId === connection.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                            }`}
                        onClick={() => onConnectionSelect(connection)}
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
                                    onConnectionDelete(connection.id);
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
