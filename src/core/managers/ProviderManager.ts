import type { CloudProvider } from '../abstractions/CloudProvider';
import { CloudProviderType } from '../types/common';

/**
 * 프로바이더 팩토리 - 싱글톤 패턴
 * 모든 클라우드 프로바이더를 관리하고 제공하는 중앙 관리자
 */
export class ProviderManager {
    private static instance: ProviderManager;
    private providers = new Map<CloudProviderType, CloudProvider>();
    private currentProvider: CloudProviderType = CloudProviderType.AWS;

    private constructor() {
        // 싱글톤 패턴
    }

    static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    /**
     * 프로바이더 등록
     */
    registerProvider(type: CloudProviderType, provider: CloudProvider): void {
        console.log(`🌐 [ProviderManager] Registering provider: ${type} (${provider.displayName})`);
        this.providers.set(type, provider);

        // 초기화가 필요한 경우 실행
        if (provider.initialize) {
            provider.initialize().catch(error => {
                console.error(`❌ [ProviderManager] Failed to initialize ${type}:`, error);
            });
        }
    }

    /**
     * 프로바이더 가져오기
     */
    getProvider(type: CloudProviderType): CloudProvider | null {
        const provider = this.providers.get(type);
        if (!provider) {
            console.warn(`⚠️ [ProviderManager] Provider not found: ${type}`);
            return null;
        }
        return provider;
    }

    /**
     * 현재 활성 프로바이더 가져오기
     */
    getCurrentProvider(): CloudProvider | null {
        return this.getProvider(this.currentProvider);
    }

    /**
     * 현재 프로바이더 설정
     */
    setCurrentProvider(type: CloudProviderType): boolean {
        const provider = this.getProvider(type);
        if (!provider) {
            console.error(`❌ [ProviderManager] Cannot set current provider: ${type} not registered`);
            return false;
        }

        console.log(`🔄 [ProviderManager] Switching provider: ${this.currentProvider} → ${type}`);
        this.currentProvider = type;
        return true;
    }

    /**
     * 현재 프로바이더 타입 가져오기
     */
    getCurrentProviderType(): CloudProviderType {
        return this.currentProvider;
    }

    /**
     * 등록된 모든 프로바이더 가져오기
     */
    getAllProviders(): CloudProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * 지원되는 프로바이더 타입 목록
     */
    getSupportedProviders(): CloudProviderType[] {
        return Array.from(this.providers.keys());
    }

    /**
     * 프로바이더가 등록되어 있는지 확인
     */
    isProviderRegistered(type: CloudProviderType): boolean {
        return this.providers.has(type);
    }

    /**
     * 모든 프로바이더 초기화 상태 확인
     */
    areAllProvidersInitialized(): boolean {
        for (const provider of this.providers.values()) {
            if (provider.isInitialized && !provider.isInitialized()) {
                return false;
            }
        }
        return true;
    }

    /**
     * 프로바이더 정보 요약
     */
    getProviderSummary(): Array<{
        type: CloudProviderType;
        name: string;
        displayName: string;
        blockCount: number;
        categories: string[];
        initialized: boolean;
    }> {
        return Array.from(this.providers.entries()).map(([type, provider]) => ({
            type,
            name: provider.name,
            displayName: provider.displayName,
            blockCount: provider.getBlocks().length,
            categories: provider.getSupportedCategories().map(cat => cat.toString()),
            initialized: provider.isInitialized ? provider.isInitialized() : true
        }));
    }

    /**
     * 디버깅용 - 전체 상태 로깅
     */
    logStatus(): void {
        console.log('🌐 [ProviderManager] Status:');
        console.log('  Current Provider:', this.currentProvider);
        console.log('  Registered Providers:', this.getSupportedProviders());
        console.log('  Provider Summary:', this.getProviderSummary());
    }
}

// 편의를 위한 전역 인스턴스 내보내기
export const providerManager = ProviderManager.getInstance();

