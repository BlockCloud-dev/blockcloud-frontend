import type { DroppedBlock } from '../../types/blocks';

interface StackConnectionLineProps {
  fromBlock: DroppedBlock;
  toBlock: DroppedBlock;
  stackLevel: number;
}

export function StackConnectionLine(_props: StackConnectionLineProps) {
  // 스택 연결선을 표시하지 않음 - 빈 그룹 반환
  return <group />;
}
