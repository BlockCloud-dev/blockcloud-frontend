import {
    Server,
    Cloud,
    Archive,
    Shield,
    Route,
    Building2,
} from "lucide-react";
import { type CloudBlock, BlockCategory } from '../../../core/types/common';
import { CloudProviderType } from '../../../core/types/common';

/**
 * AWS 블록 정의
 * 기존 BlockPalette.tsx의 awsBlocks를 새로운 구조로 변환
 */
export const AWS_BLOCKS: CloudBlock[] = [
    {
        id: "aws-vpc",
        name: "VPC",
        description: "가상 프라이빗 클라우드",
        provider: CloudProviderType.AWS,
        type: "aws-vpc",
        category: BlockCategory.NETWORK,
        icon: Building2,
        color: "bg-blue-500",
        size: [1, 1, 1],
        properties: {
            cidrBlock: "10.0.0.0/16",
            enableDnsSupport: true,
            enableDnsHostnames: true,
        }
    },
    {
        id: "aws-subnet",
        name: "Subnet",
        description: "서브넷",
        provider: CloudProviderType.AWS,
        type: "aws-subnet",
        category: BlockCategory.NETWORK,
        icon: Route,
        color: "bg-green-500",
        size: [1, 1, 1],
        properties: {
            cidrBlock: "10.0.1.0/24",
            availabilityZone: "ap-northeast-2a",
            vpcId: "",
        }
    },
    {
        id: "aws-ec2",
        name: "EC2",
        description: "인스턴스",
        provider: CloudProviderType.AWS,
        type: "aws-ec2",
        category: BlockCategory.COMPUTE,
        icon: Server,
        color: "bg-orange-500",
        size: [1, 1, 1],
        properties: {
            instanceType: "t3.micro",
            ami: "ami-0c6e5afdd23291f73", // Amazon Linux 2
            keyName: "",
        }
    },
    {
        id: "aws-volume",
        name: "EBS Volume",
        description: "스토리지",
        provider: CloudProviderType.AWS,
        type: "aws-volume",
        category: BlockCategory.STORAGE,
        icon: Archive,
        color: "bg-purple-500",
        size: [1, 1, 1],
        properties: {
            volumeSize: 20,
            volumeType: "gp3",
            volumeRole: "unassigned",
        }
    },
    {
        id: "aws-ebs",
        name: "EBS",
        description: "Elastic Block Store",
        provider: CloudProviderType.AWS,
        type: "aws-ebs",
        category: BlockCategory.STORAGE,
        icon: Archive,
        color: "bg-purple-600",
        size: [1, 1, 1],
        properties: {
            volumeSize: 20,
            volumeType: "gp3",
            volumeRole: "unassigned",
        }
    },
    {
        id: "aws-security-group",
        name: "Security Group",
        description: "보안 그룹",
        provider: CloudProviderType.AWS,
        type: "aws-security-group",
        category: BlockCategory.SECURITY,
        icon: Shield,
        color: "bg-red-500",
        size: [1, 1, 1],
        properties: {
            securityRules: [
                {
                    type: "ingress",
                    protocol: "tcp",
                    fromPort: 22,
                    toPort: 22,
                    cidrBlocks: ["0.0.0.0/0"],
                }
            ]
        }
    },
    {
        id: "aws-load-balancer",
        name: "Load Balancer",
        description: "로드 밸런서",
        provider: CloudProviderType.AWS,
        type: "aws-load-balancer",
        category: BlockCategory.LOAD_BALANCER,
        icon: Cloud,
        color: "bg-yellow-500",
        size: [1, 1, 1],
        properties: {
            loadBalancerType: "application",
            subnets: [],
        }
    },
];

/**
 * 블록 타입별 색상 매핑 (기존 BlockRenderer.tsx에서 가져옴)
 */
export const AWS_BLOCK_COLORS: Record<string, string> = {
    "aws-vpc": "#3b82f6", // blue
    "aws-subnet": "#10b981", // green
    "aws-ec2": "#f97316", // orange
    "aws-volume": "#8b5cf6", // purple
    "aws-ebs": "#8b5cf6", // purple
    "aws-security-group": "#ef4444", // red
    "aws-load-balancer": "#eab308", // yellow
};

/**
 * AWS 블록 유틸리티 함수들
 */
export class AWSBlockUtils {
    /**
     * 블록 타입으로 블록 찾기
     */
    static getBlockByType(type: string): CloudBlock | undefined {
        return AWS_BLOCKS.find(block => block.type === type);
    }

    /**
     * 카테고리별 블록 가져오기
     */
    static getBlocksByCategory(category: BlockCategory): CloudBlock[] {
        return AWS_BLOCKS.filter(block => block.category === category);
    }

    /**
     * 블록 색상 가져오기
     */
    static getBlockColor(blockType: string): string {
        return AWS_BLOCK_COLORS[blockType] || "#6b7280"; // default gray
    }

    /**
     * 지원되는 모든 카테고리 가져오기
     */
    static getSupportedCategories(): BlockCategory[] {
        const categories = new Set<BlockCategory>();
        AWS_BLOCKS.forEach(block => categories.add(block.category));
        return Array.from(categories);
    }
}

