import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SnapGuide } from '../layout/Canvas3DTypes';

interface SnapGuidesProps {
  guides: SnapGuide[];
}

export function SnapGuides({ guides }: SnapGuidesProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 애니메이션 효과
  useFrame(() => {
    if (groupRef.current) {
      // 가이드들이 부드럽게 나타나고 사라지도록
      groupRef.current.children.forEach((child, index) => {
        const material = (child as THREE.Mesh).material as THREE.Material;
        if (material && 'opacity' in material) {
          const targetOpacity = guides[index]?.opacity || 0;
          const currentOpacity = material.opacity;
          material.opacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, 0.1);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {guides.map((guide) => (
        <SnapGuideElement key={guide.id} guide={guide} />
      ))}
    </group>
  );
}

interface SnapGuideElementProps {
  guide: SnapGuide;
}

function SnapGuideElement({ guide }: SnapGuideElementProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && guide.type === 'grid') {
      // 그리드 스냅 가이드는 펄스 효과
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const renderGuide = () => {
    switch (guide.type) {
      case 'grid':
        return null; // 원형 가이드 제거
      /* return (
        <mesh
          ref={meshRef}
          position={[guide.position.x, guide.position.y + 0.01, guide.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshBasicMaterial
            color={guide.color}
            transparent
            opacity={guide.opacity}
          />
        </mesh>
      ); */

      case 'alignment':
        return (
          <mesh
            position={[guide.position.x, guide.position.y, guide.position.z]}
          >
            {guide.direction === 'x' ? (
              <boxGeometry args={[0.05, 3, 0.05]} />
            ) : (
              <boxGeometry args={[0.05, 3, 0.05]} />
            )}
            <meshBasicMaterial
              color={guide.color}
              transparent
              opacity={guide.opacity}
            />
          </mesh>
        );

      case 'edge':
        return null; // 구체 가이드 제거
      /* return (
        <mesh
          position={[guide.position.x, guide.position.y, guide.position.z]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial
            color={guide.color}
            transparent
            opacity={guide.opacity}
          />
        </mesh>
      ); */

      default:
        return null;
    }
  };

  return <group>{renderGuide()}</group>;
}
