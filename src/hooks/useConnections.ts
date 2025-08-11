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

    // AWS 계층적 아키텍처 연결 규칙 (VPC → Subnet → Resources)
    const connectionRules: Record<string, string[]> = {
      // === 상위 → 하위 계층 연결 (AWS 실제 구조) ===
      'vpc': ['subnet'], // VPC → 서브넷
      'subnet': ['ebs', 'ec2', 'security-group', 'load-balancer'], // 서브넷 → 리소스들
      'ebs': ['ec2'], // EBS → EC2 (부트볼륨/블록볼륨)
      'ec2': ['ebs', 'volume'], // EC2 → EBS/Volume (양방향 허용)
      'volume': ['ec2'], // 볼륨 → EC2
    };

    if (connectionRules[fromType]?.includes(toType)) {
      // AWS 계층 구조에 맞는 연결 타입 결정
      let connectionType: ConnectionType;

      if (fromType === 'vpc' && toType === 'subnet') {
        connectionType = 'vpc-subnet'; // VPC → 서브넷
      } else if (fromType === 'subnet' && toType === 'ebs') {
        connectionType = 'subnet-ebs'; // 서브넷 → EBS
      } else if (fromType === 'subnet' && toType === 'ec2') {
        connectionType = 'subnet-ec2'; // 서브넷 → EC2
      } else if ((fromType === 'ebs' && toType === 'ec2') || (fromType === 'ec2' && toType === 'ebs')) {
        connectionType = 'ebs-ec2-block'; // EBS ↔ EC2 (블록 볼륨, 양방향)
      } else if (fromType === 'subnet' && toType === 'security-group') {
        connectionType = 'subnet-security-group'; // 서브넷 → 보안그룹
      } else if (fromType === 'subnet' && toType === 'load-balancer') {
        connectionType = 'subnet-load-balancer'; // 서브넷 → 로드밸런서
      } else if ((fromType === 'volume' && toType === 'ec2') || (fromType === 'ec2' && toType === 'volume')) {
        connectionType = 'ec2-volume'; // EC2 ↔ Volume (양방향)
      } else {
        connectionType = `${fromType}-${toType}` as ConnectionType;
      }

      return { valid: true, connectionType };
    }

    return {
      valid: false,
      reason: `${fromType}에서 ${toType}으로의 연결은 허용되지 않습니다. AWS 계층 구조를 확인하세요.`
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
      // 잘못된 연결 방향 체크 - AWS 계층 구조 준수
      if ((fromBlock.type === 'ec2' && (toBlock.type === 'vpc' || toBlock.type === 'subnet')) ||
        (fromBlock.type === 'ebs' && (toBlock.type === 'vpc' || toBlock.type === 'subnet')) ||
        (fromBlock.type === 'subnet' && toBlock.type === 'ebs') ||
        (fromBlock.type === 'volume' && toBlock.type === 'subnet')) {
        console.log('🚫 [CONNECTIONS] AWS 계층 구조에 맞지 않는 연결입니다.');
        cancelConnecting();
        return false;
      }

      // 연결 속성 결정
      let connectionProperties: any = {};

      // EC2와 Volume 간의 도로 연결인지 확인 (추가 블록 스토리지)
      if (validation.connectionType === 'ec2-volume' || validation.connectionType === 'volume-ec2') {
        connectionProperties = {
          volumeType: 'additional',
          description: '추가 블록 스토리지 (도로 연결)'
        };
        console.log('💾 [CONNECTIONS] Additional block storage relationship created via road connection');
      }

      // EBS와 EC2 간의 도로 연결인지 확인 (블록 볼륨) - 양방향 지원
      if ((fromBlock.type === 'ebs' && toBlock.type === 'ec2') || (fromBlock.type === 'ec2' && toBlock.type === 'ebs')) {
        connectionProperties = {
          volumeType: 'additional',
          description: 'Block Volume (Manual Road Connection)'
        };
        console.log('💾 [CONNECTIONS] EBS block volume relationship created via road connection');
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
        'ec2': ['subnet', 'ebs', 'volume'], // EBS 추가
        // EBS는 Subnet 위에 스택
        'ebs': ['subnet'],
        // Security Group, Load Balancer는 Subnet 위에 스택
        'security-group': ['subnet'],
        'load-balancer': ['subnet'],
        // Volume은 EC2 아래에만 스택 (기존 볼륨 타입)
        'volume': ['ec2']
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

          // AWS 계층 구조에 맞는 스택 연결 타입 결정
          let connectionType: ConnectionType;
          let connectionProperties: any = { stackConnection: true };

          if (lowerBlock.type === 'vpc' && upperBlock.type === 'subnet') {
            connectionType = 'vpc-subnet';
          } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'ec2') {
            connectionType = 'subnet-ec2';
          } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'ebs') {
            connectionType = 'subnet-ebs';
          } else if (lowerBlock.type === 'ebs' && upperBlock.type === 'ec2') {
            // EC2가 EBS 위에 스택된 경우 - 새로운 스태킹 시스템에서 처리하므로 여기서는 제외
            console.log('💾 [레거시] EBS-EC2 스택 감지 - 새로운 스태킹 시스템에서 처리됨');
            return; // 연결 생성하지 않음
          } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'security-group') {
            connectionType = 'subnet-security-group';
          } else if (lowerBlock.type === 'subnet' && upperBlock.type === 'load-balancer') {
            connectionType = 'subnet-load-balancer';
          } else if (lowerBlock.type === 'volume' && upperBlock.type === 'ec2') {
            // EC2가 Volume 위에 스택된 경우 - 새로운 스태킹 시스템에서 처리하므로 여기서는 제외  
            console.log('💾 [레거시] Volume-EC2 스택 감지 - 새로운 스태킹 시스템에서 처리됨');
            return; // 연결 생성하지 않음
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
