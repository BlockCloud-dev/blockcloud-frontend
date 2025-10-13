import type { DroppedBlock, Connection } from '../types/blocks';

// 블록 타입 헬퍼 함수들 (벤더 접두사 무관)
const isCompute = (type: string) => type.includes('ec2') || type.includes('compute-engine') || type.includes('virtual-machine');
const isVolume = (type: string) => type.includes('volume') || type.includes('ebs') || type.includes('disk');

export interface VolumeRoleAnalysis {
    blockId: string;
    role: 'boot' | 'block-storage' | 'unassigned';
    reason: string;
    relatedBlocks: string[];
}

/**
 * Volume 블록의 역할을 분석하고 결정하는 함수 (벤더 무관)
 * 
 * 규칙:
 * 1. Compute 인스턴스가 Volume 위에 스택되어 있으면 => 부트 볼륨 (boot)
 * 2. Compute 인스턴스와 Volume이 연결되어 있으면 => 블록 스토리지 (block-storage)
 * 3. 어떤 관계도 없으면 => 미할당 (unassigned)
 */
export function analyzeVolumeRole(
    volumeBlock: DroppedBlock,
    allBlocks: DroppedBlock[],
    connections: Connection[]
): VolumeRoleAnalysis {
    const volumeId = volumeBlock.id;
    const relatedBlocks: string[] = [];

    // 1. 스택킹 관계 확인 - Compute가 Volume 위에 있는지 체크 (벤더 무관)
    const computeOnTop = allBlocks.find(block => {
        if (!isCompute(block.type)) return false;

        // 같은 위치에 있는지 확인 (X, Z 좌표가 거의 같음)
        const distance = Math.sqrt(
            Math.pow(block.position.x - volumeBlock.position.x, 2) +
            Math.pow(block.position.z - volumeBlock.position.z, 2)
        );

        // Compute가 Volume보다 위에 있고 같은 위치에 있는지 확인
        const isStacked = distance < 0.6 && block.position.y > volumeBlock.position.y;

        if (isStacked) {
            relatedBlocks.push(block.id);
        }

        return isStacked;
    });

    if (computeOnTop) {
        return {
            blockId: volumeId,
            role: 'boot',
            reason: `Compute 인스턴스 (${computeOnTop.name})가 위에 스택되어 부트 볼륨으로 사용됨`,
            relatedBlocks
        };
    }

    // 2. 연결 관계 확인 - Compute와 연결되어 있는지 체크 (벤더 무관)
    const roadConnection = connections.find(conn => {
        const connectedBlock = allBlocks.find(b =>
            b.id === (conn.fromBlockId === volumeId ? conn.toBlockId : conn.fromBlockId)
        );
        const isConnectedToCompute = connectedBlock && isCompute(connectedBlock.type);

        // 스택 연결이 아닌 일반 연결인지 확인
        const isRoadConnection = !conn.properties?.stackConnection;

        if (isConnectedToCompute && isRoadConnection) {
            const computeBlockId = conn.fromBlockId === volumeId ? conn.toBlockId : conn.fromBlockId;
            const computeBlock = allBlocks.find(b => b.id === computeBlockId);
            if (computeBlock) {
                relatedBlocks.push(computeBlock.id);
            }
        }

        return isConnectedToCompute && isRoadConnection;
    });

    if (roadConnection) {
        const computeBlockId = roadConnection.fromBlockId === volumeId ? roadConnection.toBlockId : roadConnection.fromBlockId;
        const computeBlock = allBlocks.find(b => b.id === computeBlockId);

        return {
            blockId: volumeId,
            role: 'block-storage',
            reason: `Compute 인스턴스 (${computeBlock?.name})와 연결되어 추가 블록 스토리지로 사용됨`,
            relatedBlocks
        };
    }

    // 3. 어떤 관계도 없는 경우
    return {
        blockId: volumeId,
        role: 'unassigned',
        reason: 'Compute 인스턴스와의 관계가 설정되지 않은 독립적인 볼륨',
        relatedBlocks
    };
}

/**
 * 모든 Volume 블록의 역할을 분석하는 함수 (벤더 무관)
 */
export function analyzeAllVolumeRoles(
    blocks: DroppedBlock[],
    connections: Connection[]
): VolumeRoleAnalysis[] {
    const volumeBlocks = blocks.filter(block => isVolume(block.type));

    return volumeBlocks.map(volumeBlock =>
        analyzeVolumeRole(volumeBlock, blocks, connections)
    );
}

/**
 * Volume 블록의 역할에 따라 블록 속성을 업데이트하는 함수 (벤더 무관)
 */
export function updateVolumeBlockProperties(
    blocks: DroppedBlock[],
    connections: Connection[]
): DroppedBlock[] {
    const analyses = analyzeAllVolumeRoles(blocks, connections);

    return blocks.map(block => {
        if (!isVolume(block.type)) return block;

        const analysis = analyses.find(a => a.blockId === block.id);
        if (!analysis) return block;

        return {
            ...block,
            properties: {
                ...block.properties,
                volumeRole: analysis.role,
                roleDescription: analysis.reason
            }
        };
    });
}

/**
 * Volume 역할에 따른 색상 반환 (벤더 무관)
 */
export function getVolumeRoleColor(role: 'boot' | 'block-storage' | 'unassigned'): string {
    switch (role) {
        case 'boot':
            return '#ff6b35'; // 주황색 - 부트볼륨
        case 'block-storage':
            return '#4ecdc4'; // 청록색 - 블록스토리지
        case 'unassigned':
            return '#95a5a6'; // 회색 - 미할당
        default:
            return '#95a5a6';
    }
}

/**
 * Volume 역할에 따른 표시 텍스트 반환 (벤더 무관)
 */
export function getVolumeRoleLabel(role: 'boot' | 'block-storage' | 'unassigned'): string {
    switch (role) {
        case 'boot':
            return '부트 볼륨';
        case 'block-storage':
            return '블록 스토리지';
        case 'unassigned':
            return '볼륨';
        default:
            return '볼륨';
    }
}

