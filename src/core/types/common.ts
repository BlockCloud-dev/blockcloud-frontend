// 공통 타입 정의

export enum BlockCategory {
    COMPUTE = 'compute',
    NETWORK = 'network',
    STORAGE = 'storage',
    SECURITY = 'security',
    DATABASE = 'database',
    LOAD_BALANCER = 'load-balancer',
    DNS = 'dns'
}

export enum CloudProviderType {
    AWS = 'aws',
    GCP = 'gcp',
    AZURE = 'azure'
}

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface Size3D {
    width: number;
    height: number;
    depth: number;
}

export interface CloudBlock {
    id: string;
    name: string;
    description: string;
    provider: CloudProviderType;
    type: string;
    category: BlockCategory;
    icon: any;
    color: string;
    size?: [number, number, number];
    properties: Record<string, any>;
}

export interface StackingRule {
    childType: string;
    parentType: string;
    connectionType: string;
    isBootVolume?: boolean;
}

export interface ConnectionRule {
    fromType: string;
    toType: string;
    connectionType: string;
    properties?: Record<string, any>;
}

export interface ProviderFeature {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

