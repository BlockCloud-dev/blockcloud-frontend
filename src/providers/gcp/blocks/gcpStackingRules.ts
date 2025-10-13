import type { StackingRule } from '../../../core/types/common';

/**
 * GCP 스태킹 규칙 정의
 * GCP 아키텍처 모범 사례를 기반으로 한 블록 스태킹 규칙
 */
export const GCP_STACKING_RULES: StackingRule[] = [
    // 네트워킹 계층 - VPC Network가 기본 레이어
    { childType: 'gcp-subnet', parentType: 'gcp-vpc-network', connectionType: 'vpc-subnet' },

    // 컴퓨팅 리소스 - Compute Engine은 서브넷 위에 배치 (벤더 무관 connectionType)
    { childType: 'gcp-compute-engine', parentType: 'gcp-subnet', connectionType: 'subnet-compute' },
    { childType: 'gcp-compute-engine', parentType: 'gcp-persistent-disk', connectionType: 'volume-compute-boot', isBootVolume: true },

    // 스토리지 - Persistent Disk는 서브넷 위에 배치 (벤더 무관 connectionType)
    { childType: 'gcp-persistent-disk', parentType: 'gcp-subnet', connectionType: 'subnet-volume' },

    // 보안 - Firewall Rule은 VPC Network 또는 서브넷 위에 적용 (벤더 무관 connectionType)
    { childType: 'gcp-firewall-rule', parentType: 'gcp-vpc-network', connectionType: 'vpc-security-group' },
    { childType: 'gcp-firewall-rule', parentType: 'gcp-subnet', connectionType: 'subnet-security-group' },

    // 로드밸런서 - 서브넷 위에 배치
    { childType: 'gcp-load-balancer', parentType: 'gcp-subnet', connectionType: 'subnet-load-balancer' },


];

/**
 * GCP 스태킹 힌트 메시지 (한국어)
 */
export const GCP_STACKING_HINTS: Record<string, string> = {
    "gcp-vpc-network": "바닥에만 배치 가능",
    "gcp-subnet": "VPC Network 위에만",
    "gcp-compute-engine": "서브넷 또는 Persistent Disk 위에만",
    "gcp-persistent-disk": "서브넷 위에만",
    "gcp-firewall-rule": "VPC Network 또는 서브넷 위에만",
    "gcp-load-balancer": "서브넷 위에만",
};

/**
 * GCP 스태킹 규칙 유틸리티 클래스
 */
export class GCPStackingUtils {
    /**
     * 스태킹 유효성 검증
     */
    static validateStacking(childType: string, parentType: string): boolean {
        return GCP_STACKING_RULES.some(rule =>
            rule.childType === childType && rule.parentType === parentType
        );
    }

    /**
     * 스태킹 가능한 부모 타입들 가져오기
     */
    static getStackableParents(childType: string): string[] {
        return GCP_STACKING_RULES
            .filter(rule => rule.childType === childType)
            .map(rule => rule.parentType);
    }

    /**
     * 스태킹 힌트 메시지 가져오기
     */
    static getStackingHint(blockType: string): string {
        return GCP_STACKING_HINTS[blockType] || "적절한 블록 위에만";
    }

    /**
     * 부트 볼륨 스태킹인지 확인
     */
    static isBootVolumeStacking(childType: string, parentType: string): boolean {
        const rule = GCP_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.isBootVolume || false;
    }

    /**
     * 연결 타입 가져오기
     */
    static getConnectionType(childType: string, parentType: string): string | null {
        const rule = GCP_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.connectionType || null;
    }

    /**
     * GCP 특화 규칙 검증
     */
    static validateGCPSpecificRules(childType: string, parentType: string): {
        isValid: boolean;
        warnings: string[];
        recommendations: string[];
    } {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let isValid = true;

        // Compute Engine 특화 규칙
        if (childType === 'compute-engine') {
            if (parentType === 'persistent-disk') {
                recommendations.push('Persistent Disk를 부트 디스크로 사용합니다. 추가 디스크가 필요한 경우 별도로 연결하세요.');
            } else if (parentType === 'subnet') {
                recommendations.push('VM 인스턴스가 서브넷에 배치됩니다. 방화벽 규칙을 설정하세요.');
            }
        }

        // Firewall Rule 특화 규칙
        if (childType === 'firewall-rule') {
            if (parentType === 'vpc-network') {
                recommendations.push('VPC 레벨 방화벽 규칙입니다. 모든 서브넷에 적용됩니다.');
            } else if (parentType === 'subnet') {
                recommendations.push('서브넷 레벨 방화벽 규칙입니다. 해당 서브넷에만 적용됩니다.');
            }
        }

        // Cloud SQL 특화 규칙
        if (childType === 'cloud-sql') {
            if (parentType === 'subnet') {
                recommendations.push('Cloud SQL은 Private IP를 사용하여 VPC와 연결됩니다.');
            }
        }

        // Cloud Functions 특화 규칙
        if (childType === 'cloud-function') {
            if (parentType === 'vpc-network') {
                recommendations.push('Cloud Functions가 VPC 커넥터를 통해 VPC에 연결됩니다.');
            } else if (parentType === 'subnet') {
                warnings.push('Cloud Functions는 일반적으로 VPC 레벨에서 연결됩니다.');
            }
        }

        return { isValid, warnings, recommendations };
    }

    /**
     * AWS와 GCP 스태킹 규칙 비교
     */
    static compareWithAWS(): Array<{
        gcpType: string;
        awsEquivalent: string;
        stackingDifferences: string[];
    }> {
        return [
            {
                gcpType: 'vpc-network',
                awsEquivalent: 'vpc',
                stackingDifferences: ['GCP VPC는 글로벌 리소스, AWS VPC는 리전 리소스']
            },
            {
                gcpType: 'subnet',
                awsEquivalent: 'subnet',
                stackingDifferences: ['GCP 서브넷은 리전별, AWS 서브넷은 AZ별']
            },
            {
                gcpType: 'compute-engine',
                awsEquivalent: 'ec2',
                stackingDifferences: ['GCP는 영역별 배치, AWS는 서브넷별 배치']
            },
            {
                gcpType: 'firewall-rule',
                awsEquivalent: 'security-group',
                stackingDifferences: ['GCP는 네트워크 레벨, AWS는 인스턴스 레벨 적용']
            }
        ];
    }
}
