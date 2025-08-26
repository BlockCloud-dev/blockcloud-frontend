import type { DroppedBlock, Connection } from '../types/blocks';

export interface EBSRoleAnalysis {
    blockId: string;
    role: 'boot' | 'block-storage' | 'unassigned';
    reason: string;
    relatedBlocks: string[];
}

/**
 * EBS 블록의 역할을 분석하고 결정하는 함수
 * 
 * 규칙:
 * 1. EC2가 EBS 위에 스택되어 있으면 => 부트 볼륨 (boot)
 * 2. EC2와 EBS가 연결되어 있으면 => 블록 스토리지 (block-storage)
 * 3. 어떤 관계도 없으면 => 미할당 (unassigned)
 */
export function analyzeEBSRole(
    ebsBlock: DroppedBlock,
    allBlocks: DroppedBlock[],
    connections: Connection[]
): EBSRoleAnalysis {
    const ebsId = ebsBlock.id;
    const relatedBlocks: string[] = [];

    // 1. 스택킹 관계 확인 - EC2가 EBS 위에 있는지 체크
    const ec2OnTop = allBlocks.find(block => {
        if (block.type !== 'ec2') return false;

        // 같은 위치에 있는지 확인 (X, Z 좌표가 거의 같음)
        const distance = Math.sqrt(
            Math.pow(block.position.x - ebsBlock.position.x, 2) +
            Math.pow(block.position.z - ebsBlock.position.z, 2)
        );

        // EC2가 EBS보다 위에 있고 같은 위치에 있는지 확인
        const isStacked = distance < 0.6 && block.position.y > ebsBlock.position.y;

        if (isStacked) {
            relatedBlocks.push(block.id);
        }

        return isStacked;
    });

    if (ec2OnTop) {
        return {
            blockId: ebsId,
            role: 'boot',
            reason: `EC2 인스턴스 (${ec2OnTop.name})가 위에 스택되어 부트 볼륨으로 사용됨`,
            relatedBlocks
        };
    }

    // 2. 연결 관계 확인 - EC2와 연결되어 있는지 체크
    const roadConnection = connections.find(conn => {
        const isConnectedToEC2 =
            (conn.fromBlockId === ebsId && allBlocks.find(b => b.id === conn.toBlockId)?.type === 'ec2') ||
            (conn.toBlockId === ebsId && allBlocks.find(b => b.id === conn.fromBlockId)?.type === 'ec2');

        // 스택 연결이 아닌 일반 연결인지 확인
        const isRoadConnection = !conn.properties?.stackConnection;

        if (isConnectedToEC2 && isRoadConnection) {
            const ec2BlockId = conn.fromBlockId === ebsId ? conn.toBlockId : conn.fromBlockId;
            const ec2Block = allBlocks.find(b => b.id === ec2BlockId);
            if (ec2Block) {
                relatedBlocks.push(ec2Block.id);
            }
        }

        return isConnectedToEC2 && isRoadConnection;
    });

    if (roadConnection) {
        const ec2BlockId = roadConnection.fromBlockId === ebsId ? roadConnection.toBlockId : roadConnection.fromBlockId;
        const ec2Block = allBlocks.find(b => b.id === ec2BlockId);

        return {
            blockId: ebsId,
            role: 'block-storage',
            reason: `EC2 인스턴스 (${ec2Block?.name})와 연결되어 추가 블록 스토리지로 사용됨`,
            relatedBlocks
        };
    }

    // 3. 어떤 관계도 없는 경우
    return {
        blockId: ebsId,
        role: 'unassigned',
        reason: 'EC2와의 관계가 설정되지 않은 독립적인 EBS 볼륨',
        relatedBlocks
    };
}

/**
 * 모든 EBS 블록의 역할을 분석하는 함수
 */
export function analyzeAllEBSRoles(
    blocks: DroppedBlock[],
    connections: Connection[]
): EBSRoleAnalysis[] {
    const ebsBlocks = blocks.filter(block => block.type === 'volume');

    return ebsBlocks.map(ebsBlock =>
        analyzeEBSRole(ebsBlock, blocks, connections)
    );
}

/**
 * EBS 블록의 역할에 따라 블록 속성을 업데이트하는 함수
 */
export function updateEBSBlockProperties(
    blocks: DroppedBlock[],
    connections: Connection[]
): DroppedBlock[] {
    const analyses = analyzeAllEBSRoles(blocks, connections);

    return blocks.map(block => {
        if (block.type !== 'volume') return block;

        const analysis = analyses.find(a => a.blockId === block.id);
        if (!analysis) return block;

        return {
            ...block,
            properties: {
                ...block.properties,
                ebsRole: analysis.role,
                roleDescription: analysis.reason
            }
        };
    });
}

/**
 * EBS 역할에 따른 색상 반환
 */
export function getEBSRoleColor(role: 'boot' | 'block-storage' | 'unassigned'): string {
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
 * EBS 역할에 따른 표시 텍스트 반환
 */
export function getEBSRoleLabel(role: 'boot' | 'block-storage' | 'unassigned'): string {
    switch (role) {
        case 'boot':
            return '부트 볼륨';
        case 'block-storage':
            return '블록 스토리지';
        case 'unassigned':
            return 'EBS 볼륨';
        default:
            return 'EBS 볼륨';
    }
}
