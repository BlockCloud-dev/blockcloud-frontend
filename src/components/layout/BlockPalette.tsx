import React, { useState } from 'react';
import { Cloud, Server, Shield, Route, Building2, Archive, Link2, X } from 'lucide-react';

interface BlockPaletteProps {
    isConnecting?: boolean;
    onToggleConnecting?: () => void;
    connectingFrom?: string | null;
    onDragStart?: (blockData: any) => void;
    onDragEnd?: () => void;
}

const awsBlocks = [
    {
        id: 'vpc',
        name: 'VPC',
        description: '가상 프라이빗 클라우드',
        icon: Building2,
        color: 'bg-blue-500',
        type: 'foundation'
    },
    {
        id: 'subnet',
        name: 'Subnet',
        description: '서브넷',
        icon: Route,
        color: 'bg-green-500',
        type: 'network'
    },
    {
        id: 'ec2',
        name: 'EC2',
        description: '인스턴스',
        icon: Server,
        color: 'bg-orange-500',
        type: 'compute'
    },
    {
        id: 'volume',
        name: 'EBS Volume',
        description: '스토리지',
        icon: Archive,
        color: 'bg-purple-500',
        type: 'storage'
    },
    {
        id: 'security-group',
        name: 'Security Group',
        description: '보안 그룹',
        icon: Shield,
        color: 'bg-red-500',
        type: 'security'
    },
    {
        id: 'load-balancer',
        name: 'Load Balancer',
        description: '로드 밸런서',
        icon: Cloud,
        color: 'bg-yellow-500',
        type: 'network'
    }
];

export function BlockPalette({
    isConnecting = false,
    onToggleConnecting,
    connectingFrom,
    onDragStart: onPaletteDragStart,
    onDragEnd: onPaletteDragEnd
}: BlockPaletteProps = {}) {
    const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockData: any) => {
        event.dataTransfer.setData('application/json', JSON.stringify(blockData));
        event.dataTransfer.effectAllowed = 'copy';
        setDraggedBlockId(blockData.id);
        onPaletteDragStart?.(blockData);
    };

    const handleDragEnd = () => {
        setDraggedBlockId(null);
        onPaletteDragEnd?.();
    };

    return (
        <div className="h-full bg-gray-800 border-r border-gray-600 flex flex-col">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-600">
                <h2 className="text-lg font-semibold text-white">AWS 블록</h2>
                <p className="text-sm text-gray-400">드래그해서 배치하세요</p>

                {/* 연결 모드 토글 버튼 */}
                <button
                    onClick={() => {
                        console.log('🔗 [PALETTE] Connection toggle clicked:', {
                            currentIsConnecting: isConnecting,
                            currentConnectingFrom: connectingFrom?.substring(0, 8)
                        });
                        onToggleConnecting?.();
                    }}
                    className={`mt-3 w-full flex items-center justify-center p-2 rounded-lg border transition-all duration-200 ${isConnecting
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    {isConnecting ? (
                        <>
                            <X className="w-4 h-4 mr-2" />
                            연결 모드 종료
                        </>
                    ) : (
                        <>
                            <Link2 className="w-4 h-4 mr-2" />
                            연결 모드
                        </>
                    )}
                </button>

                {isConnecting && connectingFrom && (
                    <div className="mt-2 p-2 bg-blue-900 rounded text-xs text-blue-200">
                        🔗 연결할 블록을 선택하세요
                        <div className="mt-1 text-blue-300">
                            Esc 키로 취소
                        </div>
                    </div>
                )}

                {!isConnecting && (
                    <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300">
                        💡 <strong>AWS 아키텍처 규칙:</strong><br />
                        <strong>• 물리적 스태킹:</strong> VPC → Subnet → (EC2, SG, LB)<br />
                        <strong>• 도로 연결:</strong> EC2 ↔ SG, EC2 ↔ EBS, LB ↔ EC2
                    </div>
                )}
            </div>

            {/* 블록 리스트 */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {/* 연결 상태 표시 */}
                {isConnecting && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white text-sm">
                        <div className="flex items-center mb-2">
                            <Link2 className="w-4 h-4 mr-2 animate-pulse" />
                            <strong>도로 연결 모드</strong>
                        </div>
                        <div className="text-blue-100 text-xs space-y-1">
                            <div>🎯 연결 시작: {connectingFrom}</div>
                            <div>👆 목적지 블록을 클릭하세요</div>
                            <div>❌ ESC로 취소</div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {awsBlocks.map((block) => {
                        const IconComponent = block.icon;

                        return (
                            <div
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, block)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center p-3 bg-gray-700 rounded-lg cursor-grab hover:bg-gray-600 
                         transition-all duration-200 border border-gray-600 hover:border-gray-500
                         ${draggedBlockId === block.id ? 'opacity-50 scale-95' : ''}`}
                            >
                                <div className={`w-10 h-10 ${block.color} rounded-lg flex items-center justify-center mr-3`}>
                                    <IconComponent className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-medium text-sm">{block.name}</h3>
                                    <p className="text-gray-400 text-xs">{block.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
