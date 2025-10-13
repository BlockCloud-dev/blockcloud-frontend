/**
 * 프로바이더 통합 모듈
 * 모든 클라우드 프로바이더를 등록하고 관리
 */

import { providerManager } from '../core/managers/ProviderManager';
import { CloudProviderType } from '../core/types/common';

// 프로바이더 구현체들
import { AWSProvider } from './aws';
import { GCPProvider } from './gcp';     // ✅ Phase 2에서 구현 완료
import { AzureProvider } from './azure'; // ✅ Phase 3에서 구현 완료

/**
 * 모든 프로바이더 초기화 및 등록
 */
export async function initializeProviders(): Promise<void> {
    console.log('🌐 [Providers] Initializing all cloud providers...');

    try {
        // Phase 1: AWS 프로바이더 등록
        const awsProvider = new AWSProvider();
        providerManager.registerProvider(CloudProviderType.AWS, awsProvider);
        console.log('✅ [Providers] AWS provider registered');

        // Phase 2: GCP 프로바이더 등록 ✅ 구현 완료
        const gcpProvider = new GCPProvider();
        providerManager.registerProvider(CloudProviderType.GCP, gcpProvider);
        console.log('✅ [Providers] GCP provider registered');

        // Phase 3: Azure 프로바이더 등록 ✅ 구현 완료
        const azureProvider = new AzureProvider();
        providerManager.registerProvider(CloudProviderType.AZURE, azureProvider);
        console.log('✅ [Providers] Azure provider registered');

        // 기본 프로바이더를 AWS로 설정
        providerManager.setCurrentProvider(CloudProviderType.AWS);

        console.log('🎉 [Providers] All providers initialized successfully');
        providerManager.logStatus();

    } catch (error) {
        console.error('❌ [Providers] Failed to initialize providers:', error);
        throw error;
    }
}

/**
 * 지원되는 프로바이더 목록 (현재 구현된 것만)
 */
export const SUPPORTED_PROVIDERS = [
    CloudProviderType.AWS,
    CloudProviderType.GCP,    // ✅ Phase 2 구현 완료
    CloudProviderType.AZURE,  // ✅ Phase 3 구현 완료
];

/**
 * 프로바이더별 표시 정보
 */
export const PROVIDER_INFO = {
    [CloudProviderType.AWS]: {
        name: 'Amazon Web Services',
        shortName: 'AWS',
        icon: '☁️',
        color: '#FF9900',
        implemented: true,
    },
    [CloudProviderType.GCP]: {
        name: 'Google Cloud Platform',
        shortName: 'GCP',
        icon: '🌐',
        color: '#4285F4',
        implemented: true, // ✅ Phase 2에서 구현 완료
    },
    [CloudProviderType.AZURE]: {
        name: 'Microsoft Azure',
        shortName: 'Azure',
        icon: '🔷',
        color: '#0078D4',
        implemented: true, // ✅ Phase 3에서 구현 완료
    },
};

// 편의를 위한 re-export
export { providerManager } from '../core/managers/ProviderManager';
export { CloudProviderType } from '../core/types/common';
export type { CloudProvider } from '../core/abstractions/CloudProvider';

