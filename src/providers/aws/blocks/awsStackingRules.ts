import type { StackingRule } from '../../../core/types/common';

/**
 * AWS 스태킹 규칙 정의
 * 기존 stackingRules.ts와 stackingStore.ts에서 가져온 AWS 규칙들
 */
export const AWS_STACKING_RULES: StackingRule[] = [
    // 네트워킹 계층
    { childType: 'aws-subnet', parentType: 'aws-vpc', connectionType: 'vpc-subnet' },

    // 컴퓨팅 리소스 (벤더 무관 connectionType 사용)
    { childType: 'aws-ec2', parentType: 'aws-subnet', connectionType: 'subnet-compute' },
    { childType: 'aws-ec2', parentType: 'aws-volume', connectionType: 'volume-compute-boot', isBootVolume: true },
    { childType: 'aws-ec2', parentType: 'aws-ebs', connectionType: 'volume-compute-boot', isBootVolume: true },

    // 스토리지 (벤더 무관 connectionType 사용)
    { childType: 'aws-volume', parentType: 'aws-subnet', connectionType: 'subnet-volume' },
    { childType: 'aws-ebs', parentType: 'aws-subnet', connectionType: 'subnet-volume' },

    // 보안
    { childType: 'aws-security-group', parentType: 'aws-vpc', connectionType: 'vpc-security-group' },
    { childType: 'aws-security-group', parentType: 'aws-subnet', connectionType: 'subnet-security-group' },

    // 로드밸런서
    { childType: 'aws-load-balancer', parentType: 'aws-subnet', connectionType: 'subnet-load-balancer' },

    // 데이터베이스 (향후 확장용)
    { childType: 'aws-rds', parentType: 'aws-subnet', connectionType: 'subnet-rds' },
];

/**
 * 스태킹 힌트 메시지 (한국어)
 */
export const AWS_STACKING_HINTS: Record<string, string> = {
    "aws-subnet": "VPC 위에만",
    "aws-ec2": "서브넷 또는 EBS 볼륨 위에만",
    "aws-security-group": "VPC 또는 서브넷 위에만",
    "aws-volume": "서브넷 위에만",
    "aws-ebs": "서브넷 위에만",
    "aws-load-balancer": "서브넷 위에만",
    "aws-rds": "서브넷 위에만",
};

/**
 * AWS 스태킹 규칙 유틸리티 클래스
 */
export class AWSStackingUtils {
    /**
     * 스태킹 유효성 검증
     */
    static validateStacking(childType: string, parentType: string): boolean {
        return AWS_STACKING_RULES.some(rule =>
            rule.childType === childType && rule.parentType === parentType
        );
    }

    /**
     * 스태킹 가능한 부모 타입들 가져오기
     */
    static getStackableParents(childType: string): string[] {
        return AWS_STACKING_RULES
            .filter(rule => rule.childType === childType)
            .map(rule => rule.parentType);
    }

    /**
     * 스태킹 힌트 메시지 가져오기
     */
    static getStackingHint(blockType: string): string {
        return AWS_STACKING_HINTS[blockType] || "적절한 블록 위에만";
    }

    /**
     * 부트 볼륨 스태킹인지 확인
     */
    static isBootVolumeStacking(childType: string, parentType: string): boolean {
        const rule = AWS_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.isBootVolume || false;
    }

    /**
     * 연결 타입 가져오기
     */
    static getConnectionType(childType: string, parentType: string): string | null {
        const rule = AWS_STACKING_RULES.find(r =>
            r.childType === childType && r.parentType === parentType
        );
        return rule?.connectionType || null;
    }
}

