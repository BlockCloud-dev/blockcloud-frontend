import { useCallback } from 'react';
import { Vector3 } from 'three';
import { useBlockStore } from '../stores';

export const useDragPreview = () => {
  const { setDropPreview, setCurrentDragData } = useBlockStore();

  // 드래그 미리보기 시작
  const handleDragPreview = useCallback((position: Vector3, blockData: any) => {
    console.log('📱 App handleDragPreview called:', position, blockData);
    setDropPreview(true, position, blockData);
  }, [setDropPreview]);

  // 드래그 미리보기 종료
  const handleDragPreviewEnd = useCallback(() => {
    console.log('📱 App handleDragPreviewEnd called');
    setDropPreview(false);
  }, [setDropPreview]);

  // 팔레트 드래그 시작
  const handlePaletteDragStart = useCallback((blockData: any) => {
    console.log('🎯 Palette drag start:', blockData);
    setCurrentDragData(blockData);
  }, [setCurrentDragData]);

  // 팔레트 드래그 종료
  const handlePaletteDragEnd = useCallback(() => {
    console.log('🎯 Palette drag end');
    setCurrentDragData(null);
    setDropPreview(false);
  }, [setCurrentDragData, setDropPreview]);

  return {
    handleDragPreview,
    handleDragPreviewEnd,
    handlePaletteDragStart,
    handlePaletteDragEnd,
  };
};
