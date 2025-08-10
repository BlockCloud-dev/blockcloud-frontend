import { Vector3 } from 'three';
import type { DroppedBlock } from '../types/blocks';
import { useStackingStore } from '../stores/stackingStore';
import { useConnectionStore } from '../stores/connectionStore';

/**
 * 스태킹 시스템을 관리하는 통합 매니저
 * Zustand 스토어들을 조율하여 일관된 스태킹 경험 제공
 */
export class StackingManager {
  private static instance: StackingManager;

  private constructor() { }

  static getInstance(): StackingManager {
    if (!StackingManager.instance) {
      StackingManager.instance = new StackingManager();
    }
    return StackingManager.instance;
  }

  /**
   * 블록 드롭 시 스태킹 처리
   */
  handleBlockDrop(droppedBlock: DroppedBlock, allBlocks: DroppedBlock[], forcePosition?: boolean): void {
    console.log('🎯 [StackingManager] 블록 드롭 처리 시작:', droppedBlock.type);

    // 1. 가능한 스태킹 대상 찾기
    const stackingTarget = this.findStackingTarget(droppedBlock, allBlocks);

    if (stackingTarget) {
      // 2. 스태킹 관계 생성
      this.createStacking(droppedBlock.id, stackingTarget.id, allBlocks);

      // 3. 위치 조정 (forcePosition이 false면 사용자 위치 유지)
      if (forcePosition !== false) {
        const newPosition = this.calculateStackingPosition(droppedBlock, stackingTarget, droppedBlock.position);
        this.updateBlockPosition(droppedBlock.id, newPosition);
      }
    }

    // 4. 연결 상태 동기화
    this.syncConnectionsWithStacking(allBlocks);
  }

  /**
   * 블록 이동 시 스태킹 업데이트
   */
  handleBlockMove(movedBlockId: string, newPosition: Vector3, allBlocks: DroppedBlock[]): void {
    console.log('🔄 [StackingManager] 블록 이동 처리:', movedBlockId.substring(0, 8));

    const stackingStore = useStackingStore.getState();

    // 1. 기존 스태킹 관계 제거
    stackingStore.removeStackingRelation(movedBlockId);

    // 2. 새로운 위치에서 스태킹 대상 찾기
    const movedBlock = allBlocks.find(b => b.id === movedBlockId);
    if (!movedBlock) return;

    // 위치 업데이트된 블록으로 검사
    const updatedBlock = { ...movedBlock, position: newPosition };
    const stackingTarget = this.findStackingTarget(updatedBlock, allBlocks);

    if (stackingTarget) {
      // 3. 새로운 스태킹 관계 생성
      this.createStacking(movedBlockId, stackingTarget.id, allBlocks);
    }

    // 4. 연결 상태 동기화
    this.syncConnectionsWithStacking(allBlocks);
  }

  /**
   * 드래그 중 스태킹 미리보기 업데이트
   */
  updateStackingPreview(draggedBlock: DroppedBlock, currentPosition: Vector3, allBlocks: DroppedBlock[]): void {
    const stackingStore = useStackingStore.getState();

    // 현재 위치로 임시 블록 생성
    const tempBlock = { ...draggedBlock, position: currentPosition };
    const target = this.findStackingTarget(tempBlock, allBlocks);

    if (target) {
      const canStack = stackingStore.canStack(draggedBlock.type, target.type);
      const isBootVolume = this.willCreateBootVolume(draggedBlock.type, target.type);

      stackingStore.setStackingPreview({
        isValid: canStack,
        targetBlockId: target.id,
        stackingType: `${draggedBlock.type} → ${target.type}`,
        willCreateBootVolume: isBootVolume,
        previewPosition: this.calculateStackingPosition(tempBlock, target)
      });
    } else {
      stackingStore.setStackingPreview(null);
    }
  }

