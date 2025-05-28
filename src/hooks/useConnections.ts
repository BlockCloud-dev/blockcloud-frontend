import { useState, useCallback } from 'react';
import type { Connection, DroppedBlock, ConnectionType } from '../types/blocks';

export const useConnections = () => {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

    // 연결 생성
    const createConnection = useCallback((
        fromBlockId: string,
        toBlockId: string,
        connectionType: ConnectionType,
        properties?: any
    ) => {
        // 실시간 connections 상태를 확인하여 중복 연결 방지 - 더 안전한 방법
        let result: Connection | null = null;

        setConnections(currentConnections => {
            // 중복 연결 방지 - 최종 보안 체크 (양방향)
            const existingConnection = currentConnections.find(conn =>
                (conn.fromBlockId === fromBlockId && conn.toBlockId === toBlockId) ||
                (conn.fromBlockId === toBlockId && conn.toBlockId === fromBlockId)
            );

            if (existingConnection) {
                console.log('⚠️ 중복 연결 생성 시도 차단:', {
                    from: fromBlockId.substring(0, 8),
                    to: toBlockId.substring(0, 8),
                    existingConnectionId: existingConnection.id.substring(0, 8),
                    totalConnections: currentConnections.length
                });
                result = existingConnection; // 기존 연결 반환
                return currentConnections; // 상태 변경 없음
            }

            const newConnection: Connection = {
                id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromBlockId,
                toBlockId,
                connectionType,
                properties
            };

            console.log('✨ 새로운 연결 생성:', {
                connectionId: newConnection.id.substring(0, 8),
                from: fromBlockId.substring(0, 8),
                to: toBlockId.substring(0, 8),
                type: connectionType,
                totalConnections: currentConnections.length + 1
            });

            result = newConnection;
            return [...currentConnections, newConnection];
        });

        return result;
    }, []);

    // 연결 삭제
    const deleteConnection = useCallback((connectionId: string) => {
        console.log('🗑️ 단일 연결 삭제 시작:', connectionId.substring(0, 8));

        setConnections(currentConnections => {
            const connectionToDelete = currentConnections.find(conn => conn.id === connectionId);

            if (connectionToDelete) {
                console.log('🗑️ 연결 삭제:', {
                    connectionId: connectionId.substring(0, 8),
                    from: connectionToDelete.fromBlockId.substring(0, 8),
                    to: connectionToDelete.toBlockId.substring(0, 8),
                    type: connectionToDelete.connectionType
                });

                // selectedConnection 상태도 함께 업데이트
                setSelectedConnection(currentSelected =>
                    currentSelected?.id === connectionId ? null : currentSelected
                );

                return currentConnections.filter(conn => conn.id !== connectionId);
            } else {
                console.log('⚠️ 삭제하려는 연결을 찾을 수 없음:', connectionId.substring(0, 8));
                return currentConnections;
            }
        });
    }, []);

    // 블록 삭제 시 관련 연결들도 삭제
    const deleteConnectionsForBlock = useCallback((blockId: string) => {
        console.log('🗑️ 블록 관련 모든 연결 삭제 시작:', blockId.substring(0, 8));

        setConnections(currentConnections => {
            const connectionsToDelete = currentConnections.filter(conn =>
                conn.fromBlockId === blockId || conn.toBlockId === blockId
            );

            const remainingConnections = currentConnections.filter(conn =>
                conn.fromBlockId !== blockId && conn.toBlockId !== blockId
            );

            console.log('🗑️ 블록 관련 연결 삭제 완료:', {
                blockId: blockId.substring(0, 8),
                deletedConnections: connectionsToDelete.length,
                remainingConnections: remainingConnections.length
            });

            connectionsToDelete.forEach(conn => {
                console.log('🗑️ 삭제된 연결:', {
                    connectionId: conn.id.substring(0, 8),
                    from: conn.fromBlockId.substring(0, 8),
                    to: conn.toBlockId.substring(0, 8),
                    type: conn.connectionType
                });
            });

            return remainingConnections;
        });
    }, []);

    // 연결 유효성 검사
    const isValidConnection = useCallback((
        fromBlock: DroppedBlock,
        toBlock: DroppedBlock,
        currentConnections?: Connection[]
    ): { valid: boolean; connectionType?: ConnectionType; reason?: string } => {
        const fromType = fromBlock.type;
        const toType = toBlock.type;

        // 자기 자신과는 연결 불가
        if (fromBlock.id === toBlock.id) {
            return { valid: false, reason: '자기 자신과는 연결할 수 없습니다.' };
        }

        // 현재 연결 상태를 확인하여 이미 연결된 경우 체크
        const connectionsToCheck = currentConnections || connections;
        const existingConnection = connectionsToCheck.find(conn =>
            (conn.fromBlockId === fromBlock.id && conn.toBlockId === toBlock.id) ||
            (conn.fromBlockId === toBlock.id && conn.toBlockId === fromBlock.id)
        );

        if (existingConnection) {
            return { valid: false, reason: '이미 연결되어 있습니다.' };
        }

        // 연결 규칙 정의 - AWS 아키텍처 기반으로 분리
        const connectionRules: Record<string, string[]> = {
            // === 도로 연결 (서비스 간 통신) + 수동 스택킹 연결 ===
            'ec2': ['security-group', 'volume', 'subnet'], // EC2는 보안그룹, EBS(추가 블록스토리지), 서브넷 연결
            'load-balancer': ['ec2', 'security-group', 'subnet'], // 로드밸런서는 EC2, 보안그룹, 서브넷 연결
            'security-group': ['ec2', 'load-balancer', 'subnet'], // 보안그룹은 EC2, 로드밸런서, 서브넷 연결
            'volume': ['ec2'], // EBS는 EC2에만 도로 연결 (추가 블록 스토리지용)
            'subnet': ['vpc', 'ec2', 'security-group', 'load-balancer'], // 서브넷은 VPC와 상위 리소스들과 연결
            'vpc': ['subnet'] // VPC는 서브넷과 연결
        };

        if (connectionRules[fromType]?.includes(toType)) {
            // 연결 타입 결정
            const connectionType: ConnectionType = `${fromType}-${toType}` as ConnectionType;
            return { valid: true, connectionType };
        }

        if (connectionRules[toType]?.includes(fromType)) {
            // 역방향 연결
            const connectionType: ConnectionType = `${toType}-${fromType}` as ConnectionType;
            return { valid: true, connectionType };
        }

        return {
            valid: false,
            reason: `${fromType}과 ${toType}은 연결할 수 없습니다.`
        };
    }, [connections]);

    // 연결 모드 시작
    const startConnecting = useCallback((blockId: string) => {
        console.log('🔗 [CONNECTIONS] startConnecting called:', {
            blockId: blockId.substring(0, 8),
            currentState: { isConnecting, connectingFrom: connectingFrom?.substring(0, 8) }
        });
        setIsConnecting(true);
        setConnectingFrom(blockId);
        console.log('🔗 [CONNECTIONS] Connection mode started. New state:', {
            isConnecting: true,
            connectingFrom: blockId.substring(0, 8)
        });
    }, []);

    // 연결 모드 취소
    const cancelConnecting = useCallback(() => {
        setIsConnecting(false);
        setConnectingFrom(null);
    }, []);

    // 연결 완료
    const completeConnection = useCallback((
        toBlockId: string,
        blocks: DroppedBlock[]
    ) => {
        console.log('🔗 [CONNECTIONS] completeConnection called:', {
            toBlockId: toBlockId.substring(0, 8),
            connectingFrom: connectingFrom?.substring(0, 8),
            isConnecting,
            blocksCount: blocks.length
        });

        if (!connectingFrom || !isConnecting) {
            console.log('🔗 [CONNECTIONS] Not in connecting mode, returning false');
            return false;
        }

        const fromBlock = blocks.find(b => b.id === connectingFrom);
        const toBlock = blocks.find(b => b.id === toBlockId);

        console.log('🔗 [CONNECTIONS] Found blocks:', {
            fromBlock: fromBlock ? `${fromBlock.type} (${fromBlock.id.substring(0, 8)})` : 'NOT_FOUND',
            toBlock: toBlock ? `${toBlock.type} (${toBlock.id.substring(0, 8)})` : 'NOT_FOUND'
        });

        if (!fromBlock || !toBlock) {
            console.log('🔗 [CONNECTIONS] Blocks not found, returning false');
            return false;
        }

        // 기존 연결 확인을 connections 상태로 직접 확인
        const existingConnection = connections.find(conn =>
            (conn.fromBlockId === connectingFrom && conn.toBlockId === toBlockId) ||
            (conn.fromBlockId === toBlockId && conn.toBlockId === connectingFrom)
        );

        if (existingConnection) {
            console.log('⚠️ [CONNECTIONS] 이미 연결된 블록들입니다:', {
                from: connectingFrom.substring(0, 8),
                to: toBlockId.substring(0, 8),
                existingConnectionId: existingConnection.id.substring(0, 8)
            });
            console.log('🔗 [CONNECTIONS] Canceling due to existing connection');
            cancelConnecting();
            return false;
        }

        const validation = isValidConnection(fromBlock, toBlock, connections);
        console.log('🔗 [CONNECTIONS] Connection validation result:', validation);

        if (validation.valid && validation.connectionType) {
            // 볼륨과 서브넷 간의 직접 연결은 방지 (스택킹은 허용)
            if ((fromBlock.type === 'volume' && toBlock.type === 'subnet') ||
                (fromBlock.type === 'subnet' && toBlock.type === 'volume')) {
                console.log('🚫 [CONNECTIONS] 볼륨과 서브넷 간의 직접 연결은 허용되지 않습니다.');
                cancelConnecting();
                return false;
            }

            // EC2와 Volume 간의 도로 연결인지 확인 (추가 블록 스토리지)
            let connectionProperties: any = {};
            if (validation.connectionType === 'ec2-volume' || validation.connectionType === 'volume-ec2') {
                connectionProperties = {
                    volumeType: 'additional',
                    description: '추가 블록 스토리지 (도로 연결)'
                };
                console.log('💾 [CONNECTIONS] Additional block storage relationship created via road connection');
            }

            console.log('✅ [CONNECTIONS] 새로운 연결 생성:', {
                from: connectingFrom.substring(0, 8),
                to: toBlockId.substring(0, 8),
                type: validation.connectionType
            });

            createConnection(
                connectingFrom,
                toBlockId,
                validation.connectionType,
                connectionProperties
            );
            cancelConnecting();
            return true;
        } else {
            console.log('❌ [CONNECTIONS] Connection validation failed:', validation.reason);
            cancelConnecting();
        }

        return false;
    }, [connectingFrom, isConnecting, connections, isValidConnection, createConnection, cancelConnecting]);

    // 연결 속성 업데이트
    const updateConnectionProperties = useCallback((
        connectionId: string,
        properties: any
    ) => {
        setConnections(prev => prev.map(conn =>
            conn.id === connectionId
                ? { ...conn, properties: { ...conn.properties, ...properties } }
                : conn
        ));
    }, []);

    // 물리적 스태킹 감지 및 자동 연결 생성 - 개선된 버전
    const detectAndCreateStackingConnections = useCallback((blocks: DroppedBlock[]) => {
        // 최신 connections 상태를 함수형 업데이트로 직접 받아서 사용
        setConnections(currentConnections => {
            console.log('🔍 [StackingDetection] Starting stacking detection for', blocks.length, 'blocks');
            console.log('🔍 [StackingDetection] Current connections count:', currentConnections.length);

            // AWS 아키텍처의 물리적 스태킹 규칙 정의
            const stackingRules: Record<string, string[]> = {
                // VPC는 기반 계층 (스택 불가)
                'vpc': [],
                // Subnet은 VPC 위에 스택
                'subnet': ['vpc'],
                // EC2는 Subnet 위 또는 EBS Volume(부트볼륨) 위에 스택
                'ec2': ['subnet', 'volume'],
                // Security Group, Load Balancer는 Subnet 위에 스택
                'security-group': ['subnet'],
                'load-balancer': ['subnet'],
                // EBS Volume은 Subnet 위에 스택 (EC2가 부트볼륨으로 사용할 수 있도록)
                'volume': ['subnet']
            };

            const connectionsToCreate: Connection[] = [];

            blocks.forEach(upperBlock => {
                console.log('🔍 [StackingDetection] Checking upper block:', upperBlock.type, upperBlock.id.substring(0, 8), 'at position:', upperBlock.position);
                const allowedLowerTypes = stackingRules[upperBlock.type] || [];
                console.log('🔍 [StackingDetection] Allowed lower types for', upperBlock.type, ':', allowedLowerTypes);

                if (allowedLowerTypes.length === 0) {
                    console.log('🔍 [StackingDetection] No allowed lower types, skipping');
                    return;
                }

                // 같은 위치에 있는 하위 블록들 찾기
                const stackedBlocks = blocks.filter(lowerBlock => {
                    if (lowerBlock.id === upperBlock.id) return false;
                    if (!allowedLowerTypes.includes(lowerBlock.type)) return false;

                    // 블록 크기 정보 가져오기 (size가 없는 경우 기본값 사용)
                    const upperSize = upperBlock.size || [1, 1, 1];
                    const lowerSize = lowerBlock.size || [1, 1, 1];

                    // 상위 블록의 X, Z 위치가 하위 블록의 범위 내에 있는지 확인
                    const upperX = upperBlock.position.x;
                    const upperZ = upperBlock.position.z;
                    const lowerX = lowerBlock.position.x;
                    const lowerZ = lowerBlock.position.z;

                    // 하위 블록의 X, Z 범위 계산
                    const lowerXMin = lowerX - lowerSize[0] / 2;
                    const lowerXMax = lowerX + lowerSize[0] / 2;
                    const lowerZMin = lowerZ - lowerSize[2] / 2;
                    const lowerZMax = lowerZ + lowerSize[2] / 2;

                    // 상위 블록이 하위 블록의 X, Z 범위 내에 있는지 확인
                    const isWithinX = upperX >= lowerXMin && upperX <= lowerXMax;
                    const isWithinZ = upperZ >= lowerZMin && upperZ <= lowerZMax;

                    // Y 좌표로 스택 관계 확인 (상위 블록이 하위 블록보다 위에 있어야 함)
                    // 하위 블록의 상단 위치 계산
                    const lowerTopY = lowerBlock.position.y + lowerSize[1] / 2;
                    // 상위 블록의 하단 위치 계산
                    const upperBottomY = upperBlock.position.y - upperSize[1] / 2;

                    // Y 위치 차이가 작은지 확인 (약간의 오차 허용)
                    const yDifference = Math.abs(upperBottomY - lowerTopY);
                    const isStacked = isWithinX && isWithinZ && upperBlock.position.y > lowerBlock.position.y && yDifference < 0.1;

                    console.log('🔍 [StackingDetection] Checking stacking for:', {
                        upperBlock: `${upperBlock.type} (${upperBlock.id.substring(0, 8)})`,
                        lowerBlock: `${lowerBlock.type} (${lowerBlock.id.substring(0, 8)})`,
                        isWithinX,
                        isWithinZ,
                        yDifference,
                        upperY: upperBlock.position.y,
                        lowerY: lowerBlock.position.y,
                        upperBottomY,
                        lowerTopY,
                        isStacked
                    });

                    return isStacked;
                });

                console.log('🔍 [StackingDetection] Found', stackedBlocks.length, 'stacked blocks for', upperBlock.type);

                // 스택된 블록들과 자동 연결 생성
                stackedBlocks.forEach(lowerBlock => {
                    console.log('🔍 [StackingDetection] Processing stacked pair:', upperBlock.type, upperBlock.id.substring(0, 8), '->', lowerBlock.type, lowerBlock.id.substring(0, 8));

                    // 이미 연결이 있는지 확인 (양방향 체크) - 현재 연결과 생성 예정 연결 모두 확인
                    // currentConnections를 사용하여 최신 상태로 확인 (connections 대신)
                    const existingConnection = currentConnections.find(conn =>
                        (conn.fromBlockId === upperBlock.id && conn.toBlockId === lowerBlock.id) ||
                        (conn.fromBlockId === lowerBlock.id && conn.toBlockId === upperBlock.id)
                    );

                    const pendingConnection = connectionsToCreate.find(conn =>
                        (conn.fromBlockId === upperBlock.id && conn.toBlockId === lowerBlock.id) ||
                        (conn.fromBlockId === lowerBlock.id && conn.toBlockId === upperBlock.id)
                    );

                    if (existingConnection) {
                        console.log('🔗 Connection already exists between:', upperBlock.type, upperBlock.id.substring(0, 8), 'and', lowerBlock.type, lowerBlock.id.substring(0, 8), '- ConnectionID:', existingConnection.id.substring(0, 8));
                        return; // 이미 연결이 있으면 건너뛰기
                    }

                    if (pendingConnection) {
                        console.log('🔗 Connection already pending between:', upperBlock.type, upperBlock.id.substring(0, 8), 'and', lowerBlock.type, lowerBlock.id.substring(0, 8));
                        return; // 이미 생성 예정인 연결이 있으면 건너뛰기
                    }

                    // 스택 연결 타입 결정
                    let connectionType: ConnectionType;
                    let connectionProperties: any = { stackConnection: true };

                    if (upperBlock.type === 'subnet' && lowerBlock.type === 'vpc') {
                        connectionType = 'subnet-vpc';
                    } else if (upperBlock.type === 'ec2' && lowerBlock.type === 'subnet') {
                        connectionType = 'ec2-subnet';
                    } else if (upperBlock.type === 'ec2' && lowerBlock.type === 'volume') {
                        // EC2가 EBS Volume 위에 스택된 경우 - 부트 볼륨 관계
                        connectionType = 'ec2-volume';
                        connectionProperties = {
                            stackConnection: true,
                            volumeType: 'boot',
                            description: '부트 볼륨 (EC2가 EBS 위에 스택됨)'
                        };
                        console.log('💾 Boot volume relationship detected:', upperBlock.id.substring(0, 8), 'on', lowerBlock.id.substring(0, 8));
                    } else if (upperBlock.type === 'security-group' && lowerBlock.type === 'subnet') {
                        connectionType = 'security-group-subnet';
                    } else if (upperBlock.type === 'load-balancer' && lowerBlock.type === 'subnet') {
                        connectionType = 'load-balancer-subnet';
                    } else if (upperBlock.type === 'volume' && lowerBlock.type === 'subnet') {
                        // Volume과 Subnet 간의 스택 연결은 표현하지 않음
                        console.log('💾 Volume stacked on Subnet - no connection created');
                        return;
                    } else {
                        return; // 정의되지 않은 스택 관계
                    }

                    // 새 연결 생성
                    const newConnection: Connection = {
                        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        fromBlockId: upperBlock.id,
                        toBlockId: lowerBlock.id,
                        connectionType,
                        properties: connectionProperties
                    };

                    console.log('✨ [StackingDetection] New stacking connection queued:', {
                        connectionId: newConnection.id.substring(0, 8),
                        from: `${upperBlock.type} (${upperBlock.id.substring(0, 8)})`,
                        to: `${lowerBlock.type} (${lowerBlock.id.substring(0, 8)})`,
                        type: connectionType,
                        properties: connectionProperties
                    });

                    connectionsToCreate.push(newConnection);
                });
            });

            // 모든 연결을 한 번에 생성
            // 새 연결들을 현재 연결 목록에 추가
            if (connectionsToCreate.length > 0) {
                console.log('🔍 [StackingDetection] Adding', connectionsToCreate.length, 'new connections to existing', currentConnections.length, 'connections');

                // 마지막 보안 체크: 모든 연결에 대해 중복 검사 재실행
                const finalConnectionsToCreate = connectionsToCreate.filter(newConn => {
                    // 현재 연결 목록에 이미 같은 연결이 있는지 확인
                    const isDuplicate = currentConnections.some(existingConn =>
                        (existingConn.fromBlockId === newConn.fromBlockId && existingConn.toBlockId === newConn.toBlockId) ||
                        (existingConn.fromBlockId === newConn.toBlockId && existingConn.toBlockId === newConn.fromBlockId)
                    );

                    if (isDuplicate) {
                        console.log('⚠️ [StackingDetection] 중복 연결 최종 필터링:', {
                            from: newConn.fromBlockId.substring(0, 8),
                            to: newConn.toBlockId.substring(0, 8),
                            type: newConn.connectionType
                        });
                    }

                    return !isDuplicate;
                });

                console.log('🔍 [StackingDetection] After final duplicate check:', {
                    original: connectionsToCreate.length,
                    filtered: finalConnectionsToCreate.length,
                    removed: connectionsToCreate.length - finalConnectionsToCreate.length
                });

                const updatedConnections = [...currentConnections, ...finalConnectionsToCreate];
                console.log('🔍 [StackingDetection] Total connections after update:', updatedConnections.length);
                return updatedConnections;
            } else {
                console.log('🔍 [StackingDetection] No new connections to create');
                return currentConnections;
            }
        });

        console.log('🔍 [StackingDetection] Detection completed');
    }, []); // connections 의존성 제거 - 함수형 업데이트를 사용하므로 불필요

    return {
        connections,
        selectedConnection,
        isConnecting,
        connectingFrom,
        setSelectedConnection,
        createConnection,
        deleteConnection,
        deleteConnectionsForBlock,
        isValidConnection,
        startConnecting,
        cancelConnecting,
        completeConnection,
        updateConnectionProperties,
        detectAndCreateStackingConnections
    };
};
