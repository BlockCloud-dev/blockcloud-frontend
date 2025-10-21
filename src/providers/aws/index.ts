import { BaseCloudProvider } from '../../core/abstractions/CloudProvider';
import type { CloudBlock, StackingRule, ConnectionRule, ProviderFeature } from '../../core/types/common';
// CloudProviderType는 현재 이 파일에서 사용하지 않지만, 다른 파일에서 import할 수 있음
import type { Connection } from '../../types/blocks';

import { AWS_BLOCKS, AWSBlockUtils } from './blocks/awsBlocks';
import { AWS_STACKING_RULES, AWSStackingUtils } from './blocks/awsStackingRules';
import { AWSTerraformGenerator } from './codeGenerator/terraformGenerator';

/**
 * AWS 클라우드 프로바이더 구현
 * BaseCloudProvider를 상속받아 AWS 특화 기능 구현
 */
export class AWSProvider extends BaseCloudProvider {
  readonly name = 'aws';
  readonly displayName = 'Amazon Web Services';
  readonly icon = '☁️';
  readonly color = '#FF9900'; // AWS Orange

  /**
   * AWS 블록 목록 반환
   */
  getBlocks(): CloudBlock[] {
    return [...AWS_BLOCKS];
  }

  /**
   * AWS 스태킹 규칙 반환
   */
  getStackingRules(): StackingRule[] {
    return [...AWS_STACKING_RULES];
  }

  /**
   * AWS 연결 규칙 반환 (벤더 무관 connectionType 사용)
   */
  getConnectionRules(): ConnectionRule[] {
    return [
      { fromType: 'ec2', toType: 'security-group', connectionType: 'compute-security-group' },
      { fromType: 'ec2', toType: 'volume', connectionType: 'compute-volume' },
      { fromType: 'ec2', toType: 'ebs', connectionType: 'compute-volume' },
      { fromType: 'load-balancer', toType: 'ec2', connectionType: 'load-balancer-compute' },
      { fromType: 'load-balancer', toType: 'security-group', connectionType: 'load-balancer-security-group' },
    ];
  }

  /**
   * Terraform 코드 생성
   */
  generateCode(blocks: CloudBlock[], connections: Connection[]): string {
    return AWSTerraformGenerator.generateCode(blocks, connections);
  }

  /**
   * 코드 언어 반환
   */
  getCodeLanguage(): string {
    return 'terraform';
  }

  /**
   * 스태킹 힌트 메시지 (오버라이드)
   */
  getStackingHint(blockType: string): string {
    return AWSStackingUtils.getStackingHint(blockType);
  }

  /**
   * AWS 특수 기능들
   */
  getSpecialFeatures(): ProviderFeature[] {
    return [
      {
        id: 'ebs-role-analysis',
        name: 'EBS 역할 분석',
        description: 'EBS 볼륨의 부트/블록 스토리지 역할 자동 분석',
        enabled: true
      },
      {
        id: 'auto-vpc-creation',
        name: '자동 VPC 생성',
        description: '서브넷 배치 시 VPC 자동 생성',
        enabled: true
      },
      {
        id: 'security-group-optimization',
        name: '보안 그룹 최적화',
        description: '중복 규칙 제거 및 최적화',
        enabled: true
      },
    ];
  }

  /**
   * 블록 색상 가져오기 (AWS 특화)
   */
  getBlockColor(blockType: string): string {
    return AWSBlockUtils.getBlockColor(blockType);
  }

  /**
   * AWS 특화 유효성 검증
   */
  validateAWSSpecificRules(blocks: CloudBlock[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // VPC 없이 서브넷이 있는지 확인
    const vpcs = blocks.filter(b => b.type === 'vpc');
    const subnets = blocks.filter(b => b.type === 'subnet');

    if (subnets.length > 0 && vpcs.length === 0) {
      errors.push('서브넷이 있지만 VPC가 없습니다. VPC를 먼저 생성하세요.');
    }

    // EC2 없이 EBS만 있는지 확인
    const ec2s = blocks.filter(b => b.type === 'ec2');
    const volumes = blocks.filter(b => b.type === 'volume' || b.type === 'ebs');

    if (volumes.length > 0 && ec2s.length === 0) {
      warnings.push('EBS 볼륨이 있지만 EC2 인스턴스가 없습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 초기화 (필요한 경우)
   */
  async initialize(): Promise<void> {
    console.log('🚀 [AWSProvider] Initializing AWS provider...');
    // AWS SDK 초기화, 리전 설정 등이 필요한 경우 여기서 처리
    console.log('✅ [AWSProvider] AWS provider initialized successfully');
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized(): boolean {
    return true; // 현재는 항상 초기화됨으로 간주
  }
}

// 편의를 위한 기본 인스턴스 내보내기
export const awsProvider = new AWSProvider();

