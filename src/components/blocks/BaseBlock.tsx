import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { snapToGrid } from '../../utils/snapGrid';
import { getEBSRoleColor, getEBSRoleLabel } from '../../utils/ebsRoleManager';

interface BaseBlockProps {
  position: [number, number, number];
  color: string;
  size: [number, number, number];
  label?: string;
  blockType?: string; // 블록 타입 추가
  ebsRole?: 'boot' | 'block-storage' | 'unassigned'; // EBS 역할 추가
  onClick?: () => void;
  onRightClick?: (event: any) => void;
  onMove?: (newPosition: Vector3) => void;
  onResize?: (newSize: [number, number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragUpdate?: (position: Vector3) => void;
  isSelected?: boolean;
  allowDrag?: boolean;
  isConnecting?: boolean;
  isStacked?: boolean;
  stackLevel?: number;
  // 연결 모드 props
  isConnectionMode?: boolean;
  isFromBlock?: boolean;
}

export function BaseBlock({
  position,
  color,
  size,
  label = '',
  blockType,
  ebsRole,
  onClick,
  onRightClick,
  onMove,
  onDragStart,
  onDragEnd,
  onDragUpdate,
  isSelected = false,
  allowDrag = true,
  isStacked = false,
  stackLevel = 0,
  isConnectionMode = false,
  isFromBlock = false,
}: BaseBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera } = useThree();

  // 드래그를 위한 상태 (클릭 감지용)
  const [pointerMoved, setPointerMoved] = useState(false);

  // 드래그 지연을 위한 상태
  const [canDrag, setCanDrag] = useState(false);
  const dragTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef(false); // 최신 상태를 추적하기 위한 ref

  // 연결 모드 변경 시 상태 초기화
  React.useEffect(() => {
    if (isConnectionMode) {
      setPointerMoved(false);
      setIsDragging(false);
      isPointerDownRef.current = false; // ref 초기화
      setCanDrag(false);
      // 진행 중인 드래그 타이머 취소
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      console.log('🔗 [CONNECTION_MODE] Resetting drag states for connection mode');
    }
  }, [isConnectionMode]);

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }
    };
  }, []);

  // position prop 변경 추적 (디버깅용)
  React.useEffect(() => {
    console.log('🎯 [BASEBLOCK_PROP] Position prop changed:', position);
  }, [position]);

  // 블록 클릭 처리
  const handleClick = (event: any) => {
    console.log('🎯 [CLICK] Click event triggered on block:', blockType);

    // Three.js 이벤트에서 stopPropagation 안전하게 호출
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }

    // 연결 모드일 때는 항상 클릭으로 처리 (드래그가 비활성화되어 있음)
    if (isConnectionMode) {
      console.log('🔗 [CONNECTION_MODE] Block clicked for connection:', blockType, position);
      onClick?.();
      return;
    }

    // 일반 모드에서는 드래그가 발생하지 않은 경우에만 클릭으로 처리
    if (!pointerMoved && !isDragging) {
      console.log('🎯 [CLICK] Block clicked:', blockType, position);
      onClick?.();
    } else {
      console.log('🎯 [CLICK] Click ignored due to drag:', { pointerMoved, isDragging });
    }
  };

  // 연결 모드일 때 색상 조정
  const getConnectionModeColor = () => {
    if (!isConnectionMode) return displayColor;

    if (isFromBlock) {
      // 선택된 시작 블록은 녹색으로
      return '#22c55e'; // green-500
    } else {
      // 다른 블록들은 약간 밝게 (선택 가능함을 표시)
      return displayColor;
    }
  };

  const getConnectionModeEmissive = () => {
    if (!isConnectionMode) {
      return isSelected ? displayColor : (isDragging ? displayColor : '#000000');
    }

    if (isFromBlock) {
      return '#22c55e'; // 시작 블록은 녹색으로 발광
    } else {
      return '#3b82f6'; // 다른 블록들은 파란색으로 약간 발광
    }
  };

  const getConnectionModeEmissiveIntensity = () => {
    if (!isConnectionMode) {
      return isSelected ? 0.2 : (isDragging ? 0.1 : stackGlow);
    }

    if (isFromBlock) {
      return 0.3; // 시작 블록은 더 밝게
    } else {
      return 0.1; // 다른 블록들은 약간 밝게
    }
  };

  // 블록 우클릭 처리
  const handleRightClick = (event: any) => {
    console.log('🎯 [RIGHT_CLICK] Right click event triggered on block:', blockType);
    console.log('🎯 [RIGHT_CLICK] Event details:', {
      shiftKey: event.shiftKey,
      button: event.button,
      type: event.type,
      target: event.target
    });

    // Three.js 이벤트에서는 stopPropagation이 없을 수 있으므로 안전하게 체크
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }

    // Three.js 이벤트에서는 preventDefault가 없을 수 있으므로 안전하게 체크
    if (typeof event.preventDefault === 'function') {
      event.preventDefault(); // 기본 컨텍스트 메뉴 방지
    }

    // shiftKey 정보를 포함한 MouseEvent 객체 생성
    const mouseEvent: MouseEvent = {
      shiftKey: event.shiftKey || false,
      ctrlKey: event.ctrlKey || false,
      altKey: event.altKey || false,
      metaKey: event.metaKey || false,
      button: event.button || 2,
      clientX: event.clientX || 0,
      clientY: event.clientY || 0,
      preventDefault: () => {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      },
      stopPropagation: () => {
        if (typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
      }
    } as MouseEvent;

    console.log('🎯 [RIGHT_CLICK] BaseBlock right click detected:', {
      shiftKey: event.shiftKey || false,
      blockType,
      position,
      onRightClickExists: !!onRightClick
    });

    console.log('🎯 [RIGHT_CLICK] Calling onRightClick with mouseEvent');
    onRightClick?.(mouseEvent);
  };

  // 드래그 시작
  const handlePointerDown = (event: any) => {
    // 우클릭인 경우 우클릭 핸들러 호출
    if (event.button === 2) {
      handleRightClick(event);
      return;
    }

    // 좌클릭만 드래그 처리
    if (event.button !== 0) return;
    if (!allowDrag) return;

    // 연결 모드일 때는 드래그 비활성화
    if (isConnectionMode) {
      console.log('🚫 [CONNECTION_MODE] Drag disabled in connection mode');
      return;
    }

    console.log('🎯 [POINTER_DOWN] BaseBlock pointer down - starting 1s delay for drag');

    // Three.js 이벤트에서 stopPropagation 안전하게 호출
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }

    // 포인터 다운 상태 설정
    isPointerDownRef.current = true; // ref 설정
    setPointerMoved(false); // 아직 드래그가 시작되지 않음

    // 기존 타이머가 있다면 취소
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
    }

    // 1초 후 드래그 시작
    dragTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current) { // ref를 사용해서 최신 상태 확인
        console.log('🎯 [DRAG_START] 1s delay completed - starting drag for block:', blockType);
        setCanDrag(true);
        setIsDragging(true);
        setPointerMoved(true);
        onDragStart?.();
      } else {
        console.log('🎯 [DRAG_TIMEOUT] Pointer was released before 1s delay completed');
      }
    }, 1000); // 1초 지연

    console.log('🎯 [DRAG_DELAY] Drag delay timer started for block:', blockType);
  };

  // 포인터 업 핸들러
  const handlePointerUp = () => {
    console.log('🎯 [POINTER_UP] BaseBlock handlePointerUp called');

    // 드래그 타이머 취소 (1초가 지나기 전에 놓은 경우)
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
      console.log('🎯 [DRAG_CANCEL] Drag cancelled - released before 1s delay');
    }

    // 드래그 중이면 끝내기
    if (isDragging) {
      setIsDragging(false);
      console.log('🎯 [DRAG_END] Drag ended for block:', blockType);
      onDragEnd?.();
    }

    // 모든 상태 초기화
    isPointerDownRef.current = false; // ref 초기화
    setCanDrag(false);
    setPointerMoved(false);
  };    // 전역 마우스 이벤트 리스너를 통한 드래그 처리
  useFrame((state) => {
    if (meshRef.current) {
      // 드래그 중이 아닐 때의 일반적인 애니메이션 및 위치 동기화
      if (!isDragging) {
        // position prop에 따라 블록 위치 동기화 (정확한 위치로 설정)
        const newX = position[0];
        const newY = position[1];
        const newZ = position[2];

        // 선택된 블록의 애니메이션을 위한 Y 오프셋 계산
        const animationOffset = isSelected ? Math.sin(Date.now() * 0.003) * 0.05 : 0;
        const targetY = newY + animationOffset;

        // 현재 mesh 위치와 다를 때만 업데이트 (애니메이션 오프셋 고려)
        const threshold = 0.01; // 임계값을 높여서 미세한 변화 무시
        const needsUpdate =
          Math.abs(meshRef.current.position.x - newX) > threshold ||
          Math.abs(meshRef.current.position.z - newZ) > threshold ||
          (!isSelected && Math.abs(meshRef.current.position.y - newY) > threshold);

        if (needsUpdate) {
          // 크기 변경이나 실제 위치 변경 시에만 로그 출력
          const isSignificantChange =
            Math.abs(meshRef.current.position.x - newX) > 0.1 ||
            Math.abs(meshRef.current.position.y - newY) > 0.1 ||
            Math.abs(meshRef.current.position.z - newZ) > 0.1;

          if (isSignificantChange) {
            console.log('🎯 [BASEBLOCK_SYNC] Syncing mesh position with prop:', {
              from: { x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z },
              to: { x: newX, y: newY, z: newZ },
              isSelected,
              animationOffset
            });
          }
        }

        // 위치 설정 (애니메이션 오프셋 포함)
        meshRef.current.position.set(newX, targetY, newZ);
      }
    }

    // 드래그 중이고 1초 지연이 완료된 경우에만 실시간 위치 계산 및 업데이트
    if (isDragging && canDrag && allowDrag && meshRef.current) {
      // 마우스 위치를 3D 공간으로 변환 (Y=0 평면에 투영)
      const mouse = state.mouse;
      const vector = new Vector3(mouse.x, mouse.y, 0.5);
      vector.unproject(camera);

      const direction = vector.sub(camera.position).normalize();
      const distance = -camera.position.y / direction.y;
      const worldPosition = camera.position.clone().add(direction.multiplyScalar(distance));

      // 격자에 정확한 스냅 - 유틸리티 함수 사용으로 일관성 보장
      const snappedX = snapToGrid(worldPosition.x);
      const snappedZ = snapToGrid(worldPosition.z);

      // Y축은 원래 블록 위치의 Y를 유지 (높이 변경 없음)
      // App.tsx에서 스택킹이나 충돌 처리할 때 Y를 결정하도록 함
      const snappedPosition = new Vector3(snappedX, position[1], snappedZ);

      // 블록이 실제로 이동했을 때만 업데이트 (불필요한 렌더링 방지)
      const currentPos = meshRef.current.position;
      const threshold = 0.001; // 더 엄격한 임계값
      if (Math.abs(currentPos.x - snappedPosition.x) > threshold ||
        Math.abs(currentPos.z - snappedPosition.z) > threshold) {

        console.log('🎯 [DRAG_UPDATE] Raw mouse position:', { x: mouse.x, y: mouse.y });
        console.log('🎯 [DRAG_UPDATE] World position (before snap):', { x: worldPosition.x, z: worldPosition.z });
        console.log('🎯 [DRAG_UPDATE] Position update:', {
          from: { x: currentPos.x, z: currentPos.z },
          to: { x: snappedPosition.x, z: snappedPosition.z }
        });
        console.log('🎯 [DRAG_UPDATE] Visual mesh position being set to:', snappedPosition);

        // 실시간으로 블록의 시각적 위치 업데이트 (즉시 이동)
        meshRef.current.position.set(snappedPosition.x, snappedPosition.y, snappedPosition.z);

        // 실시간으로 드래그 업데이트 전송 (다른 컴포넌트에서 사용)
        onDragUpdate?.(snappedPosition);

        console.log('🎯 [DRAG_UPDATE] After mesh.position.set, actual mesh position:', meshRef.current.position);
      }
    }
  });

  // 전역 이벤트 리스너 등록 (드래그 중 마우스가 블록 밖으로 나가도 감지)
  React.useEffect(() => {
    if (isDragging) {
      const handleMouseUp = () => {
        if (isDragging) {
          console.log('🎯 [DRAG_END] Global mouse up - ending drag');

          // 최종 위치로 이동 처리
          if (meshRef.current) {
            const finalPosition = new Vector3(
              meshRef.current.position.x,
              meshRef.current.position.y,
              meshRef.current.position.z
            );
            console.log('🎯 [DRAG_END] Final position:', finalPosition);
            onMove?.(finalPosition);
          }

          setIsDragging(false);
          onDragEnd?.();
        }
      };

      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('pointerup', handleMouseUp);

      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('pointerup', handleMouseUp);
      };
    }
  }, [isDragging, onMove, onDragEnd]);

  // 스택 레벨에 따른 강조 효과
  const stackGlow = isStacked ? 0.1 + stackLevel * 0.05 : 0;

  // EBS 블록의 경우 역할에 따른 색상 결정
  const getBlockColor = () => {
    if (blockType === 'volume' && ebsRole) {
      return getEBSRoleColor(ebsRole);
    }
    return color;
  };

  // EBS 블록의 역할 표시 라벨
  const getDisplayLabel = () => {
    if (blockType === 'volume' && ebsRole && ebsRole !== 'unassigned') {
      return getEBSRoleLabel(ebsRole);
    }
    return label;
  };

  const displayColor = getBlockColor();
  const displayLabel = getDisplayLabel();

  return (
    <group>
      {/* 메인 블록 */}
      <mesh
        ref={meshRef}
        position={position}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onContextMenu={handleRightClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={getConnectionModeColor()}
          transparent={false}
          opacity={1}
          emissive={getConnectionModeEmissive()}
          emissiveIntensity={getConnectionModeEmissiveIntensity()}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* 연결 모드 표시 - 주석 처리 */}
      {/* {isConnecting && (
                <mesh
                    position={[position[0], position[1] + size[1] / 2 + 0.3, position[2]]}
                >
                    <octahedronGeometry args={[0.2]} />
                    <meshBasicMaterial
                        color="#00ff00"
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            )} */}

      {/* 스택 레벨 표시 - 주석 처리 */}
      {/* {isStacked && stackLevel > 0 && (
                <mesh
                    position={[
                        position[0] + size[0] / 2 - 0.1,
                        position[1] + size[1] / 2 + 0.1,
                        position[2] + size[2] / 2 - 0.1
                    ]}
                >
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial
                        color="#ffff00"
                        transparent
                        opacity={0.9}
                    />
                </mesh>
            )} */}

      {/* EBS 역할 표시 (volume 타입만) */}
      {blockType === 'volume' && ebsRole && ebsRole !== 'unassigned' && (
        <group position={[position[0], position[1] + size[1] / 2 + 0.2, position[2]]}>
          {/* 역할 표시 배경 */}
          <mesh>
            <planeGeometry args={[displayLabel.length * 0.1 + 0.3, 0.25]} />
            <meshBasicMaterial
              color={ebsRole === 'boot' ? '#ff6b35' : '#4ecdc4'}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* 역할 텍스트는 3D 텍스트 라이브러리가 필요하므로 일단 색상으로만 구분 */}
        </group>
      )}

      {/* 라벨 표시 (기존) */}
      {displayLabel && displayLabel !== label && (
        <group position={[position[0], position[1] + size[1] / 2 + 0.5, position[2]]}>
          {/* 라벨 배경 */}
          <mesh>
            <planeGeometry args={[displayLabel.length * 0.1 + 0.2, 0.3]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}

      {/* 드래그 중 그림자 */}
      {isDragging && (
        <mesh
          position={[position[0], 0.01, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[size[0] * 1.2, size[2] * 1.2]} />
          <meshBasicMaterial
            color="#333333"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}