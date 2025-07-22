import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DragPreviewState } from '../layout/Canvas3DTypes';

interface EnhancedDragPreviewProps {
  previewState: DragPreviewState;
}

export function EnhancedDragPreview({ previewState }: EnhancedDragPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { isVisible, position, blockType, isValidPosition } = previewState;

  // 애니메이션 효과
  useFrame((state) => {
    if (meshRef.current && isVisible && position) {
      // position을 그대로 사용 (useDragAndDrop에서 이미 올바른 스택킹 위치 계산)
      meshRef.current.position.x = position.x;
      meshRef.current.position.y = position.y; // Y 좌표도 직접 사용
      meshRef.current.position.z = position.z;

      // 부드러운 펄스 효과
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });

  if (!isVisible || !position) {
    return null;
  }

  // position을 그대로 사용 (useDragAndDrop에서 이미 올바른 스택킹 위치 계산)
  const renderPosition = position || new THREE.Vector3(0, 0, 0);

  // 블록 타입별 색상 및 크기 설정
  const getBlockConfig = (type: string) => {
    switch (type) {
      case 'vpc':
        return {
          color: '#4A90E2',
          size: [4, 0.2, 3] as [number, number, number],
          opacity: 0.8
        };
      case 'subnet':
        return {
          color: '#7ED321',
          size: [3, 0.2, 2] as [number, number, number],
          opacity: 0.8
        };
      case 'ebs':
        return {
          color: '#F39C12',
          size: [0.8, 0.4, 0.8] as [number, number, number],
          opacity: 0.9
        };
      case 'ec2':
        return {
          color: '#E74C3C',
          size: [1, 0.6, 1] as [number, number, number],
          opacity: 0.8
        };
      case 'rds':
        return {
          color: '#9B59B6',
          size: [1.2, 0.8, 1.2] as [number, number, number],
          opacity: 0.8
        };
      default:
        return {
          color: '#95A5A6',
          size: [1, 1, 1] as [number, number, number],
          opacity: 0.7
        };
    }
  };

  const { color, size, opacity } = getBlockConfig(blockType || 'default');

  return (
    <mesh
      ref={meshRef}
      position={[renderPosition.x, renderPosition.y, renderPosition.z]}
      renderOrder={999}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest={false}
      />
      {!isValidPosition && (
        <mesh>
          <boxGeometry args={[size[0] * 1.1, size[1] * 1.1, size[2] * 1.1]} />
          <meshBasicMaterial
            color="#FF0000"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial
          color={isValidPosition ? "#FFFFFF" : "#FF0000"}
          transparent
          opacity={0.8}
        />
      </lineSegments>
    </mesh>
  );
}
