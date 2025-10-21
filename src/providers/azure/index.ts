import { BaseCloudProvider } from '../../core/abstractions/CloudProvider';
import type { CloudBlock, StackingRule, ConnectionRule, ProviderFeature } from '../../core/types/common';
// CloudProviderType 현재 사용하지 않음
import type { Connection } from '../../types/blocks';

import { AZURE_BLOCKS, AzureBlockUtils } from './blocks/azureBlocks';
import { AZURE_STACKING_RULES, AzureStackingUtils } from './blocks/azureStackingRules';
import { AzureTerraformGenerator } from './codeGenerator/terraformGenerator';

/**
 * Azure 클라우드 프로바이더 구현
 * BaseCloudProvider를 상속받아 Azure 특화 기능 구현
 */
export class AzureProvider extends BaseCloudProvider {
  readonly name = 'azure';
  readonly displayName = 'Microsoft Azure';
  readonly icon = '🔷';
  readonly color = '#0078D4'; // Microsoft Blue

  /**
   * Azure 블록 목록 반환
   */
  getBlocks(): CloudBlock[] {
    return [...AZURE_BLOCKS];
  }

  /**
   * Azure 스태킹 규칙 반환
   */
  getStackingRules(): StackingRule[] {
    return [...AZURE_STACKING_RULES];
  }

  /**
   * Azure 연결 규칙 반환 (벤더 무관 connectionType 사용)
   */
  getConnectionRules(): ConnectionRule[] {
    return [
      { fromType: 'virtual-machine', toType: 'network-security-group', connectionType: 'compute-security-group' },
      { fromType: 'virtual-machine', toType: 'managed-disk', connectionType: 'compute-volume' },
      { fromType: 'load-balancer', toType: 'virtual-machine', connectionType: 'load-balancer-compute' },
      { fromType: 'function-app', toType: 'storage-account', connectionType: 'function-app-storage' },
      { fromType: 'virtual-machine', toType: 'sql-database', connectionType: 'vm-sqldb' },
    ];
  }

  /**
   * Terraform 코드 생성
   */
  generateCode(blocks: CloudBlock[], connections: Connection[]): string {
    return AzureTerraformGenerator.generateCode(blocks, connections);
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
    return AzureStackingUtils.getStackingHint(blockType);
  }

  /**
   * Azure 특수 기능들
   */
  getSpecialFeatures(): ProviderFeature[] {
    return [
      {
        id: 'resource-groups',
        name: '리소스 그룹 관리',
        description: '모든 리소스를 리소스 그룹으로 체계적 관리',
        enabled: true
      },
      {
        id: 'managed-identity',
        name: '관리 ID',
        description: 'Azure 서비스 간 안전한 인증을 위한 관리 ID',
        enabled: true
      },
      {
        id: 'availability-zones',
        name: '가용성 영역',
        description: '고가용성을 위한 가용성 영역 지원',
        enabled: true
      },
      {
        id: 'arm-templates',
        name: 'ARM 템플릿 지원',
        description: 'Azure Resource Manager 템플릿 생성 지원',
        enabled: false // Terraform만 지원
      },
      {
        id: 'azure-monitor',
        name: 'Azure Monitor 통합',
        description: '모니터링 및 로깅 서비스 통합',
        enabled: true
      },
    ];
  }

  /**
   * 블록 색상 가져오기 (Azure 특화)
   */
  getBlockColor(blockType: string): string {
    return AzureBlockUtils.getBlockColor(blockType);
  }

