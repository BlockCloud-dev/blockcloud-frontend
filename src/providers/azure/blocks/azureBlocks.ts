import {
  Server,
  Cloud,
  Archive,
  Shield,
  Route,
  Building2,
  // Database,  // 사용하지 않음
  // Zap,      // 사용하지 않음
  // Globe,    // 사용하지 않음
} from "lucide-react";
import { type CloudBlock, BlockCategory } from '../../../core/types/common';
import { CloudProviderType } from '../../../core/types/common';

/**
 * Azure 블록 정의
 * AWS, GCP와 대응되는 Azure 서비스들을 정의
 */
export const AZURE_BLOCKS: CloudBlock[] = [
  {
    id: "azure-virtual-network",
    name: "Virtual Network",
    description: "가상 네트워크 (VNet)",
    provider: CloudProviderType.AZURE,
    type: "azure-virtual-network",
    category: BlockCategory.NETWORK,
    icon: Building2,
    color: "bg-blue-700",
    size: [1, 1, 1],
    properties: {
      name: "default-vnet",
      addressSpace: ["10.0.0.0/16"],
      location: "Korea Central",
      resourceGroupName: "default-rg",
    }
  },
  {
    id: "azure-subnet",
    name: "Subnet",
    description: "서브넷",
    provider: CloudProviderType.AZURE,
    type: "azure-subnet",
    category: BlockCategory.NETWORK,
    icon: Route,
    color: "bg-green-700",
    size: [1, 1, 1],
    properties: {
      name: "default-subnet",
      addressPrefix: "10.0.1.0/24",
      virtualNetworkName: "",
      resourceGroupName: "default-rg",
      serviceEndpoints: [],
    }
  },
  {
    id: "azure-virtual-machine",
    name: "Virtual Machine",
    description: "가상 머신",
    provider: CloudProviderType.AZURE,
    type: "azure-virtual-machine",
    category: BlockCategory.COMPUTE,
    icon: Server,
    color: "bg-orange-700",
    size: [1, 1, 1],
    properties: {
      name: "vm-instance",
      size: "Standard_B1s", // Azure 무료 티어
      location: "Korea Central",
      resourceGroupName: "default-rg",
      adminUsername: "azureuser",
      disablePasswordAuthentication: true,
      osProfile: {
        computerName: "vm-instance",
        adminUsername: "azureuser"
      },
      storageImageReference: {
        publisher: "Canonical",
        offer: "0001-com-ubuntu-server-focal",
        sku: "20_04-lts-gen2",
        version: "latest"
      }
    }
  },
  {
    id: "azure-managed-disk",
    name: "Managed Disk",
    description: "관리형 디스크",
    provider: CloudProviderType.AZURE,
    type: "azure-managed-disk",
    category: BlockCategory.STORAGE,
    icon: Archive,
    color: "bg-purple-700",
    size: [1, 1, 1],
    properties: {
      name: "disk",
      storageAccountType: "Standard_LRS", // Standard_LRS, Premium_LRS, StandardSSD_LRS
      diskSizeGb: 30,
      location: "Korea Central",
      resourceGroupName: "default-rg",
      createOption: "Empty",
    }
  },
  {
    id: "azure-network-security-group",
    name: "Network Security Group",
    description: "네트워크 보안 그룹 (NSG)",
    provider: CloudProviderType.AZURE,
    type: "azure-network-security-group",
    category: BlockCategory.SECURITY,
    icon: Shield,
    color: "bg-red-700",
    size: [1, 1, 1],
    properties: {
      name: "nsg",
      location: "Korea Central",
      resourceGroupName: "default-rg",
      securityRules: [
        {
          name: "SSH",
          priority: 1001,
          direction: "Inbound",
          access: "Allow",
          protocol: "Tcp",
          sourcePortRange: "*",
          destinationPortRange: "22",
          sourceAddressPrefix: "*",
          destinationAddressPrefix: "*"
        }
      ]
    }
  },
  {
    id: "azure-load-balancer",
    name: "Load Balancer",
    description: "로드 밸런서",
    provider: CloudProviderType.AZURE,
    type: "azure-load-balancer",
    category: BlockCategory.LOAD_BALANCER,
    icon: Cloud,
    color: "bg-yellow-700",
    size: [1, 1, 1],
    properties: {
      name: "lb",
      location: "Korea Central",
      resourceGroupName: "default-rg",
      sku: "Standard", // Basic, Standard
      type: "Public", // Public, Internal
    }
  },
];

/**
 * Azure 블록 타입별 색상 매핑 (AWS 기준 블록들만)
 */
export const AZURE_BLOCK_COLORS: Record<string, string> = {
  "azure-virtual-network": "#0078d4", // Microsoft Blue
  "azure-subnet": "#107c10", // Microsoft Green
  "azure-virtual-machine": "#d83b01", // Microsoft Orange
  "azure-managed-disk": "#5c2d91", // Microsoft Purple
  "azure-network-security-group": "#c50e20", // Microsoft Red
  "azure-load-balancer": "#ffb900", // Microsoft Yellow
};

/**
 * Azure 블록 유틸리티 함수들
 */
export class AzureBlockUtils {
  /**
   * 블록 타입으로 블록 찾기
   */
  static getBlockByType(type: string): CloudBlock | undefined {
    return AZURE_BLOCKS.find(block => block.type === type);
  }

  /**
   * 카테고리별 블록 가져오기
   */
  static getBlocksByCategory(category: BlockCategory): CloudBlock[] {
    return AZURE_BLOCKS.filter(block => block.category === category);
  }

