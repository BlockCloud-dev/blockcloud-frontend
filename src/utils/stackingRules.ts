import { providerManager } from "../providers";

// 블록 스태킹 규칙 정의 (폴백용 - 모든 벤더 포함)
export const STACKING_RULES: Record<string, string[]> = {
  // AWS 블록들
  "aws-vpc": [], // VPC는 최하단
  "aws-subnet": ["aws-vpc"], // 서브넷은 VPC 위에만
  "aws-security-group": ["aws-vpc", "aws-subnet"], // 보안그룹은 VPC나 서브넷 위에
  "aws-ebs": ["aws-subnet"], // EBS는 서브넷 위에만
  "aws-volume": ["aws-subnet"], // EBS Volume은 서브넷 위에만
  "aws-ec2": ["aws-subnet", "aws-ebs", "aws-volume"], // EC2는 서브넷 또는 EBS/Volume 위에
  "aws-load-balancer": ["aws-subnet"], // 로드밸런서는 서브넷 위에만

  // GCP 블록들
  "gcp-vpc-network": [], // GCP VPC Network
  "gcp-subnet": ["gcp-vpc-network"], // 서브넷은 VPC Network 위에만
  "gcp-compute-engine": ["gcp-subnet", "gcp-persistent-disk"], // Compute Engine
  "gcp-persistent-disk": ["gcp-subnet"], // Persistent Disk
  "gcp-firewall-rule": ["gcp-vpc-network", "gcp-subnet"], // Firewall Rule
  "gcp-load-balancer": ["gcp-subnet"], // Load Balancer

  // Azure 블록들
  "azure-virtual-network": [], // Azure Virtual Network
  "azure-subnet": ["azure-virtual-network"], // 서브넷은 Virtual Network 위에만
  "azure-virtual-machine": ["azure-subnet", "azure-managed-disk"], // Virtual Machine
  "azure-managed-disk": ["azure-subnet"], // Managed Disk
  "azure-network-security-group": ["azure-virtual-network", "azure-subnet"], // NSG
  "azure-load-balancer": ["azure-subnet"], // Load Balancer
};

// 스태킹 힌트 메시지 정의 (모든 프로바이더 포함)
export const STACKING_HINTS: Record<string, string> = {
  // AWS 힌트
  "aws-subnet": "VPC 위에만",
  "aws-ec2": "서브넷 또는 EBS 볼륨 위에만",
  "aws-security-group": "VPC 또는 서브넷 위에만",
  "aws-volume": "서브넷 위에만",
  "aws-ebs": "서브넷 위에만",
  "aws-load-balancer": "서브넷 위에만",

  // GCP 힌트
  "gcp-vpc-network": "바닥에만 배치 가능",
  "gcp-subnet": "VPC Network 위에만",
  "gcp-compute-engine": "서브넷 또는 Persistent Disk 위에만",
  "gcp-persistent-disk": "서브넷 위에만",
  "gcp-firewall-rule": "VPC Network 또는 서브넷 위에만",
  "gcp-load-balancer": "서브넷 위에만",

  // Azure 힌트
  "azure-virtual-network": "바닥에만 배치 가능",
  "azure-subnet": "Virtual Network 위에만",
  "azure-virtual-machine": "서브넷 또는 Managed Disk 위에만",
  "azure-managed-disk": "서브넷 위에만",
  "azure-network-security-group": "Virtual Network 또는 서브넷 위에만",
  "azure-load-balancer": "서브넷 위에만",
};

// 스태킹 유효성 검증 함수
export function validateStacking(childType: string, parentType: string): boolean {
  // 현재 프로바이더가 있다면 프로바이더의 검증 사용
  const currentProvider = providerManager.getCurrentProvider();
  if (currentProvider) {
    return currentProvider.validateStacking(childType, parentType);
  }

  // 폴백으로 통합된 규칙 사용
  const allowedTargets = STACKING_RULES[childType] || [];
  return allowedTargets.includes(parentType);
}

// 스태킹 힌트 메시지 가져오기
export function getStackingHint(blockType: string): string {
  // 현재 프로바이더가 있다면 프로바이더의 힌트 사용
  const currentProvider = providerManager.getCurrentProvider();
  if (currentProvider) {
    return currentProvider.getStackingHint(blockType);
  }

  // 폴백으로 통합된 힌트 사용
  return STACKING_HINTS[blockType] || "적절한 블록 위에만";
}

// 블록이 반드시 부모를 가져야 하는지 확인 (VPC/Virtual Network 제외)
export function requiresParent(blockType: string): boolean {
  const allowedParents = STACKING_RULES[blockType] || [];
  return allowedParents.length > 0;
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
// 이 함수는 stackingStore를 사용하도록 업데이트되어야 합니다
export function canDeleteBlock(blockId: string, allBlocks: any[]): {
  canDelete: boolean;
  reason?: string;
  stackedBlocks?: any[];
} {
  // 위치 기반 검사 (fallback)
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

// stackingStore 기반 삭제 검증 (권장)
export function canDeleteBlockWithStore(
  blockId: string,
  stackingStates: Map<string, any>,
  allBlocks: any[]
): {
  canDelete: boolean;
  reason?: string;
  stackedBlocks?: any[];
} {
  const stackingState = stackingStates.get(blockId);

  console.log('🔍 삭제 검증:', {
    blockId,
    stackingState,
    hasState: !!stackingState,
    childBlockIds: stackingState?.childBlockIds
  });

  // 스태킹 상태가 없거나 자식이 없으면 삭제 가능
  if (!stackingState || !stackingState.childBlockIds || stackingState.childBlockIds.length === 0) {
    console.log('✅ 삭제 가능 - 스택된 자식 블록 없음');
    return { canDelete: true };
  }

  // 자식 블록들 찾기 (실제로 존재하는 블록만)
  const childBlocks = stackingState.childBlockIds
    .map((childId: string) => allBlocks.find(b => b.id === childId))
    .filter(Boolean);

  console.log('🔍 자식 블록 검증:', {
    childIdsInState: stackingState.childBlockIds,
    actualChildBlocks: childBlocks.map((b: any) => ({ id: b.id, type: b.type }))
  });

  // 실제 존재하는 자식 블록이 없으면 삭제 가능
  if (childBlocks.length === 0) {
    console.log('✅ 삭제 가능 - 자식 블록 ID는 있지만 실제 블록은 존재하지 않음 (stale state)');
    return { canDelete: true };
  }

  console.log('❌ 삭제 불가 - 실제 스택된 블록 존재:', childBlocks.length);
  return {
    canDelete: false,
    reason: `이 블록 위에 ${childBlocks.length}개의 블록이 스택되어 있습니다.`,
    stackedBlocks: childBlocks
  };
}
