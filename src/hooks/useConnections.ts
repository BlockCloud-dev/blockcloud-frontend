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

    // 블록 타입 헬퍼 함수들 (벤더 접두사 무관)
    const isVPC = (type: string) => type.includes('vpc') || type.includes('virtual-network');
    const isSubnet = (type: string) => type.includes('subnet');
    const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');
    const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');
    const isSecurity = (type: string) => type.includes('security-group') || type.includes('firewall') || type.includes('nsg');
    const isLoadBalancer = (type: string) => type.includes('load-balancer');

    // 계층적 아키텍처 연결 규칙 검증 (벤더 무관)
    let isValidRule = false;
    let connectionType: ConnectionType | undefined;

    // VPC → Subnet
    if (isVPC(fromType) && isSubnet(toType)) {
      isValidRule = true;
      connectionType = 'vpc-subnet';
    }
    // Subnet → Resources (Compute, Volume, Security, LoadBalancer)
    else if (isSubnet(fromType) && (isCompute(toType) || isVolume(toType) || isSecurity(toType) || isLoadBalancer(toType))) {
      isValidRule = true;
      if (isCompute(toType)) connectionType = 'subnet-compute';
      else if (isVolume(toType)) connectionType = 'subnet-volume';
      else if (isSecurity(toType)) connectionType = 'subnet-security-group';
      else if (isLoadBalancer(toType)) connectionType = 'subnet-load-balancer';
    }
    // Volume ↔ Compute (양방향)
    else if ((isVolume(fromType) && isCompute(toType)) || (isCompute(fromType) && isVolume(toType))) {
      isValidRule = true;
      connectionType = 'compute-volume';
    }

    if (isValidRule && connectionType) {
      return { valid: true, connectionType };
    }

    return {
      valid: false,
      reason: `${fromType}에서 ${toType}으로의 연결은 허용되지 않습니다. 계층 구조를 확인하세요.`
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
      // 블록 타입 헬퍼 함수들
      const isVPC = (type: string) => type.includes('vpc') || type.includes('virtual-network');
      const isSubnet = (type: string) => type.includes('subnet');
      const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');
      const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');

      // 잘못된 연결 방향 체크 - 계층 구조 준수
      if ((isCompute(fromBlock.type) && (isVPC(toBlock.type) || isSubnet(toBlock.type))) ||
        (isVolume(fromBlock.type) && (isVPC(toBlock.type) || isSubnet(toBlock.type)))) {
        console.log('🚫 [CONNECTIONS] 계층 구조에 맞지 않는 연결입니다.');
        cancelConnecting();
        return false;
      }

      // 연결 속성 결정
      let connectionProperties: any = {};

      // Compute와 Volume 간의 연결인지 확인 (추가 블록 스토리지)
      if (validation.connectionType === 'compute-volume') {
        connectionProperties = {
          volumeType: 'additional',
          description: '추가 블록 스토리지 (연결)'
        };
        console.log('💾 [CONNECTIONS] Additional block storage relationship created via road connection');
      }

      // Volume과 Compute 간의 연결인지 확인 (블록 볼륨) - 양방향 지원
      if ((isVolume(fromBlock.type) && isCompute(toBlock.type)) || (isCompute(fromBlock.type) && isVolume(toBlock.type))) {
        connectionProperties = {
          volumeType: 'additional',
          description: 'Block Volume (Manual Road Connection)'
        };
        console.log('💾 [CONNECTIONS] Volume-Compute block volume relationship created via road connection');
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

      // 블록 타입 헬퍼 함수들 (벤더 접두사 무관)
      const isVPC = (type: string) => type.includes('vpc') || type.includes('virtual-network');
      const isSubnet = (type: string) => type.includes('subnet');
      const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');
      const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');
      const isSecurity = (type: string) => type.includes('security-group') || type.includes('firewall') || type.includes('nsg');
      const isLoadBalancer = (type: string) => type.includes('load-balancer');

      // 물리적 스태킹 규칙 검증 함수 (벤더 무관)
      const canStackOn = (upperType: string, lowerType: string): boolean => {
        // Subnet은 VPC 위에 스택
        if (isSubnet(upperType) && isVPC(lowerType)) return true;
        // Compute는 Subnet 또는 Volume 위에 스택
        if (isCompute(upperType) && (isSubnet(lowerType) || isVolume(lowerType))) return true;
        // Volume은 Subnet 위에 스택
        if (isVolume(upperType) && isSubnet(lowerType)) return true;
        // Security, LoadBalancer는 Subnet 위에 스택
        if ((isSecurity(upperType) || isLoadBalancer(upperType)) && isSubnet(lowerType)) return true;
        return false;
      };

      const connectionsToCreate: Connection[] = [];

      blocks.forEach(upperBlock => {
        console.log('🔍 [StackingDetection] Checking upper block:', upperBlock.type, upperBlock.id.substring(0, 8), 'at position:', upperBlock.position);

        // 같은 위치에 있는 하위 블록들 찾기
        const stackedBlocks = blocks.filter(lowerBlock => {
          if (lowerBlock.id === upperBlock.id) return false;
          // 벤더 무관 스태킹 규칙 검증
          if (!canStackOn(upperBlock.type, lowerBlock.type)) return false;

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

          // 계층 구조에 맞는 스택 연결 타입 결정 (벤더 무관)
          let connectionType: ConnectionType;
          let connectionProperties: any = { stackConnection: true };

          if (isVPC(lowerBlock.type) && isSubnet(upperBlock.type)) {
            connectionType = 'vpc-subnet';
          } else if (isSubnet(lowerBlock.type) && isCompute(upperBlock.type)) {
            connectionType = 'subnet-compute';
          } else if (isSubnet(lowerBlock.type) && isVolume(upperBlock.type)) {
            connectionType = 'subnet-volume';
          } else if (isVolume(lowerBlock.type) && isCompute(upperBlock.type)) {
            // Compute가 Volume 위에 스택된 경우 - 새로운 스태킹 시스템에서 처리하므로 여기서는 제외
            console.log('💾 [스태킹] Volume-Compute 스택 감지 - 새로운 스태킹 시스템에서 처리됨');
            return; // 연결 생성하지 않음
          } else if (isSubnet(lowerBlock.type) && isSecurity(upperBlock.type)) {
            connectionType = 'subnet-security-group';
          } else if (isSubnet(lowerBlock.type) && isLoadBalancer(upperBlock.type)) {
            connectionType = 'subnet-load-balancer';
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
    setConnections, // 외부에서 연결 상태를 설정할 수 있도록 추가
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
