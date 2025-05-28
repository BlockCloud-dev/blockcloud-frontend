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
    isConnecting = false,
    isStacked = false,
    stackLevel = 0
}: BaseBlockProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { camera } = useThree();
    const [lastDragPosition, setLastDragPosition] = useState<Vector3 | null>(null);
    const [dragEndProcessed, setDragEndProcessed] = useState(false);

    // 드래그를 위한 상태 추가
    const [pointerDownTime, setPointerDownTime] = useState<number>(0);
    const [pointerMoved, setPointerMoved] = useState(false);
    const [initialPointerPosition, setInitialPointerPosition] = useState<{ x: number, y: number } | null>(null);

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

        // 드래그가 발생하지 않은 경우에만 클릭으로 처리
        if (!pointerMoved && !isDragging) {
            console.log('🎯 [CLICK] Block clicked:', blockType, position);
            onClick?.();
        } else {
            console.log('🎯 [CLICK] Click ignored due to drag:', { pointerMoved, isDragging });
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

        console.log('🎯 [POINTER_DOWN] BaseBlock handlePointerDown called');

        // Three.js 이벤트에서 stopPropagation 안전하게 호출
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }

        // 포인터 다운 시간과 위치 기록
        setPointerDownTime(Date.now());
        setPointerMoved(false);
        setInitialPointerPosition({
            x: event.clientX || 0,
            y: event.clientY || 0
        });

        console.log('🎯 [POINTER_DOWN] Pointer down at:', event.clientX || 0, event.clientY || 0);
    };

    // 포인터 이동 감지
    const handlePointerMove = (event: any) => {
        if (!initialPointerPosition || pointerDownTime === 0) return;

        const clientX = event.clientX || 0;
        const clientY = event.clientY || 0;

        const moveDistance = Math.sqrt(
            Math.pow(clientX - initialPointerPosition.x, 2) +
            Math.pow(clientY - initialPointerPosition.y, 2)
        );

        // 5px 이상 이동하면 포인터가 움직인 것으로 간주
        if (moveDistance > 5) {
            setPointerMoved(true);

            // 포인터가 움직이고 아직 드래그 중이 아니면 즉시 드래그 시작
            if (!isDragging && allowDrag) {
                console.log('🎯 [DRAG_START] Starting drag on first move');
                setIsDragging(true);
                setDragEndProcessed(false);
                onDragStart?.();
            }
        }
    };

    // 포인터 업 핸들러
    const handlePointerUp = () => {
        console.log('🎯 [POINTER_UP] BaseBlock handlePointerUp called');

        // 드래그 중이면 끝내기
        if (isDragging) {
            handleGlobalPointerUp();
        }

        // 상태 초기화 (약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록)
        setTimeout(() => {
            setPointerDownTime(0);
            setInitialPointerPosition(null);
            setPointerMoved(false);
        }, 10);
    };    // 전역 마우스 이벤트 리스너를 통한 드래그 처리
    useFrame((state) => {
        if (meshRef.current) {
            // 드래그 중이 아닐 때의 일반적인 애니메이션 및 위치 동기화
            if (!isDragging) {
                // position prop에 따라 블록 위치 동기화 (정확한 위치로 설정)
                const newX = position[0];
                const newY = position[1];
                const newZ = position[2];

                // 현재 mesh 위치와 다를 때만 업데이트 및 로깅
                if (Math.abs(meshRef.current.position.x - newX) > 0.001 ||
                    Math.abs(meshRef.current.position.y - newY) > 0.001 ||
                    Math.abs(meshRef.current.position.z - newZ) > 0.001) {

                    console.log('🎯 [BASEBLOCK_SYNC] Syncing mesh position with prop:', {
                        from: { x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z },
                        to: { x: newX, y: newY, z: newZ }
                    });
                }

                meshRef.current.position.set(newX, newY, newZ);

                // 선택된 블록은 약간 위아래로 움직임
                if (isSelected) {
                    meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.05;
                }
            }
        }

        // 드래그 중일 때만 실시간 위치 계산 및 업데이트
        if (isDragging && allowDrag && meshRef.current) {
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

                // 마지막 드래그 위치 저장 (X, Z만 변경, Y는 원본 유지)
                setLastDragPosition(snappedPosition);

                // 실시간으로 드래그 업데이트 전송 (다른 컴포넌트에서 사용)
                onDragUpdate?.(snappedPosition);

                console.log('🎯 [DRAG_UPDATE] After mesh.position.set, actual mesh position:', meshRef.current.position);
            }
        }
    });

    // 드래그 종료 (전역 이벤트)
    const handleGlobalPointerUp = () => {
        if (!isDragging || dragEndProcessed) return;

        console.log('🎯 [DRAG_END] BaseBlock global pointerUp - ending drag');
        console.log('🎯 [DRAG_END] Current mesh position before final move:', meshRef.current?.position);
        console.log('🎯 [DRAG_END] Last drag position stored:', lastDragPosition);
        setDragEndProcessed(true);

        // 최종 위치로 이동 처리 - lastDragPosition 대신 현재 mesh 위치 사용
        if (meshRef.current) {
            const currentMeshPosition = meshRef.current.position;
            const finalPosition = new Vector3(currentMeshPosition.x, currentMeshPosition.y, currentMeshPosition.z);

            console.log('🎯 [DRAG_END] Using current mesh position as final position:', finalPosition);

            // App.tsx에 위치 업데이트 알림 (App.tsx가 최종 위치를 결정)
            console.log('🎯 [DRAG_END] Calling onMove with position:', finalPosition);
            onMove?.(finalPosition);
        } else {
            console.log('🎯 [DRAG_END] No meshRef available, skipping move');
        }

        // 드래그 상태 종료
        setIsDragging(false);
        onDragEnd?.();

        // 위치 상태 초기화
        setLastDragPosition(null);

        // 처리 완료 후 플래그 리셋 (다음 드래그를 위해)
        setTimeout(() => setDragEndProcessed(false), 100);
    };

    // 전역 이벤트 리스너 등록
    React.useEffect(() => {
        if (isDragging) {
            const handleMouseUp = () => {
                handleGlobalPointerUp();
            };

            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('pointerup', handleMouseUp);

            return () => {
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('pointerup', handleMouseUp);
            };
        }
    }, [isDragging]);

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
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={handleRightClick}
                castShadow
                receiveShadow
            >
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color={displayColor}
                    transparent={false}
                    opacity={1}
                    emissive={isSelected ? displayColor : (isDragging ? displayColor : '#000000')}
                    emissiveIntensity={isSelected ? 0.2 : (isDragging ? 0.1 : stackGlow)}
                    roughness={0.3}
                    metalness={0.1}
                />
            </mesh>

            {/* 연결 모드 표시 */}
            {isConnecting && (
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
            )}

            {/* 스택 레벨 표시 */}
            {isStacked && stackLevel > 0 && (
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
            )}

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