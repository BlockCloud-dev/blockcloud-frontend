import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh, PlaneGeometry } from 'three';
import type { Connection } from '../../types/blocks';

interface RoadProps {
    connection: Connection;
    fromPosition: Vector3;
    toPosition: Vector3;
    isSelected?: boolean;
    onClick?: (connection: Connection) => void;
}

export const Road: React.FC<RoadProps> = ({
    connection,
    fromPosition,
    toPosition,
    isSelected = false,
    onClick
}) => {
    const roadRef = useRef<Mesh>(null);

    // 스택킹 연결인지 확인
    const isStackConnection = connection.properties?.stackConnection || false;

    // 스택킹 연결일 때는 도로를 렌더링하지 않음
    if (isStackConnection) {
        return null;
    }

    // 도로 계산 (평면 패널 스타일)
    const { roadGeometry, stripeGeometry, roadColor, roadHeight } = useMemo(() => {
        // 스태킹 연결인지 확인
        const isStacking = isStackConnection;

        // 도로 높이 계산 (블록들보다 위에 배치)
        const roadHeight = Math.max(fromPosition.y, toPosition.y) + 0.1;

        // 시작점과 끝점 설정 (블록들 위에 배치)
        const startPoint = new Vector3(fromPosition.x, roadHeight, fromPosition.z);
        const endPoint = new Vector3(toPosition.x, roadHeight, toPosition.z);

        // 거리 및 중점 계산
        const distance = startPoint.distanceTo(endPoint);
        const midPoint = startPoint.clone().lerp(endPoint, 0.5);

        // 도로 방향 벡터
        const direction = endPoint.clone().sub(startPoint).normalize();
        const angle = Math.atan2(direction.x, direction.z);

        // 도로 크기 (스태킹 연결은 더 넓게)
        const roadWidth = isStacking ? 0.6 : 0.4;
        const roadLength = distance;

        // 메인 도로 평면 지오메트리
        const mainRoadGeometry = new PlaneGeometry(roadWidth, roadLength, 1, Math.max(1, Math.floor(roadLength * 2)));
        mainRoadGeometry.rotateX(-Math.PI / 2); // 수평으로 회전
        mainRoadGeometry.rotateY(angle); // 방향에 맞게 회전
        mainRoadGeometry.translate(midPoint.x, midPoint.y, midPoint.z);

        // 중앙선 지오메트리 (스태킹 연결은 더 굵게)
        const stripeWidth = roadWidth * (isStacking ? 0.15 : 0.1);
        const centralStripeGeometry = new PlaneGeometry(stripeWidth, roadLength, 1, Math.max(1, Math.floor(roadLength * 4)));
        centralStripeGeometry.rotateX(-Math.PI / 2);
        centralStripeGeometry.rotateY(angle);
        centralStripeGeometry.translate(midPoint.x, midPoint.y + 0.002, midPoint.z); // 도로보다 약간 위

        // 연결 타입에 따른 도로 색상 및 라벨
        const getConnectionInfo = (type: string) => {
            switch (type) {
                case 'ec2-security-group':
                    return { color: '#ef4444', label: 'Security' };
                case 'ec2-volume':
                    return { color: '#8b5cf6', label: 'Storage' };
                case 'load-balancer-ec2':
                    return { color: '#f59e0b', label: 'Load Balance' };
                case 'load-balancer-security-group':
                    return { color: '#ec4899', label: 'LB Security' };
                case 'security-group-subnet':
                    return { color: '#f97316', label: isStacking ? 'Stack SG' : 'SG Network' };
                case 'ec2-subnet':
                    return { color: '#10b981', label: isStacking ? 'Stack EC2' : 'EC2 Network' };
                case 'load-balancer-subnet':
                    return { color: '#06b6d4', label: isStacking ? 'Stack LB' : 'LB Network' };
                case 'subnet-vpc':
                    return { color: '#3b82f6', label: 'Stack Subnet' };
                default:
                    return { color: '#6b7280', label: 'Connection' };
            }
        };

        const connectionInfo = getConnectionInfo(connection.connectionType);

        return {
            roadGeometry: mainRoadGeometry,
            stripeGeometry: centralStripeGeometry,
            roadColor: connectionInfo.color,
            roadHeight
        };
    }, [fromPosition, toPosition, connection.connectionType, isStackConnection]);

    // 애니메이션 효과 (선택된 도로는 빛남)
    useFrame((state) => {
        if (roadRef.current && isSelected) {
            const time = state.clock.getElapsedTime();
            const material = roadRef.current.material as any;
            if (material.emissive) {
                const intensity = 0.3 + Math.sin(time * 4) * 0.2;
                material.emissive.setHex(0x555555);
                material.emissiveIntensity = intensity;
            }
        }
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        onClick?.(connection);
    };

    return (
        <group>
            {/* 메인 도로 */}
            <mesh
                ref={roadRef}
                geometry={roadGeometry}
                onClick={handleClick}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'default';
                }}
            >
                <meshStandardMaterial
                    color={roadColor}
                    roughness={isStackConnection ? 0.3 : 0.7}
                    metalness={isStackConnection ? 0.3 : 0.1}
                    transparent
                    opacity={isSelected ? 0.98 : (isStackConnection ? 0.95 : 0.9)}
                    emissive={isSelected ? roadColor : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : (isStackConnection ? 0.1 : 0)}
                    depthWrite={false}
                />
            </mesh>

            {/* 도로 중앙선 (흰색 스트라이프) */}
            <mesh geometry={stripeGeometry}>
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.95}
                    depthWrite={false}
                />
            </mesh>

            {/* 연결 타입 라벨 (도로 위에 표시) */}
            <group position={fromPosition.clone().lerp(toPosition, 0.5).add(new Vector3(0, roadHeight + 0.1, 0))}>
                <mesh>
                    <planeGeometry args={[1.2, 0.25]} />
                    <meshBasicMaterial
                        color="#000000"
                        transparent
                        opacity={0.7}
                    />
                </mesh>
                {/* 실제 텍스트 렌더링은 별도 Text 컴포넌트나 HTML overlay로 구현 필요 */}
                <mesh position={[0, 0, 0.001]}>
                    <planeGeometry args={[1.0, 0.15]} />
                    <meshBasicMaterial
                        color={roadColor}
                        transparent
                        opacity={0.9}
                    />
                </mesh>
            </group>
        </group>
    );
};
