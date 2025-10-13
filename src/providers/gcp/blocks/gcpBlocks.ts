import {
    Server,
    Cloud,
    Archive,
    Shield,
    Route,
    Building2,
    Database,
    Zap,
} from "lucide-react";
import { type CloudBlock, BlockCategory } from '../../../core/types/common';
import { CloudProviderType } from '../../../core/types/common';

/**
 * GCP 블록 정의
 * AWS와 대응되는 GCP 서비스들을 정의
 */
export const GCP_BLOCKS: CloudBlock[] = [
    {
        id: "gcp-vpc-network",
        name: "VPC Network",
        description: "가상 프라이빗 클라우드 네트워크",
        provider: CloudProviderType.GCP,
        type: "gcp-vpc-network",
        category: BlockCategory.NETWORK,
        icon: Building2,
        color: "bg-blue-600",
        size: [1, 1, 1],
        properties: {
            name: "default-vpc",
            routingMode: "GLOBAL", // GLOBAL or REGIONAL
            autoCreateSubnetworks: false,
            description: "GCP VPC Network",
        }
    },
    {
        id: "gcp-subnet",
        name: "Subnet",
        description: "서브넷",
        provider: CloudProviderType.GCP,
        type: "gcp-subnet",
        category: BlockCategory.NETWORK,
        icon: Route,
        color: "bg-green-600",
        size: [1, 1, 1],
        properties: {
            name: "default-subnet",
            ipCidrRange: "10.0.0.0/24",
            region: "asia-northeast3", // Seoul
            network: "",
            privateIpGoogleAccess: true,
        }
    },
    {
        id: "gcp-compute-engine",
        name: "Compute Engine",
        description: "가상 머신 인스턴스",
        provider: CloudProviderType.GCP,
        type: "gcp-compute-engine",
        category: BlockCategory.COMPUTE,
        icon: Server,
        color: "bg-orange-600",
        size: [1, 1, 1],
        properties: {
            name: "vm-instance",
            machineType: "e2-micro", // GCP의 무료 티어
            zone: "asia-northeast3-a",
            bootDisk: {
                image: "ubuntu-2004-lts",
                size: 20,
                type: "pd-standard"
            },
            networkTags: [],
        }
    },
    {
        id: "gcp-persistent-disk",
        name: "Persistent Disk",
        description: "영구 디스크",
        provider: CloudProviderType.GCP,
        type: "gcp-persistent-disk",
        category: BlockCategory.STORAGE,
        icon: Archive,
        color: "bg-purple-600",
        size: [1, 1, 1],
        properties: {
            name: "disk",
            type: "pd-standard", // pd-standard, pd-ssd, pd-balanced
            size: 20,
            zone: "asia-northeast3-a",
        }
    },
    {
        id: "gcp-firewall-rule",
        name: "Firewall Rule",
        description: "방화벽 규칙",
        provider: CloudProviderType.GCP,
        type: "gcp-firewall-rule",
        category: BlockCategory.SECURITY,
        icon: Shield,
        color: "bg-red-600",
        size: [1, 1, 1],
        properties: {
            name: "allow-ssh",
            direction: "INGRESS", // INGRESS or EGRESS
            priority: 1000,
            sourceRanges: ["0.0.0.0/0"],
            allowed: [
                {
                    protocol: "tcp",
                    ports: ["22"]
                }
            ],
            targetTags: ["ssh-allowed"],
        }
    },
    {
        id: "gcp-load-balancer",
        name: "Load Balancer",
        description: "로드 밸런서",
        provider: CloudProviderType.GCP,
        type: "gcp-load-balancer",
        category: BlockCategory.LOAD_BALANCER,
        icon: Cloud,
        color: "bg-yellow-600",
        size: [1, 1, 1],
        properties: {
            name: "http-lb",
            loadBalancingScheme: "EXTERNAL", // EXTERNAL, INTERNAL, INTERNAL_MANAGED
            protocol: "HTTP", // HTTP, HTTPS, TCP, UDP
            portRange: "80",
        }
    },
];

/**
 * GCP 블록 타입별 색상 매핑 (AWS 기준 블록들만)
 */
export const GCP_BLOCK_COLORS: Record<string, string> = {
    "gcp-vpc-network": "#1a73e8", // Google Blue
    "gcp-subnet": "#34a853", // Google Green
    "gcp-compute-engine": "#ea4335", // Google Red
    "gcp-persistent-disk": "#9333ea", // Purple
    "gcp-firewall-rule": "#dc2626", // Red
    "gcp-load-balancer": "#f59e0b", // Yellow
};

/**
 * GCP 블록 유틸리티 함수들
 */
export class GCPBlockUtils {
    /**
     * 블록 타입으로 블록 찾기
     */
    static getBlockByType(type: string): CloudBlock | undefined {
        return GCP_BLOCKS.find(block => block.type === type);
    }

    /**
     * 카테고리별 블록 가져오기
     */
    static getBlocksByCategory(category: BlockCategory): CloudBlock[] {
        return GCP_BLOCKS.filter(block => block.category === category);
    }

    /**
     * 블록 색상 가져오기
     */
    static getBlockColor(blockType: string): string {
        return GCP_BLOCK_COLORS[blockType] || "#6b7280"; // default gray
    }

    /**
     * 지원되는 모든 카테고리 가져오기
     */
    static getSupportedCategories(): BlockCategory[] {
        const categories = new Set<BlockCategory>();
        GCP_BLOCKS.forEach(block => categories.add(block.category));
        return Array.from(categories);
    }

    /**
     * AWS 서비스와의 매핑 관계 (AWS 기준 블록들만)
     */
    static getAWSEquivalent(gcpType: string): string | null {
        const mapping: Record<string, string> = {
            "gcp-vpc-network": "aws-vpc",
            "gcp-subnet": "aws-subnet",
            "gcp-compute-engine": "aws-ec2",
            "gcp-persistent-disk": "aws-volume",
            "gcp-firewall-rule": "aws-security-group",
            "gcp-load-balancer": "aws-load-balancer",
        };
        return mapping[gcpType] || null;
    }

    /**
     * GCP 리전 목록 (주요 리전들)
     */
    static getAvailableRegions(): Array<{ id: string; name: string; location: string }> {
        return [
            { id: "asia-northeast3", name: "Seoul", location: "South Korea" },
            { id: "asia-northeast1", name: "Tokyo", location: "Japan" },
            { id: "asia-southeast1", name: "Singapore", location: "Singapore" },
            { id: "us-central1", name: "Iowa", location: "United States" },
            { id: "us-east1", name: "South Carolina", location: "United States" },
            { id: "europe-west1", name: "Belgium", location: "Europe" },
        ];
    }

    /**
     * GCP 머신 타입 목록 (주요 타입들)
     */
    static getAvailableMachineTypes(): Array<{ id: string; name: string; vcpus: number; memory: string; description: string }> {
        return [
            { id: "e2-micro", name: "e2-micro", vcpus: 1, memory: "1GB", description: "무료 티어" },
            { id: "e2-small", name: "e2-small", vcpus: 1, memory: "2GB", description: "소형" },
            { id: "e2-medium", name: "e2-medium", vcpus: 1, memory: "4GB", description: "중형" },
            { id: "e2-standard-2", name: "e2-standard-2", vcpus: 2, memory: "8GB", description: "표준 2vCPU" },
            { id: "e2-standard-4", name: "e2-standard-4", vcpus: 4, memory: "16GB", description: "표준 4vCPU" },
        ];
    }
}
