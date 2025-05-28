import { Vector3 } from 'three';

/**
 * 3D 위치를 격자에 정확하게 스냅하는 유틸리티 함수
 * 부동소수점 오차를 방지하고 일관된 스냅 결과를 보장합니다.
 */

export const SNAP_SIZE = 0.5;

/**
 * 단일 값을 격자에 스냅
 */
export function snapToGrid(value: number, snapSize: number = SNAP_SIZE): number {
    return Math.round((value + Number.EPSILON) / snapSize) * snapSize;
}

/**
 * Vector3 위치를 격자에 스냅 (X, Z만 스냅, Y는 유지)
 */
export function snapPositionToGrid(position: Vector3, snapSize: number = SNAP_SIZE): Vector3 {
    return new Vector3(
        snapToGrid(position.x, snapSize),
        position.y, // Y축은 스냅하지 않음
        snapToGrid(position.z, snapSize)
    );
}

/**
 * Vector3 위치를 완전히 스냅 (X, Y, Z 모두)
 */
export function snapPositionToGridFull(position: Vector3, snapSize: number = SNAP_SIZE): Vector3 {
    return new Vector3(
        snapToGrid(position.x, snapSize),
        snapToGrid(position.y, snapSize),
        snapToGrid(position.z, snapSize)
    );
}

/**
 * 두 위치가 같은 격자 위치에 있는지 확인
 */
export function arePositionsOnSameGrid(pos1: Vector3, pos2: Vector3, snapSize: number = SNAP_SIZE): boolean {
    return snapToGrid(pos1.x, snapSize) === snapToGrid(pos2.x, snapSize) &&
        snapToGrid(pos1.z, snapSize) === snapToGrid(pos2.z, snapSize);
}

/**
 * 화면 좌표를 3D 월드 좌표로 변환하고 격자에 스냅
 */
export function screenToWorldSnapped(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    worldSize: number = 50,
    snapSize: number = SNAP_SIZE
): { x: number, z: number } {
    const x = ((screenX / canvasWidth) - 0.5) * worldSize;
    const z = ((screenY / canvasHeight) - 0.5) * worldSize;

    return {
        x: snapToGrid(x, snapSize),
        z: snapToGrid(z, snapSize)
    };
}
