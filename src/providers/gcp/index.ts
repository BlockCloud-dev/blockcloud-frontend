import { BaseCloudProvider } from '../../core/abstractions/CloudProvider';
import type { CloudBlock, StackingRule, ConnectionRule, ProviderFeature } from '../../core/types/common';
// CloudProviderType는 현재 이 파일에서 사용하지 않지만, 다른 파일에서 import할 수 있음
import type { Connection } from '../../types/blocks';

import { GCP_BLOCKS, GCPBlockUtils } from './blocks/gcpBlocks';
import { GCP_STACKING_RULES, GCPStackingUtils } from './blocks/gcpStackingRules';
import { GCPTerraformGenerator } from './codeGenerator/terraformGenerator';

/**
 * GCP 클라우드 프로바이더 구현
 * BaseCloudProvider를 상속받아 GCP 특화 기능 구현
 */
export class GCPProvider extends BaseCloudProvider {
  readonly name = 'gcp';
  readonly displayName = 'Google Cloud Platform';
  readonly icon = '🌐';
  readonly color = '#4285F4'; // Google Blue

  /**
   * GCP 블록 목록 반환
   */
  getBlocks(): CloudBlock[] {
    return [...GCP_BLOCKS];
  }

  /**
   * GCP 스태킹 규칙 반환
   */
  getStackingRules(): StackingRule[] {
    return [...GCP_STACKING_RULES];
  }

  /**
   * GCP 연결 규칙 반환 (벤더 무관 connectionType 사용)
   */
  getConnectionRules(): ConnectionRule[] {
    return [
      { fromType: 'compute-engine', toType: 'firewall-rule', connectionType: 'compute-security-group' },
      { fromType: 'compute-engine', toType: 'persistent-disk', connectionType: 'compute-volume' },
      { fromType: 'load-balancer', toType: 'compute-engine', connectionType: 'load-balancer-compute' },
      { fromType: 'cloud-function', toType: 'cloud-storage', connectionType: 'cloud-function-cloud-storage' },
      { fromType: 'compute-engine', toType: 'cloud-sql', connectionType: 'compute-engine-cloud-sql' },
    ];
  }

  /**
   * Terraform 코드 생성
   */
  generateCode(blocks: CloudBlock[], connections: Connection[]): string {
    return GCPTerraformGenerator.generateCode(blocks, connections);
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
    return GCPStackingUtils.getStackingHint(blockType);
  }

  /**
   * GCP 특수 기능들
   */
  getSpecialFeatures(): ProviderFeature[] {
    return [
      {
        id: 'global-vpc',
        name: '글로벌 VPC 네트워크',
        description: 'GCP VPC는 글로벌 리소스로 여러 리전에 걸쳐 사용 가능',
        enabled: true
      },
      {
        id: 'regional-persistent-disk',
        name: '리전별 영구 디스크',
        description: '영구 디스크를 여러 존에서 복제하여 고가용성 제공',
        enabled: true
      },
      {
        id: 'preemptible-instances',
        name: '선점형 인스턴스',
        description: '비용 절약을 위한 선점형 VM 인스턴스 지원',
        enabled: true
      },
      {
        id: 'cloud-armor',
        name: 'Cloud Armor 보안',
        description: 'DDoS 보호 및 웹 애플리케이션 방화벽',
        enabled: true
      },
      {
        id: 'serverless-integration',
        name: '서버리스 통합',
        description: 'Cloud Functions, Cloud Run과의 완벽한 통합',
        enabled: true
      },
    ];
  }

  /**
   * 블록 색상 가져오기 (GCP 특화)
   */
  getBlockColor(blockType: string): string {
    return GCPBlockUtils.getBlockColor(blockType);
  }

