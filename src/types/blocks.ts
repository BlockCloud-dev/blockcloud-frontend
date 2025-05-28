import { Vector3 } from 'three';

export interface AWSBlock {
    id: string;
    name: string;
    description: string;
    type: 'foundation' | 'network' | 'compute' | 'storage' | 'security';
    color: string;
    icon: any;
}

// 연결 관계 타입
export interface Connection {
    id: string;
    fromBlockId: string;
    toBlockId: string;
    connectionType: ConnectionType;
    properties?: ConnectionProperties;
    roadPath?: Vector3[]; // 도로 경로 포인트
}

export type ConnectionType =
    | 'ec2-security-group'
    | 'ec2-subnet'
    | 'ec2-volume'
    | 'load-balancer-ec2'
    | 'load-balancer-security-group'
    | 'load-balancer-subnet'
    | 'security-group-subnet'
    | 'subnet-vpc'
    // 역방향 연결들
    | 'security-group-ec2'
    | 'subnet-ec2'
    | 'volume-ec2'
    | 'ec2-load-balancer'
    | 'security-group-load-balancer'
    | 'subnet-load-balancer'
    | 'subnet-security-group'
    | 'vpc-subnet';

export interface ConnectionProperties {
    // EC2-Volume 연결 시
    deviceName?: string;
    deleteOnTermination?: boolean;
    isRootVolume?: boolean;
    volumeType?: 'boot' | 'additional'; // 부트 볼륨 vs 추가 블록 스토리지
    description?: string; // 연결 설명

    // Load Balancer-EC2 연결 시
    port?: number;
    protocol?: 'HTTP' | 'HTTPS' | 'TCP';
    healthCheckPath?: string;

    // Security Group 연결 시
    priority?: number;

    // 스태킹 연결 표시
    stackConnection?: boolean;
}

export interface DroppedBlock {
    id: string;
    type: string;
    name: string;
    position: Vector3;
    timestamp: number;
    properties: BlockProperties;
    size?: [number, number, number];
}

export interface BlockProperties {
    // 공통 속성
    name: string;
    description?: string;

    // VPC 속성
    cidrBlock?: string;
    enableDnsSupport?: boolean;
    enableDnsHostnames?: boolean;

    // Subnet 속성
    vpcId?: string;
    availabilityZone?: string;

    // EC2 속성
    instanceType?: string;
    ami?: string;

    // Security Group 속성
    securityRules?: {
        type: 'ingress' | 'egress';
        protocol: string;
        fromPort: number;
        toPort: number;
        cidrBlocks: string[];
    }[];

    // Load Balancer 속성
    loadBalancerType?: 'application' | 'network';
    subnets?: string[];

    // Volume 속성
    volumeSize?: number;
    volumeType?: string;
    ebsRole?: 'boot' | 'block-storage' | 'unassigned'; // EBS 역할 구분

    // 기타 추가 속성
    [key: string]: any;
}
