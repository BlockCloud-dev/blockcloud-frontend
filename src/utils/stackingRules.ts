// AWS 블록 스태킹 규칙 정의
export const STACKING_RULES: Record<string, string[]> = {
    vpc: [], // VPC는 최하단
    subnet: ["vpc"], // 서브넷은 VPC 위에만
    "security-group": ["vpc", "subnet"], // 보안그룹은 VPC나 서브넷 위에
    ebs: ["subnet"], // EBS는 서브넷 위에만
    volume: ["subnet"], // EBS Volume은 서브넷 위에만
    ec2: ["subnet", "ebs", "volume"], // EC2는 서브넷 또는 EBS/Volume 위에
    "load-balancer": ["subnet"], // 로드밸런서는 서브넷 위에만
};

// 스태킹 힌트 메시지 정의
export const STACKING_HINTS: Record<string, string> = {
    "subnet": "VPC 위에만",
    "ec2": "서브넷 또는 EBS 볼륨 위에만",
    "security-group": "VPC 또는 서브넷 위에만",
    "volume": "서브넷 위에만",
    "ebs": "서브넷 위에만",
    "load-balancer": "서브넷 위에만"
};

// 스태킹 유효성 검증 함수
export function validateStacking(childType: string, parentType: string): boolean {
    const allowedTargets = STACKING_RULES[childType] || [];
    return allowedTargets.includes(parentType);
}

// 스태킹 힌트 메시지 가져오기
export function getStackingHint(blockType: string): string {
    return STACKING_HINTS[blockType] || "적절한 블록 위에만";
}

// 블록 위에 스택된 블록들 찾기
export function getStackedBlocks(targetBlockId: string, allBlocks: any[]): any[] {
    const targetBlock = allBlocks.find(b => b.id === targetBlockId);
    if (!targetBlock) {
        console.log(`❌ [getStackedBlocks] Target block not found: ${targetBlockId}`);
        return [];
    }

    console.log(`🔍 [getStackedBlocks] Checking stacked blocks for ${targetBlock.type} (${targetBlockId.substring(0, 8)})`);
    console.log(`📍 Target block position:`, {
        x: targetBlock.position.x.toFixed(2),
        y: targetBlock.position.y.toFixed(2),
        z: targetBlock.position.z.toFixed(2)
    });

    console.log(`📋 All blocks in the scene (${allBlocks.length}):`);
    allBlocks.forEach(block => {
        console.log(`  - ${block.type} (${block.id.substring(0, 8)}): x=${block.position.x.toFixed(2)}, y=${block.position.y.toFixed(2)}, z=${block.position.z.toFixed(2)}`);
    });

    const stackedBlocks = allBlocks.filter(block => {
        if (block.id === targetBlockId) return false;

        // 같은 위치에 있으면서 Y좌표가 더 높은 블록들 찾기
        const deltaX = Math.abs(block.position.x - targetBlock.position.x);
        const deltaZ = Math.abs(block.position.z - targetBlock.position.z);
        const deltaY = block.position.y - targetBlock.position.y;

        const isSamePosition = deltaX <= 0.5 && deltaZ <= 0.5;
        const isAbove = deltaY > 0.01; // 최소 차이를 0.01로 줄임

        if (isSamePosition || deltaX < 2.0 && deltaZ < 2.0) { // 근처 블록들도 로깅
            console.log(`📊 [getStackedBlocks] Position check for ${block.type} (${block.id.substring(0, 8)}):`);
            console.log(`    deltaX: ${deltaX.toFixed(2)}, deltaZ: ${deltaZ.toFixed(2)}, deltaY: ${deltaY.toFixed(2)}`);
            console.log(`    isSamePosition: ${isSamePosition}, isAbove: ${isAbove}`);
            console.log(`    result: ${isSamePosition && isAbove}`);
        }

        return isSamePosition && isAbove;
    });

    console.log(`✅ [getStackedBlocks] Found ${stackedBlocks.length} stacked blocks:`,
        stackedBlocks.map(b => `${b.type}(${b.id.substring(0, 8)})`));

    return stackedBlocks;
}

// 삭제 가능한지 검증 (위에 스택된 블록이 없는지)
export function canDeleteBlock(blockId: string, allBlocks: any[]): {
    canDelete: boolean;
    reason?: string;
    stackedBlocks?: any[];
} {
    const stackedBlocks = getStackedBlocks(blockId, allBlocks);

    if (stackedBlocks.length === 0) {
        return { canDelete: true };
    }

    return {
        canDelete: false,
        reason: `이 블록 위에 ${stackedBlocks.length}개의 블록이 스택되어 있습니다.`,
        stackedBlocks
    };
}
