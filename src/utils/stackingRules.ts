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
