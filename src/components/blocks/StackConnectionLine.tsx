import { Vector3 } from 'three';
import type { DroppedBlock } from '../../types/blocks';

interface StackConnectionLineProps {
    fromBlock: DroppedBlock;
    toBlock: DroppedBlock;
    stackLevel: number;
}

export function StackConnectionLine({ fromBlock, toBlock, stackLevel }: StackConnectionLineProps) {
    // 두 블록 사이의 중점 계산
    const fromPos = fromBlock.position;
    const toPos = toBlock.position;

    // 연결선의 중점과 길이 계산
    const midPoint = new Vector3(
        (fromPos.x + toPos.x) / 2,
        (fromPos.y + toPos.y) / 2,
        (fromPos.z + toPos.z) / 2
    );

    const distance = fromPos.distanceTo(toPos);

    // 두 점 사이의 방향 벡터
    const direction = new Vector3()
        .subVectors(toPos, fromPos)
        .normalize();

    // 회전 각도 계산
    const rotation = Math.atan2(direction.x, direction.z);

    return (
        <group>
            {/* 메인 연결선 */}
            <mesh
                position={[midPoint.x, midPoint.y, midPoint.z]}
                rotation={[0, rotation, 0]}
            >
                <cylinderGeometry args={[0.03, 0.03, distance, 8]} />
                <meshBasicMaterial
                    color="#00ff88"
                    transparent
                    opacity={0.6 + stackLevel * 0.1}
                />
            </mesh>

            {/* 시작점 표시 */}
            <mesh position={[fromPos.x, fromPos.y + 0.1, fromPos.z]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial
                    color="#00ff88"
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* 끝점 표시 */}
            <mesh position={[toPos.x, toPos.y + 0.1, toPos.z]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial
                    color="#00ff88"
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* 스택 방향 표시 화살표 */}
            {toPos.y > fromPos.y && (
                <mesh
                    position={[toPos.x, toPos.y + 0.3, toPos.z]}
                    rotation={[0, 0, 0]}
                >
                    <coneGeometry args={[0.1, 0.2, 8]} />
                    <meshBasicMaterial
                        color="#00ff88"
                        transparent
                        opacity={0.7}
                    />
                </mesh>
            )}
        </group>
    );
}