  /**
   * Azure 특화 유효성 검증
   */
  validateAzureSpecificRules(blocks: CloudBlock[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Virtual Network 없이 서브넷이 있는지 확인
    const virtualNetworks = blocks.filter(b => b.type === 'virtual-network');
    const subnets = blocks.filter(b => b.type === 'subnet');

    if (subnets.length > 0 && virtualNetworks.length === 0) {
      errors.push('서브넷이 있지만 Virtual Network가 없습니다. Virtual Network를 먼저 생성하세요.');
    }

    // VM 없이 Managed Disk만 있는지 확인
    const virtualMachines = blocks.filter(b => b.type === 'virtual-machine');
    const managedDisks = blocks.filter(b => b.type === 'managed-disk');

    if (managedDisks.length > 0 && virtualMachines.length === 0) {
      warnings.push('Managed Disk가 있지만 Virtual Machine이 없습니다.');
    }

    // NSG가 있는지 확인
    const nsgs = blocks.filter(b => b.type === 'network-security-group');
    if (virtualMachines.length > 0 && nsgs.length === 0) {
      recommendations.push('Virtual Machine을 위한 Network Security Group을 추가하는 것이 좋습니다.');
    }

    // Function App과 Storage Account 연결 확인
    const functionApps = blocks.filter(b => b.type === 'function-app');
    const storageAccounts = blocks.filter(b => b.type === 'storage-account');
    if (functionApps.length > 0 && storageAccounts.length === 0) {
      warnings.push('Function App이 있지만 Storage Account가 없습니다. Function App은 Storage Account가 필요합니다.');
    }

    // 리전 일관성 확인
    const locations = new Set();
    blocks.forEach(block => {
      if (block.properties.location) {
        locations.add(block.properties.location);
      }
    });

    if (locations.size > 1) {
      warnings.push(`여러 리전을 사용하고 있습니다: ${Array.from(locations).join(', ')}. 네트워크 지연시간과 데이터 전송 비용을 고려하세요.`);
    }

    // 리소스 그룹 명명 규칙 검증
    blocks.forEach(block => {
      if (block.properties.resourceGroupName) {
        const validation = AzureBlockUtils.validateResourceGroupName(block.properties.resourceGroupName);
        if (!validation.isValid) {
          errors.push(...validation.errors.map(error => `${block.name}: ${error}`));
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Azure 리소스 비용 추정 (간단한 예시)
   */
  estimateMonthlyCost(blocks: CloudBlock[]): {
    totalCost: number;
    breakdown: Array<{ blockType: string; count: number; unitCost: number; totalCost: number; currency: string }>;
  } {
    // 간단한 Azure 가격 예시 (실제로는 더 복잡한 계산 필요)
    const pricing: Record<string, number> = {
      'virtual-network': 0, // 무료
      'subnet': 0, // 무료
      'virtual-machine': 8.76, // B1s 월 비용 (USD)
      'managed-disk': 4.81, // 32GB Standard LRS 월 비용
      'network-security-group': 0, // 무료
      'load-balancer': 18.25, // Standard Load Balancer 월 비용
      'storage-account': 0.05, // GB당 월 비용 (LRS)
      'sql-database': 4.90, // Basic DTU 월 비용
      'function-app': 0, // 무료 티어 (실행량에 따라)
      'application-gateway': 36.50, // Standard v2 월 비용
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
    console.log('🚀 [AzureProvider] Initializing Azure provider...');
    // Azure SDK 초기화, 구독 설정 등이 필요한 경우 여기서 처리
    console.log('✅ [AzureProvider] Azure provider initialized successfully');
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized(): boolean {
    return true; // 현재는 항상 초기화됨으로 간주
  }

  /**
   * AWS/GCP와의 호환성 매핑
   */
  getServiceMapping(): Record<string, { aws: string; gcp: string }> {
    return AzureBlockUtils.getServiceMapping();
  }

  /**
   * Azure 모범 사례 검증
   */
  validateBestPractices(blocks: CloudBlock[]): Array<{
    category: string;
    rule: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
  }> {
    const results = [];

    // 보안 모범 사례
    const virtualMachines = blocks.filter(b => b.type === 'virtual-machine');
    const nsgs = blocks.filter(b => b.type === 'network-security-group');

    if (virtualMachines.length > 0) {
      if (nsgs.length === 0) {
        results.push({
          category: 'Security',
          rule: 'Network Security Groups',
          status: 'warning' as const,
          message: 'VM을 위한 Network Security Group을 설정하세요.'
        });
      } else {
        results.push({
          category: 'Security',
          rule: 'Network Security Groups',
          status: 'pass' as const,
          message: 'Network Security Group이 설정되어 있습니다.'
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
    const expensiveVMs = virtualMachines.filter(vm =>
      vm.properties.size && !vm.properties.size.includes('B1s')
    );

    if (expensiveVMs.length > 0) {
      results.push({
        category: 'Cost Optimization',
        rule: 'VM Sizes',
        status: 'warning' as const,
        message: '개발 환경에서는 B1s VM 사용을 고려해보세요.'
      });
    }

    // 리소스 태그 확인
    const untaggedResources = blocks.filter(block =>
      !block.properties.tags || Object.keys(block.properties.tags).length === 0
    );

    if (untaggedResources.length > 0) {
      results.push({
        category: 'Management',
        rule: 'Resource Tagging',
        status: 'warning' as const,
        message: '리소스 관리를 위해 태그를 추가하는 것이 좋습니다.'
      });
    }

    return results;
  }
}

// 편의를 위한 기본 인스턴스 내보내기
export const azureProvider = new AzureProvider();
