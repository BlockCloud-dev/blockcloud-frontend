import React from 'react';
import { Vector3 } from 'three';
import type { DroppedBlock } from '../../types/blocks';

interface StackGuideProps {
    position: [number, number, number];
    targetBlocks: DroppedBlock[];
    isDragging: boolean;
}

export function StackGuide({ position, targetBlocks, isDragging }: StackGuideProps) {
    if (!isDragging || targetBlocks.length === 0) return null;

    // 블록 높이 계산 함수
    const getBlockHeight = (blockType: string, size?: [number, number, number]) => {
        if (blockType === 'vpc' || blockType === 'subnet') {
            return size?.[1] || 0.2; // foundation 블록들은 얇음
        }
        return size?.[1] || 1; // 일반 블록들
    };

    // 가장 위 블록의 Y 위치 계산
    const sortedBlocks = targetBlocks.sort((a, b) => b.position.y - a.position.y);
    const topBlock = sortedBlocks[0];
    const topBlockHeight = getBlockHeight(topBlock.type, topBlock.size);
    const topY = topBlock.position.y + topBlockHeight / 2;

    return (
        <group>
            {/* 스택 가이드 표시 */}
            <mesh position={[position[0], topY + 0.5, position[2]]}>
                <boxGeometry args={[1.2, 0.1, 1.2]} />
                <meshBasicMaterial
                    color="#00ff00"
                    transparent
                    opacity={0.4}
                    wireframe
                />
            </mesh>

            {/* 스택 위치 표시 화살표 */}
            <mesh position={[position[0], topY + 0.8, position[2]]}>
                <coneGeometry args={[0.2, 0.4, 8]} />
                <meshBasicMaterial
                    color="#00ff00"
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* 스택 연결 라인 */}
            {targetBlocks.map((block, index) => (
                <mesh
                    key={`stack-line-${block.id}`}
                    position={[position[0], (block.position.y + topY + 0.5) / 2, position[2]]}
                    rotation={[0, 0, 0]}
                >
                    <cylinderGeometry args={[0.02, 0.02, Math.abs(topY + 0.5 - block.position.y), 8]} />
                    <meshBasicMaterial
                        color="#00ff00"
                        transparent
                        opacity={0.3}
                    />
                </mesh>
            ))}
        </group>
    );
}
