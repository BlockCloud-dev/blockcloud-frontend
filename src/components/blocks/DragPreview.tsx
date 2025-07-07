import { Vector3 } from 'three';
import type { DroppedBlock } from '../../types/blocks';

interface DragPreviewProps {
  position: Vector3;
  blockSize: [number, number, number];
  isValidPosition: boolean;
  canStack: boolean;
  targetBlocks: DroppedBlock[];
}

export function DragPreview({
  position,
  blockSize,
  isValidPosition,
  canStack,
  targetBlocks
}: DragPreviewProps) {
  // 미리보기 색상 결정
  const getPreviewColor = () => {
    if (!isValidPosition) {
      return '#ff4444'; // 빨간색 - 충돌
    }
    if (canStack && targetBlocks.length > 0) {
      return '#44ff44'; // 초록색 - 스택킹 가능
    }
    return '#4488ff'; // 파란색 - 일반 배치 가능
  };

  const previewColor = getPreviewColor();
  const opacity = isValidPosition ? 0.6 : 0.8;

  return (
    <group>
      {/* 테스트용 간단한 미리보기 박스 */}
      <mesh position={[position.x, position.y, position.z]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* 미리보기 블록 */}
      <mesh position={[position.x, position.y, position.z]}>
        <boxGeometry args={blockSize} />
        <meshStandardMaterial
          color={previewColor}
          transparent
          opacity={opacity}
          wireframe={!isValidPosition}
        />
      </mesh>

      {/* 위치 가이드 바닥 */}
      <mesh position={[position.x, 0.01, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[blockSize[0] * 1.2, blockSize[2] * 1.2]} />
        <meshBasicMaterial
          color={previewColor}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* 스택킹 가이드 */}
      {canStack && targetBlocks.length > 0 && (
        <group>
          {/* 스택킹 화살표 */}
          <mesh position={[position.x, position.y + blockSize[1] / 2 + 0.3, position.z]}>
            <coneGeometry args={[0.2, 0.4, 8]} />
            <meshBasicMaterial
              color="#44ff44"
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* 스택킹 연결선 */}
          {targetBlocks.map((targetBlock, index) => {
            const distance = Math.abs(position.y - targetBlock.position.y);
            const centerY = (position.y + targetBlock.position.y) / 2;

            return (
              <mesh
                key={`stack-guide-${index}`}
                position={[position.x, centerY, position.z]}
              >
                <cylinderGeometry args={[0.02, 0.02, distance, 8]} />
                <meshBasicMaterial
                  color="#44ff44"
                  transparent
                  opacity={0.5}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 충돌 경고 표시 */}
      {!isValidPosition && (
        <group>
          {/* 경고 아이콘 */}
          <mesh position={[position.x, position.y + blockSize[1] / 2 + 0.5, position.z]}>
            <octahedronGeometry args={[0.2]} />
            <meshBasicMaterial
              color="#ff4444"
              transparent
              opacity={0.9}
            />
          </mesh>

          {/* 금지 원형 */}
          <mesh position={[position.x, 0.02, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[blockSize[0] * 0.7, blockSize[0] * 0.8, 32]} />
            <meshBasicMaterial
              color="#ff4444"
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
