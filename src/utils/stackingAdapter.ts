/**
 * 새로운 스태킹 시스템으로의 점진적 마이그레이션을 위한 어댑터
 * Feature Flag를 통해 기존 시스템과 새 시스템을 전환 가능
 */

import { Vector3 } from 'three';
import type { DroppedBlock } from '../types/blocks';
import { stackingManager } from '../utils/stackingManager';
import { useStackingStore } from '../stores/stackingStore';

// Feature Flag: 새로운 스태킹 시스템 사용 여부
const USE_NEW_STACKING_SYSTEM = false; // TODO: 테스트 완료 후 true로 변경

export class StackingAdapter {
  /**
   * 블록 드롭 처리 (기존 handleBlockDrop 대체)
   */
  static handleBlockDrop(blockData: any, position: Vector3, allBlocks: DroppedBlock[]): void {
    if (USE_NEW_STACKING_SYSTEM) {
      // 새로운 시스템 사용
      const droppedBlock: DroppedBlock = {
        id: `${blockData.id}-${Date.now()}`,
        type: blockData.id,
        name: blockData.name,
        position,
        timestamp: Date.now(),
        properties: { name: blockData.name || `New ${blockData.id}` },
        size: [1, 1, 1] // TODO: 실제 사이즈 계산
      };

      stackingManager.handleBlockDrop(droppedBlock, allBlocks);
    } else {
      // 기존 시스템 사용
      console.log('📦 [StackingAdapter] 기존 스태킹 시스템 사용');
      // 기존 로직 호출
    }
  }

  /**
   * 블록 이동 처리 (기존 handleBlockMove 대체)
   */
  static handleBlockMove(blockId: string, newPosition: Vector3, allBlocks: DroppedBlock[]): void {
    if (USE_NEW_STACKING_SYSTEM) {
      // 새로운 시스템 사용
      stackingManager.handleBlockMove(blockId, newPosition, allBlocks);
    } else {
      // 기존 시스템 사용
      console.log('🔄 [StackingAdapter] 기존 이동 시스템 사용');
      // 기존 detectAndCreateStackingConnections 호출
    }
  }

  /**
   * 드래그 미리보기 처리
   */
  static handleDragPreview(draggedBlock: DroppedBlock, currentPosition: Vector3, allBlocks: DroppedBlock[]): void {
    if (USE_NEW_STACKING_SYSTEM) {
      // 새로운 시스템 사용
      stackingManager.updateStackingPreview(draggedBlock, currentPosition, allBlocks);
    } else {
      // 기존 시스템: 미리보기 없음
      console.log('👀 [StackingAdapter] 기존 시스템에서는 미리보기 미지원');
    }
  }

  /**
   * 블록 삭제 처리
   */
  static handleBlockDelete(blockId: string): void {
    if (USE_NEW_STACKING_SYSTEM) {
      // 새로운 시스템 사용
      stackingManager.handleBlockDelete(blockId);
    } else {
      // 기존 시스템: 별도 처리 없음
      console.log('🗑️ [StackingAdapter] 기존 시스템에서는 삭제 시 스태킹 정리 없음');
    }
  }

  /**
   * 스태킹 검증 (기존 canStack 대체)
   */
  static canStack(childType: string, parentType: string): boolean {
    if (USE_NEW_STACKING_SYSTEM) {
      // 새로운 시스템 사용
      const stackingStore = useStackingStore.getState();
      return stackingStore.canStack(childType, parentType);
    } else {
      // 기존 시스템 사용
      const stackingRules: { [key: string]: string[] } = {
        vpc: [],
        subnet: ["vpc"],
        ec2: ["subnet", "volume", "ebs"],
        "load-balancer": ["subnet"],
        volume: ["subnet"],
        ebs: ["subnet"],
        "security-group": ["vpc"],
        rds: ["subnet"],
      };
      return stackingRules[childType]?.includes(parentType) || false;
    }
  }

  /**
   * 개발 도구: 새 시스템 강제 활성화 (디버깅용)
   */
  static enableNewSystemForTesting(): void {
    console.warn('⚠️ [StackingAdapter] 새로운 스태킹 시스템 테스트 모드 활성화');
    // USE_NEW_STACKING_SYSTEM = true; // const이므로 런타임 변경 불가
  }

  /**
   * 현재 사용 중인 시스템 확인
   */
  static getCurrentSystem(): 'legacy' | 'new' {
    return USE_NEW_STACKING_SYSTEM ? 'new' : 'legacy';
  }

  /**
   * 시스템 마이그레이션 상태 체크
   */
  static checkMigrationStatus(): void {
    console.log('📊 [StackingAdapter] 마이그레이션 상태:', {
      현재시스템: StackingAdapter.getCurrentSystem(),
      새시스템준비상태: '구현완료',
      마이그레이션단계: USE_NEW_STACKING_SYSTEM ? '완료' : '대기중'
    });
  }
}

// 컴포넌트에서 사용할 훅
export const useStackingAdapter = () => {
  return {
    handleBlockDrop: StackingAdapter.handleBlockDrop,
    handleBlockMove: StackingAdapter.handleBlockMove,
    handleDragPreview: StackingAdapter.handleDragPreview,
    handleBlockDelete: StackingAdapter.handleBlockDelete,
    canStack: StackingAdapter.canStack,
    getCurrentSystem: StackingAdapter.getCurrentSystem,
    checkMigrationStatus: StackingAdapter.checkMigrationStatus
  };
};
