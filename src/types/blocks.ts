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
  // === 계층적 아키텍처 (VPC/Virtual Network → Subnet → Resources) ===
  | 'vpc-subnet'                // VPC/Virtual Network → 서브넷
  | 'vpc-security-group'        // VPC → 보안그룹/방화벽/NSG
  | 'subnet-volume'             // 서브넷 → Volume/Disk
  | 'subnet-compute'            // 서브넷 → Compute (EC2/VM/Compute Engine)
  | 'subnet-security-group'     // 서브넷 → 보안그룹/방화벽/NSG
  | 'subnet-load-balancer'      // 서브넷 → 로드밸런서
  | 'subnet-rds'                // 서브넷 → 데이터베이스 (RDS/Cloud SQL/SQL Database)
  | 'volume-compute-boot'       // Volume → Compute (부트 볼륨, 스택킹)
  | 'volume-compute-block'      // Volume → Compute (블록 볼륨, 연결)
  | 'compute-volume'            // Compute → Volume (양방향 호환성)
  | 'compute-security-group'    // Compute → 보안그룹
  | 'load-balancer-compute'     // 로드밸런서 → Compute
  | 'load-balancer-security-group'  // 로드밸런서 → 보안그룹
  // === AWS 레거시 호환성 (deprecated, 기존 프로젝트용) ===
  | 'subnet-ebs'                // @deprecated use 'subnet-volume'
  | 'subnet-ec2'                // @deprecated use 'subnet-compute'
  | 'ebs-ec2-boot'              // @deprecated use 'volume-compute-boot'
  | 'ebs-ec2-block'             // @deprecated use 'volume-compute-block'
  | 'volume-ec2'                // @deprecated use 'compute-volume'
  | 'volume-ec2-boot'           // @deprecated use 'volume-compute-boot'
  | 'ec2-security-group'        // @deprecated use 'compute-security-group'
  | 'ec2-volume'                // @deprecated use 'compute-volume'
  | 'load-balancer-ec2';        // @deprecated use 'load-balancer-compute'

export interface ConnectionProperties {
  // Compute-Volume 연결 시 (벤더 무관)
  deviceName?: string;
  deleteOnTermination?: boolean;
  isRootVolume?: boolean;
  volumeType?: 'boot' | 'additional' | 'block'; // 부트 볼륨 vs 추가 볼륨 vs 블록 볼륨
  description?: string; // 연결 설명

  // Load Balancer-Compute 연결 시
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
  volumeRole?: 'boot' | 'block-storage' | 'unassigned'; // Volume 역할 구분 (벤더 무관)

  // 기타 추가 속성
  [key: string]: any;
}
