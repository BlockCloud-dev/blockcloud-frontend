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
  // === AWS 계층적 아키텍처 (VPC → Subnet → Resources) ===
  | 'vpc-subnet'         // VPC → 서브넷
  | 'subnet-ebs'         // 서브넷 → EBS
  | 'subnet-volume'      // 서브넷 → Volume (블록 볼륨)
  | 'subnet-ec2'         // 서브넷 → EC2
  | 'subnet-security-group' // 서브넷 → 보안그룹
  | 'subnet-load-balancer'  // 서브넷 → 로드밸런서
  | 'ebs-ec2-boot'       // EBS → EC2 (부트 볼륨, 스택킹)
  | 'ebs-ec2-block'      // EBS → EC2 (블록 볼륨, 도로 연결)
  | 'volume-ec2'         // 볼륨 → EC2 (기존 호환성)
  | 'volume-ec2-boot'    // Volume → EC2 (부트 볼륨, 스택킹)
  // === 기존 호환성 유지용 ===
  | 'ec2-security-group'
  | 'ec2-volume'
  | 'load-balancer-ec2'
  | 'load-balancer-security-group';

export interface ConnectionProperties {
  // EC2-Volume 연결 시
  deviceName?: string;
  deleteOnTermination?: boolean;
  isRootVolume?: boolean;
  volumeType?: 'boot' | 'additional' | 'block'; // 부트 볼륨 vs 추가 볼륨 vs 블록 볼륨
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