  /**
   * GCP 특화 유효성 검증
   */
  validateGCPSpecificRules(blocks: CloudBlock[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // VPC Network 없이 서브넷이 있는지 확인
    const vpcNetworks = blocks.filter(b => b.type === 'vpc-network');
    const subnets = blocks.filter(b => b.type === 'subnet');

    if (subnets.length > 0 && vpcNetworks.length === 0) {
      errors.push('서브넷이 있지만 VPC Network가 없습니다. VPC Network를 먼저 생성하세요.');
    }

    // Compute Engine 없이 Persistent Disk만 있는지 확인
    const computeEngines = blocks.filter(b => b.type === 'compute-engine');
    const persistentDisks = blocks.filter(b => b.type === 'persistent-disk');

    if (persistentDisks.length > 0 && computeEngines.length === 0) {
      warnings.push('Persistent Disk가 있지만 Compute Engine 인스턴스가 없습니다.');
    }

    // Firewall Rule이 있는지 확인
    const firewallRules = blocks.filter(b => b.type === 'firewall-rule');
    if (computeEngines.length > 0 && firewallRules.length === 0) {
      recommendations.push('Compute Engine 인스턴스를 위한 방화벽 규칙을 추가하는 것이 좋습니다.');
    }

    // Cloud SQL과 Compute Engine 연결 확인
    const cloudSQLs = blocks.filter(b => b.type === 'cloud-sql');
    if (cloudSQLs.length > 0 && computeEngines.length === 0) {
      warnings.push('Cloud SQL이 있지만 연결할 Compute Engine이 없습니다.');
    }

    // 리전 일관성 확인
    const regions = new Set();
    blocks.forEach(block => {
      if (block.properties.region) {
        regions.add(block.properties.region);
      }
      if (block.properties.zone) {
        const region = block.properties.zone.split('-').slice(0, -1).join('-');
        regions.add(region);
      }
    });

    if (regions.size > 1) {
      warnings.push(`여러 리전을 사용하고 있습니다: ${Array.from(regions).join(', ')}. 네트워크 지연시간을 고려하세요.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * GCP 리소스 비용 추정 (간단한 예시)
   */
  estimateMonthlyCost(blocks: CloudBlock[]): {
    totalCost: number;
    breakdown: Array<{ blockType: string; count: number; unitCost: number; totalCost: number; currency: string }>;
  } {
    // 간단한 GCP 가격 예시 (실제로는 더 복잡한 계산 필요)
    const pricing: Record<string, number> = {
      'vpc-network': 0, // 무료
      'subnet': 0, // 무료
      'compute-engine': 24.27, // e2-micro 월 비용 (USD)
      'persistent-disk': 0.04, // GB당 월 비용 (pd-standard)
      'firewall-rule': 0, // 무료
      'load-balancer': 18, // HTTP(S) Load Balancer 월 비용
      'cloud-sql': 7.67, // db-f1-micro 월 비용
      'cloud-storage': 0.02, // GB당 월 비용 (Standard)
      'cloud-function': 0, // 무료 티어 (호출량에 따라)
    };

    const breakdown = Object.entries(pricing).map(([blockType, unitCost]) => {
      const count = blocks.filter(b => b.type === blockType).length;
      return {
        blockType,
        count,
        unitCost,
        totalCost: count * unitCost,
        currency: 'USD'
      };
    }).filter(item => item.count > 0);

    const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    return { totalCost, breakdown };
  }

  /**
   * 초기화
   */
  async initialize(): Promise<void> {
    console.log('🚀 [GCPProvider] Initializing GCP provider...');
    // GCP SDK 초기화, 프로젝트 설정 등이 필요한 경우 여기서 처리
    console.log('✅ [GCPProvider] GCP provider initialized successfully');
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized(): boolean {
    return true; // 현재는 항상 초기화됨으로 간주
  }

  /**
   * AWS와의 호환성 매핑
   */
  getAWSCompatibilityMapping(): Record<string, string> {
    return GCPBlockUtils.getAWSEquivalent as any;
  }

  /**
   * GCP 모범 사례 검증
   */
  validateBestPractices(blocks: CloudBlock[]): Array<{
    category: string;
    rule: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
  }> {
    const results = [];

    // 보안 모범 사례
    const computeEngines = blocks.filter(b => b.type === 'compute-engine');
    const firewallRules = blocks.filter(b => b.type === 'firewall-rule');

    if (computeEngines.length > 0) {
      if (firewallRules.length === 0) {
        results.push({
          category: 'Security',
          rule: 'Firewall Rules',
          status: 'warning' as const,
          message: 'VM 인스턴스를 위한 방화벽 규칙을 설정하세요.'
        });
      } else {
        results.push({
          category: 'Security',
          rule: 'Firewall Rules',
          status: 'pass' as const,
          message: '방화벽 규칙이 설정되어 있습니다.'
        });
      }
    }

    // 고가용성 모범 사례
    const subnets = blocks.filter(b => b.type === 'subnet');
    if (subnets.length === 1) {
      results.push({
        category: 'High Availability',
        rule: 'Multiple Subnets',
        status: 'warning' as const,
        message: '고가용성을 위해 여러 서브넷을 사용하는 것이 좋습니다.'
      });
    }

    // 비용 최적화
    const expensiveInstances = computeEngines.filter(vm =>
      vm.properties.machineType && !vm.properties.machineType.includes('micro')
    );

    if (expensiveInstances.length > 0) {
      results.push({
        category: 'Cost Optimization',
        rule: 'Instance Types',
        status: 'warning' as const,
        message: '개발 환경에서는 micro 인스턴스 사용을 고려해보세요.'
      });
    }

    return results;
  }
}

// 편의를 위한 기본 인스턴스 내보내기
export const gcpProvider = new GCPProvider();
