import { useCallback } from 'react';
import { useConnectionStore, useUIStore, useBlockStore } from '../stores';

export const useConnectionHandlers = () => {
  const {
    connectingFrom,
    completeConnection,
    cancelConnecting,
    deleteConnection,
    setSelectedConnection,
  } = useConnectionStore();

  const { setActiveTab } = useUIStore();
  const { droppedBlocks, setSelectedBlockId, setPropertiesBlockId } = useBlockStore();

  // 연결 완료
  const handleConnectionComplete = useCallback((toBlockId: string) => {
    const fromBlock = connectingFrom
      ? droppedBlocks.find((block) => block.id === connectingFrom)
      : undefined;
    const toBlock = droppedBlocks.find((block) => block.id === toBlockId);

    const success = completeConnection(toBlockId, fromBlock, toBlock);
    if (success) {
      console.log('🔗 Connection created:', {
        from: fromBlock?.type,
        to: toBlock?.type,
        isVolumeConnection:
          (fromBlock?.type.includes('volume') || fromBlock?.type.includes('ebs') || fromBlock?.type.includes('disk')) ||
          (toBlock?.type.includes('volume') || toBlock?.type.includes('ebs') || toBlock?.type.includes('disk')),
      });
    } else {
      console.log('❌ Connection failed');
    }
  }, [connectingFrom, droppedBlocks, completeConnection]);

  // 연결 클릭
  const handleConnectionClick = useCallback((connection: any) => {
    setSelectedConnection(connection);
    setSelectedBlockId(null);
    setPropertiesBlockId(null);
    setActiveTab('code');
    console.log('🔗 Connection selected:', connection.id);
  }, [setSelectedConnection, setSelectedBlockId, setPropertiesBlockId, setActiveTab]);

  // 캔버스 빈 공간 클릭
  const handleCanvasClick = useCallback(() => {
    setSelectedBlockId(null);
    setPropertiesBlockId(null);
    setActiveTab('code');
    console.log('📋 Canvas background clicked, clearing selection');
  }, [setSelectedBlockId, setPropertiesBlockId, setActiveTab]);

  return {
    handleConnectionComplete,
    handleConnectionClick,
    handleCanvasClick,
    cancelConnecting,
    deleteConnection,
  };
};
