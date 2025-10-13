import type { CloudBlock, StackingRule, ConnectionRule, ProviderFeature, BlockCategory } from '../types/common';
import type { Connection } from '../../types/blocks';

/**
 * 클라우드 프로바이더 추상화 인터페이스
 * 모든 클라우드 프로바이더(AWS, GCP, Azure)가 구현해야 하는 공통 인터페이스
 */
export interface CloudProvider {
    // 기본 정보
    readonly name: string;
    readonly displayName: string;
    readonly icon: string;
    readonly color: string;

    // 블록 관리
    getBlocks(): CloudBlock[];
    getBlocksByCategory(category: BlockCategory): CloudBlock[];
    getBlockByType(type: string): CloudBlock | null;

    // 스태킹 규칙
    getStackingRules(): StackingRule[];
    validateStacking(childType: string, parentType: string): boolean;
    getStackingHint(blockType: string): string;
    getStackableTargets(blockType: string): string[];

    // 연결 관리
    getConnectionRules(): ConnectionRule[];
    createConnection(fromBlock: CloudBlock, toBlock: CloudBlock): Connection | null;
    validateConnection(fromType: string, toType: string): boolean;

    // 코드 생성
    generateCode(blocks: CloudBlock[], connections: Connection[]): string;
    getCodeLanguage(): string; // 'terraform', 'cloudformation', 'arm' 등

    // 카테고리 및 특수 기능
    getSupportedCategories(): BlockCategory[];
    getSpecialFeatures(): ProviderFeature[];

    // 초기화 및 설정
    initialize?(): Promise<void>;
    isInitialized?(): boolean;
}

/**
 * 추상 클라우드 프로바이더 기본 클래스
 * 공통 로직을 구현하고 각 프로바이더에서 상속받아 사용
 */
export abstract class BaseCloudProvider implements CloudProvider {
    abstract readonly name: string;
    abstract readonly displayName: string;
    abstract readonly icon: string;
    abstract readonly color: string;

    protected blocks: CloudBlock[] = [];
    protected stackingRules: StackingRule[] = [];
    protected connectionRules: ConnectionRule[] = [];

    // 추상 메서드들 - 각 프로바이더에서 구현 필요
    abstract getBlocks(): CloudBlock[];
    abstract getStackingRules(): StackingRule[];
    abstract getConnectionRules(): ConnectionRule[];
    abstract generateCode(blocks: CloudBlock[], connections: Connection[]): string;
    abstract getCodeLanguage(): string;

    // 공통 구현 메서드들
    getBlocksByCategory(category: BlockCategory): CloudBlock[] {
        return this.getBlocks().filter(block => block.category === category);
    }

    getBlockByType(type: string): CloudBlock | null {
        return this.getBlocks().find(block => block.type === type) || null;
    }

    validateStacking(childType: string, parentType: string): boolean {
        const rules = this.getStackingRules();
        return rules.some(rule =>
            rule.childType === childType && rule.parentType === parentType
        );
    }

    getStackableTargets(blockType: string): string[] {
        const rules = this.getStackingRules();
        return rules
            .filter(rule => rule.childType === blockType)
            .map(rule => rule.parentType);
    }

    getStackingHint(blockType: string): string {
        const targets = this.getStackableTargets(blockType);
        if (targets.length === 0) {
            return "바닥에만 배치 가능";
        }
        return `${targets.join(", ")} 위에만 배치 가능`;
    }

    validateConnection(fromType: string, toType: string): boolean {
        const rules = this.getConnectionRules();
        return rules.some(rule =>
            (rule.fromType === fromType && rule.toType === toType) ||
            (rule.fromType === toType && rule.toType === fromType)
        );
    }

    createConnection(fromBlock: CloudBlock, toBlock: CloudBlock): Connection | null {
        if (!this.validateConnection(fromBlock.type, toBlock.type)) {
            return null;
        }

        const rule = this.getConnectionRules().find(rule =>
            (rule.fromType === fromBlock.type && rule.toType === toBlock.type) ||
            (rule.fromType === toBlock.type && rule.toType === fromBlock.type)
        );

        if (!rule) return null;

        return {
            id: `${fromBlock.id}-${toBlock.id}-${Date.now()}`,
            fromBlockId: fromBlock.id,
            toBlockId: toBlock.id,
            connectionType: rule.connectionType as any,
            properties: rule.properties
        };
    }

    getSupportedCategories(): BlockCategory[] {
        const categories = new Set<BlockCategory>();
        this.getBlocks().forEach(block => categories.add(block.category));
        return Array.from(categories);
    }

    getSpecialFeatures(): ProviderFeature[] {
        return []; // 기본적으로 특수 기능 없음
    }
}