  /**
   * 스태킹 대상 블록 찾기
   */
  private findStackingTarget(block: DroppedBlock, allBlocks: DroppedBlock[]): DroppedBlock | null {
    const stackingStore = useStackingStore.getState();

    const potentialTargets = allBlocks
      .filter(otherBlock => otherBlock.id !== block.id)
      .filter(otherBlock => stackingStore.canStack(block.type, otherBlock.type))
      .filter(otherBlock => stackingStore.validateStacking(block, otherBlock));

    if (potentialTargets.length === 0) return null;

    // AWS 아키텍처 우선순위 적용
    return this.selectTargetByAWSHierarchy(block, potentialTargets);
  }

  /**
   * AWS 계층 구조에 따른 스태킹 대상 선택
   */
  private selectTargetByAWSHierarchy(block: DroppedBlock, potentialTargets: DroppedBlock[]): DroppedBlock | null {
    const blockType = block.type;

    // 1. EC2: 거리 기반 우선순위 (가까운 블록 우선)
    if (blockType === 'ec2') {
      const subnetTargets = potentialTargets.filter(target => target.type === 'subnet');
      const storageTargets = potentialTargets.filter(target =>
        target.type === 'ebs' || target.type === 'volume'
      );

      // 모든 가능한 타겟을 거리순으로 정렬
      const allTargetsWithDistance = [...subnetTargets, ...storageTargets].map(target => ({
        target,
        distance: this.calculateDistance(block, target),
        isStorage: target.type === 'ebs' || target.type === 'volume'
      })).sort((a, b) => a.distance - b.distance);

      if (allTargetsWithDistance.length > 0) {
        const closest = allTargetsWithDistance[0];

        if (closest.isStorage) {
          console.log('🎯 [StackingManager] EC2 → Storage 부트볼륨 스태킹 (거리 우선)');
        } else {
          console.log('🎯 [StackingManager] EC2 → Subnet 스태킹 (거리 우선)');
        }

        return closest.target;
      }
    }

    // 2. Subnet: VPC만 허용
    if (blockType === 'subnet') {
      const vpcTarget = potentialTargets.find(target => target.type === 'vpc');
      if (vpcTarget) {
        console.log('🎯 [StackingManager] Subnet → VPC 스태킹');
        return vpcTarget;
      }
    }

    // 3. Storage (EBS/Volume): Subnet 우선, EC2는 금지 (EC2가 Storage 위로 오는 것만 허용)
    if (blockType === 'ebs' || blockType === 'volume') {
      const subnetTarget = potentialTargets.find(target => target.type === 'subnet');
      if (subnetTarget) {
        console.log('🎯 [StackingManager] Storage → Subnet 스태킹');
        return subnetTarget;
      }
      // Storage는 EC2 위에 스택될 수 없음 (반대만 허용)
      console.log('⚠️ [StackingManager] Storage는 EC2 위에 스택될 수 없음');
      return null;
    }

    // 4. Security Group: VPC 우선
    if (blockType === 'security-group') {
      const vpcTarget = potentialTargets.find(target => target.type === 'vpc');
      if (vpcTarget) {
        console.log('🎯 [StackingManager] Security Group → VPC 스태킹');
        return vpcTarget;
      }
    }

    // 5. Load Balancer, RDS: Subnet 우선
    if (blockType === 'load-balancer' || blockType === 'rds') {
      const subnetTarget = potentialTargets.find(target => target.type === 'subnet');
      if (subnetTarget) {
        console.log(`🎯 [StackingManager] ${blockType} → Subnet 스태킹`);
        return subnetTarget;
      }
    }

    // 6. 기타 블록들은 Y축 높은 순으로 정렬 (가장 위에 있는 블록 우선)
    const sortedTargets = potentialTargets.sort((a, b) => b.position.y - a.position.y);
    console.log('🎯 [StackingManager] 기본 Y축 우선순위 적용:', blockType);
    return sortedTargets[0] || null;
  }