  /**
   * 블록 색상 가져오기
   */
  static getBlockColor(blockType: string): string {
    return AZURE_BLOCK_COLORS[blockType] || "#6b7280"; // default gray
  }

  /**
   * 지원되는 모든 카테고리 가져오기
   */
  static getSupportedCategories(): BlockCategory[] {
    const categories = new Set<BlockCategory>();
    AZURE_BLOCKS.forEach(block => categories.add(block.category));
    return Array.from(categories);
  }

  /**
   * AWS/GCP 서비스와의 매핑 관계 (AWS 기준 블록들만)
   */
  static getServiceMapping(): Record<string, { aws: string; gcp: string }> {
    return {
      "azure-virtual-network": { aws: "aws-vpc", gcp: "gcp-vpc-network" },
      "azure-subnet": { aws: "aws-subnet", gcp: "gcp-subnet" },
      "azure-virtual-machine": { aws: "aws-ec2", gcp: "gcp-compute-engine" },
      "azure-managed-disk": { aws: "aws-volume", gcp: "gcp-persistent-disk" },
      "azure-network-security-group": { aws: "aws-security-group", gcp: "gcp-firewall-rule" },
      "azure-load-balancer": { aws: "aws-load-balancer", gcp: "gcp-load-balancer" },
    };
  }

  /**
   * Azure 리전 목록 (주요 리전들)
   */
  static getAvailableRegions(): Array<{ id: string; name: string; location: string }> {
    return [
      { id: "koreacentral", name: "Korea Central", location: "Seoul, South Korea" },
      { id: "koreasouth", name: "Korea South", location: "Busan, South Korea" },
      { id: "japaneast", name: "Japan East", location: "Tokyo, Japan" },
      { id: "japanwest", name: "Japan West", location: "Osaka, Japan" },
      { id: "southeastasia", name: "Southeast Asia", location: "Singapore" },
      { id: "eastus", name: "East US", location: "Virginia, USA" },
      { id: "westeurope", name: "West Europe", location: "Netherlands" },
    ];
  }

  /**
   * Azure VM 크기 목록 (주요 크기들)
   */
  static getAvailableVMSizes(): Array<{ id: string; name: string; vcpus: number; memory: string; description: string; tier: string }> {
    return [
      { id: "Standard_B1s", name: "B1s", vcpus: 1, memory: "1GB", description: "무료 티어", tier: "Basic" },
      { id: "Standard_B1ms", name: "B1ms", vcpus: 1, memory: "2GB", description: "소형", tier: "Basic" },
      { id: "Standard_B2s", name: "B2s", vcpus: 2, memory: "4GB", description: "중형", tier: "Basic" },
      { id: "Standard_D2s_v3", name: "D2s v3", vcpus: 2, memory: "8GB", description: "범용", tier: "Standard" },
      { id: "Standard_D4s_v3", name: "D4s v3", vcpus: 4, memory: "16GB", description: "범용", tier: "Standard" },
    ];
  }

  /**
   * Azure 스토리지 계정 타입
   */
  static getStorageAccountTypes(): Array<{ id: string; name: string; description: string; performance: string }> {
    return [
      { id: "Standard_LRS", name: "Standard LRS", description: "로컬 중복 저장소", performance: "Standard" },
      { id: "Standard_GRS", name: "Standard GRS", description: "지역 중복 저장소", performance: "Standard" },
      { id: "Standard_RAGRS", name: "Standard RA-GRS", description: "읽기 액세스 지역 중복 저장소", performance: "Standard" },
      { id: "Premium_LRS", name: "Premium LRS", description: "프리미엄 로컬 중복 저장소", performance: "Premium" },
    ];
  }

  /**
   * 리소스 그룹 명명 규칙 검증
   */
  static validateResourceGroupName(name: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (name.length < 1 || name.length > 90) {
      errors.push("리소스 그룹 이름은 1-90자 사이여야 합니다.");
    }

    if (!/^[a-zA-Z0-9._()-]+$/.test(name)) {
      errors.push("리소스 그룹 이름에는 영숫자, 마침표, 밑줄, 하이픈, 괄호만 사용할 수 있습니다.");
    }

    if (name.endsWith('.')) {
      errors.push("리소스 그룹 이름은 마침표로 끝날 수 없습니다.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Azure 명명 규칙 검증 (일반적인 리소스)
   */
  static validateResourceName(name: string, resourceType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 리소스별 명명 규칙
    const rules: Record<string, { minLength: number; maxLength: number; pattern: RegExp; description: string }> = {
      'virtual-machine': {
        minLength: 1,
        maxLength: 64,
        pattern: /^[a-zA-Z0-9-]+$/,
        description: "영숫자와 하이픈만 사용 가능"
      },
      'storage-account': {
        minLength: 3,
        maxLength: 24,
        pattern: /^[a-z0-9]+$/,
        description: "소문자와 숫자만 사용 가능"
      },
      'virtual-network': {
        minLength: 2,
        maxLength: 64,
        pattern: /^[a-zA-Z0-9._-]+$/,
        description: "영숫자, 마침표, 밑줄, 하이픈 사용 가능"
      }
    };

    const rule = rules[resourceType];
    if (rule) {
      if (name.length < rule.minLength || name.length > rule.maxLength) {
        errors.push(`${resourceType} 이름은 ${rule.minLength}-${rule.maxLength}자 사이여야 합니다.`);
      }

      if (!rule.pattern.test(name)) {
        errors.push(`${resourceType} 이름: ${rule.description}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
