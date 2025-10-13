import type { StackingRule } from '../../../core/types/common';

/**
 * Azure 스태킹 규칙 정의
 * Azure 아키텍처 모범 사례를 기반으로 한 블록 스태킹 규칙
 */
export const AZURE_STACKING_RULES: StackingRule[] = [
    // 네트워킹 계층 - Virtual Network가 기본 레이어 (벤더 무관 connectionType)
    { childType: 'azure-subnet', parentType: 'azure-virtual-network', connectionType: 'vpc-subnet' },

    // 컴퓨팅 리소스 - Virtual Machine은 서브넷 위에 배치 (벤더 무관 connectionType)
    { childType: 'azure-virtual-machine', parentType: 'azure-subnet', connectionType: 'subnet-compute' },
    { childType: 'azure-virtual-machine', parentType: 'azure-managed-disk', connectionType: 'volume-compute-boot', isBootVolume: true },

    // 스토리지 - Managed Disk는 서브넷 위에 배치 (벤더 무관 connectionType)
    { childType: 'azure-managed-disk', parentType: 'azure-subnet', connectionType: 'subnet-volume' },

    // 보안 - NSG는 Virtual Network 또는 서브넷 위에 적용 (벤더 무관 connectionType)
    { childType: 'azure-network-security-group', parentType: 'azure-virtual-network', connectionType: 'vpc-security-group' },
    { childType: 'azure-network-security-group', parentType: 'azure-subnet', connectionType: 'subnet-security-group' },

    // 로드밸런서 - 서브넷 위에 배치
    { childType: 'azure-load-balancer', parentType: 'azure-subnet', connectionType: 'subnet-load-balancer' },

];

/**
 * Azure 스태킹 힌트 메시지 (한국어)
 */
export const AZURE_STACKING_HINTS: Record<string, string> = {
    "azure-virtual-network": "바닥에만 배치 가능",
    "azure-subnet": "Virtual Network 위에만",
    "azure-virtual-machine": "서브넷 또는 Managed Disk 위에만",
    "azure-managed-disk": "서브넷 위에만",
    "azure-network-security-group": "Virtual Network 또는 서브넷 위에만",
    "azure-load-balancer": "서브넷 위에만",
};

/**
 * Azure 스태킹 규칙 유틸리티 클래스
 */
export class AzureStackingUtils {
    /**
     * 스태킹 유효성 검증
     */
    static validateStacking(childType: string, parentType: string): boolean {
        return AZURE_STACKING_RULES.some(rule =>
            rule.childType === childType && rule.parentType === parentType
        );
    }

    /**
     * 스태킹 가능한 부모 타입들 가져오기
     */
    static getStackableParents(childType: string): string[] {
        return AZURE_STACKING_RULES
            .filter(rule => rule.childType === childType)
            .map(rule => rule.parentType);
    }

    /**
     * 스태킹 힌트 메시지 가져오기
     */
    static getStackingHint(blockType: string): string {
        return AZURE_STACKING_HINTS[blockType] || "적절한 블록 위에만";
    }

    /**
     * 부트 볼륨 스태킹인지 확인
     */
    static isBootVolumeStacking(childType: string, parentType: string): boolean {
        const rule = AZURE_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.isBootVolume || false;
    }

    /**
     * 연결 타입 가져오기
     */
    static getConnectionType(childType: string, parentType: string): string | null {
        const rule = AZURE_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.connectionType || null;
    }
}