  /**
   * 두 블록 간의 거리 계산 (X, Z 평면에서)
   */
  private calculateDistance(block1: DroppedBlock, block2: DroppedBlock): number {
    const dx = block1.position.x - block2.position.x;
    const dz = block1.position.z - block2.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * 스태킹 관계 생성
   */
  private createStacking(childId: string, parentId: string, allBlocks: DroppedBlock[]): void {
    const stackingStore = useStackingStore.getState();
    stackingStore.createStackingRelation(childId, parentId, allBlocks);
  }

  /**
   * 스태킹된 위치 계산
   */
  private calculateStackingPosition(childBlock: DroppedBlock, parentBlock: DroppedBlock, preferredPosition?: Vector3): Vector3 {
    const stackingStore = useStackingStore.getState();

    // 사용자가 드롭한 위치를 최대한 유지하면서 스택 높이만 조정
    if (preferredPosition) {
      const parentHeight = parentBlock.type === 'vpc' || parentBlock.type === 'subnet'
        ? (parentBlock.size?.[1] || 0.2)
        : (parentBlock.size?.[1] || 1);

      const childHeight = childBlock.size?.[1] || 1;
      const stackedY = parentBlock.position.y + parentHeight / 2 + childHeight / 2;

      return new Vector3(
        preferredPosition.x, // 사용자가 놓은 X 위치 유지
        stackedY,           // Y만 스택 높이로 조정
        preferredPosition.z  // 사용자가 놓은 Z 위치 유지
      );
    }

    // 기본 중앙 배치 (기존 로직)
    return stackingStore.calculateStackedPosition(childBlock, parentBlock);
  }

  /**
   * 블록 위치 업데이트 (blockStore를 통해)
   */
  private updateBlockPosition(blockId: string, newPosition: Vector3): void {
    // blockStore의 moveBlock 메서드 호출
    // 이것은 실제 구현에서 blockStore를 import해서 사용
    console.log('📍 [StackingManager] 블록 위치 업데이트:', blockId.substring(0, 8), newPosition);
  }

  /**
   * 부트볼륨 생성 여부 확인
   */
  private willCreateBootVolume(childType: string, parentType: string): boolean {
    const stackingStore = useStackingStore.getState();
    const rule = stackingStore.stackingRules.find(r =>
      r.childType === childType && r.parentType === parentType
    );
    return rule?.isBootVolume || false;
  }

  /**
   * 스태킹 상태와 연결 상태 동기화
   */
  private syncConnectionsWithStacking(allBlocks: DroppedBlock[]): void {
    const stackingStore = useStackingStore.getState();
    const connectionStore = useConnectionStore.getState();

    // 1. 스태킹에서 연결 파생
    const derivedConnections = stackingStore.deriveConnectionsFromStacking(allBlocks);

    // 2. 기존 스태킹 연결 제거 및 새 연결 추가
    const nonStackingConnections = connectionStore.connections.filter(conn =>
      !conn.properties?.stackConnection
    );

    // 3. 연결 업데이트
    connectionStore.setConnections([...nonStackingConnections, ...derivedConnections]);

    console.log('🔄 [StackingManager] 연결 동기화 완료:', {
      스태킹연결: derivedConnections.length,
      기타연결: nonStackingConnections.length,
      총연결: derivedConnections.length + nonStackingConnections.length
    });
  }

  /**
   * 블록 삭제 시 관련 스태킹 정리
   */
  handleBlockDelete(deletedBlockId: string): void {
    const stackingStore = useStackingStore.getState();
    stackingStore.removeStackingRelation(deletedBlockId);

    console.log('🗑️ [StackingManager] 블록 삭제 시 스태킹 정리:', deletedBlockId.substring(0, 8));
  }

  /**
   * 디버깅용 스태킹 상태 출력
   */
  debugStackingState(): void {
    const stackingStore = useStackingStore.getState();

    console.log('🔍 [StackingManager] 현재 스태킹 상태:');
    for (const [blockId, state] of stackingStore.stackingStates.entries()) {
      console.log(`  ${blockId.substring(0, 8)}: ${JSON.stringify(state, null, 2)}`);
    }
  }
}

// 싱글톤 인스턴스 익스포트
export const stackingManager = StackingManager.getInstance();
