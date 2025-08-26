import React from 'react';
import type { BlockProperties } from '../../types/blocks';
import { useBlockStore } from '../../stores';
import { canDeleteBlock, getStackedBlocks } from '../../utils/stackingRules';

interface PropertiesPanelProps {
  // props 없이 Zustand에서 직접 상태 가져오기
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ }) => {
  // Zustand에서 필요한 상태와 액션 가져오기
  const droppedBlocks = useBlockStore((state) => state.droppedBlocks);
  const propertiesBlockId = useBlockStore((state) => state.propertiesBlockId);
  const updateBlockProperties = useBlockStore((state) => state.updateBlockProperties);
  const resizeBlock = useBlockStore((state) => state.resizeBlock);

  // 선택된 블록 찾기
  const selectedBlock = propertiesBlockId
    ? droppedBlocks.find(block => block.id === propertiesBlockId) || null
    : null;

  // 입력 필드에서 키보드 이벤트가 전역 단축키를 트리거하지 않도록 방지
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Delete, Backspace 키의 이벤트 전파를 막아서 블록 삭제 방지
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation();
    }
    // 화살표 키의 이벤트 전파도 막아서 크기 조절 방지
    if (e.key.startsWith('Arrow')) {
      e.stopPropagation();
    }
  };

  const handlePropertiesChange = (blockId: string, properties: Partial<BlockProperties>) => {
    updateBlockProperties(blockId, properties);
  };

  const handleResize = (blockId: string, newSize: [number, number, number]) => {
    resizeBlock(blockId, newSize);
  };

  // 삭제 및 이동 관련 정보 렌더링
  const renderDeleteInfo = () => {
    if (!selectedBlock) return null;

    const deleteValidation = canDeleteBlock(selectedBlock.id, droppedBlocks);
    const stackedBlocks = getStackedBlocks(selectedBlock.id, droppedBlocks);

    return (
      <div className="mt-4 p-3 bg-gray-700 rounded">
        <h3 className="font-medium mb-2 text-yellow-300">삭제 & 이동 정보</h3>

        {/* 이동 가능 여부 */}
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-1 text-blue-300">이동 가능 여부</h4>
          {stackedBlocks.length === 0 ? (
            <div className="text-green-300 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                이 블록은 이동 가능합니다
              </div>
            </div>
          ) : (
            <div className="text-red-300 text-sm">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                이 블록은 이동할 수 없습니다
              </div>
              <p className="text-gray-300 text-xs">
                위에 스택된 블록들을 먼저 이동해야 합니다
              </p>
            </div>
          )}
        </div>

        {/* 삭제 가능 여부 */}
        <div>
          <h4 className="text-sm font-medium mb-1 text-yellow-300">삭제 가능 여부</h4>

          {deleteValidation.canDelete ? (
            <div className="text-green-300 text-sm">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                이 블록은 삭제 가능합니다
              </div>
              <p className="text-gray-300 text-xs">
                위에 스택된 다른 블록이 없습니다.
              </p>
            </div>
          ) : (
            <div className="text-red-300 text-sm">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                이 블록은 삭제할 수 없습니다
              </div>
              <p className="text-gray-300 text-xs mb-2">
                {deleteValidation.reason}
              </p>
            </div>
          )}
        </div>

        {/* 스택된 블록 목록 (이동과 삭제 공통) */}
        {stackedBlocks.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-600">
            <p className="text-xs text-gray-400 mb-1">위에 스택된 블록들:</p>
            <div className="text-xs space-y-1">
              {stackedBlocks.map((block) => (
                <div key={block.id} className="text-orange-300 flex items-center">
                  <div className="w-1 h-1 bg-orange-400 rounded-full mr-2"></div>
                  {block.type} ({block.id.substring(0, 8)})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 삭제 순서 안내 */}
        {!deleteValidation.canDelete && stackedBlocks.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-600">
            <p className="text-xs text-gray-400 mb-2">삭제 순서:</p>
            <div className="text-xs space-y-1">
              {[...stackedBlocks].reverse().map((block, index) => (
                <div key={block.id} className="flex items-center text-blue-300">
                  <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">
                    {index + 1}
                  </span>
                  {block.type} 먼저 삭제
                </div>
              ))}
              <div className="flex items-center text-green-300">
                <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-xs mr-2">
                  {stackedBlocks.length + 1}
                </span>
                {selectedBlock.type} 삭제 가능
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!selectedBlock) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800 text-gray-400 p-4">
        <p className="text-center">블록을 선택하여 속성을 편집하세요</p>
      </div>
    );
  }

  const handleInputChange = (key: string, value: any) => {
    handlePropertiesChange(selectedBlock.id, { [key]: value });
  };

  const handleSizeChange = (index: number, value: number) => {
    if (!selectedBlock.size) return;

    // 높이(index 1) 조절 막기
    if (index === 1) {
      console.log("높이 조절은 제한됩니다.");
      return;
    }

    const newSize: [number, number, number] = [...selectedBlock.size];
    newSize[index] = value;
    handleResize(selectedBlock.id, newSize);
  };

  const renderInputForType = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            id={key}
            checked={value}
            onChange={(e) => handleInputChange(key, e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600"
          />
          <label htmlFor={key} className="ml-2">{key}</label>
        </div>
      );
    } else if (typeof value === 'number') {
      return (
        <div className="mb-2">
          <label htmlFor={key} className="block text-sm mb-1">{key}</label>
          <input
            type="number"
            id={key}
            value={value}
            onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
            onKeyDown={handleInputKeyDown}
            className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
          />
        </div>
      );
    } else if (typeof value === 'string') {
      if (key === 'cidrBlock') {
        return (
          <div className="mb-2">
            <label htmlFor={key} className="block text-sm mb-1">CIDR Block</label>
            <input
              type="text"
              id={key}
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="10.0.0.0/16"
              className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
        );
      } else if (key === 'instanceType') {
        return (
          <div className="mb-2">
            <label htmlFor={key} className="block text-sm mb-1">인스턴스 타입</label>
            <select
              id={key}
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
            >
              <option value="t2.micro">t2.micro</option>
              <option value="t2.small">t2.small</option>
              <option value="t2.medium">t2.medium</option>
              <option value="m5.large">m5.large</option>
              <option value="c5.large">c5.large</option>
            </select>
          </div>
        );
      } else {
        return (
          <div className="mb-2">
            <label htmlFor={key} className="block text-sm mb-1">{key}</label>
            <input
              type="text"
              id={key}
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
            />
          </div>
        );
      }
    }

    return null;
  };

  // 블록 타입별 속성 렌더링
  const renderBlockProperties = () => {
    switch (selectedBlock.type) {
      case 'vpc':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            {renderInputForType('cidrBlock', selectedBlock.properties.cidrBlock)}
            {renderInputForType('enableDnsSupport', selectedBlock.properties.enableDnsSupport)}
            {renderInputForType('enableDnsHostnames', selectedBlock.properties.enableDnsHostnames)}
          </>
        );
      case 'subnet':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            {renderInputForType('cidrBlock', selectedBlock.properties.cidrBlock)}
            {renderInputForType('availabilityZone', selectedBlock.properties.availabilityZone)}
          </>
        );
      case 'ec2':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            {renderInputForType('instanceType', selectedBlock.properties.instanceType)}
            {renderInputForType('ami', selectedBlock.properties.ami)}
          </>
        );
      case 'security-group':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            <div className="mb-2 mt-4">
              <h4 className="font-medium">보안 규칙</h4>
              {selectedBlock.properties.securityRules?.map((rule, index) => (
                <div key={index} className="mt-2 p-2 border border-gray-600 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm mb-1">타입</label>
                      <select
                        value={rule.type}
                        onChange={(e) => {
                          const updatedRules = [...selectedBlock.properties.securityRules!];
                          updatedRules[index] = { ...rule, type: e.target.value as 'ingress' | 'egress' };
                          handleInputChange('securityRules', updatedRules);
                        }}
                        onKeyDown={handleInputKeyDown}
                        className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      >
                        <option value="ingress">Ingress</option>
                        <option value="egress">Egress</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">프로토콜</label>
                      <select
                        value={rule.protocol}
                        onChange={(e) => {
                          const updatedRules = [...selectedBlock.properties.securityRules!];
                          updatedRules[index] = { ...rule, protocol: e.target.value };
                          handleInputChange('securityRules', updatedRules);
                        }}
                        onKeyDown={handleInputKeyDown}
                        className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      >
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                        <option value="icmp">ICMP</option>
                        <option value="-1">All</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-sm mb-1">From Port</label>
                      <input
                        type="number"
                        value={rule.fromPort}
                        onChange={(e) => {
                          const updatedRules = [...selectedBlock.properties.securityRules!];
                          updatedRules[index] = { ...rule, fromPort: parseInt(e.target.value) };
                          handleInputChange('securityRules', updatedRules);
                        }}
                        onKeyDown={handleInputKeyDown}
                        className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">To Port</label>
                      <input
                        type="number"
                        value={rule.toPort}
                        onChange={(e) => {
                          const updatedRules = [...selectedBlock.properties.securityRules!];
                          updatedRules[index] = { ...rule, toPort: parseInt(e.target.value) };
                          handleInputChange('securityRules', updatedRules);
                        }}
                        onKeyDown={handleInputKeyDown}
                        className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm mb-1">CIDR Blocks</label>
                    <input
                      type="text"
                      value={rule.cidrBlocks.join(', ')}
                      onChange={(e) => {
                        const updatedRules = [...selectedBlock.properties.securityRules!];
                        updatedRules[index] = {
                          ...rule,
                          cidrBlocks: e.target.value.split(',').map(s => s.trim())
                        };
                        handleInputChange('securityRules', updatedRules);
                      }}
                      onKeyDown={handleInputKeyDown}
                      placeholder="0.0.0.0/0"
                      className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newRule = {
                    type: 'ingress' as const,
                    protocol: 'tcp',
                    fromPort: 80,
                    toPort: 80,
                    cidrBlocks: ['0.0.0.0/0']
                  };
                  const updatedRules = [...(selectedBlock.properties.securityRules || []), newRule];
                  handleInputChange('securityRules', updatedRules);
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                규칙 추가
              </button>
            </div>
          </>
        );
      case 'load-balancer':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            <div className="mb-2">
              <label htmlFor="loadBalancerType" className="block text-sm mb-1">로드 밸런서 타입</label>
              <select
                id="loadBalancerType"
                value={selectedBlock.properties.loadBalancerType}
                onChange={(e) => handleInputChange('loadBalancerType', e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
              >
                <option value="application">Application Load Balancer</option>
                <option value="network">Network Load Balancer</option>
              </select>
            </div>
          </>
        );
      case 'volume':
        return (
          <>
            {renderInputForType('name', selectedBlock.properties.name)}
            {renderInputForType('volumeSize', selectedBlock.properties.volumeSize)}
            <div className="mb-2">
              <label htmlFor="volumeType" className="block text-sm mb-1">볼륨 타입</label>
              <select
                id="volumeType"
                value={selectedBlock.properties.volumeType}
                onChange={(e) => handleInputChange('volumeType', e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="w-full px-3 py-1 bg-gray-700 rounded border border-gray-600 text-white"
              >
                <option value="gp2">gp2</option>
                <option value="gp3">gp3</option>
                <option value="io1">io1</option>
                <option value="st1">st1</option>
                <option value="sc1">sc1</option>
                <option value="standard">standard</option>
              </select>
            </div>
          </>
        );
      default:
        return (
          <div>
            {renderInputForType('name', selectedBlock.properties.name)}
            {renderInputForType('description', selectedBlock.properties.description)}
          </div>
        );
    }
  };

  // 프리셋 크기 적용 (높이는 현재 높이 유지)
  const applyPresetSize = (preset: 'small' | 'medium' | 'large' | 'xlarge') => {
    if (!selectedBlock.size) return;

    const currentHeight = selectedBlock.size[1]; // 현재 높이 유지
    const presets = {
      small: [2, currentHeight, 2] as [number, number, number],
      medium: [4, currentHeight, 4] as [number, number, number],
      large: [6, currentHeight, 6] as [number, number, number],
      xlarge: [10, currentHeight, 10] as [number, number, number]
    };
    handleResize(selectedBlock.id, presets[preset]);
  };

  // foundation 타입(vpc, subnet)의 경우 크기 조절 UI 표시
  const renderResizeControls = () => {
    if (['vpc', 'subnet'].includes(selectedBlock.type) && selectedBlock.size) {
      return (
        <div className="border-t border-gray-600 pt-4 mt-4">
          <h3 className="font-medium mb-3">크기 조절</h3>

          {/* 프리셋 크기 버튼 */}
          <div className="mb-4">
            <label className="block text-sm mb-2">프리셋 크기</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPresetSize('small')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600"
              >
                소형 (2×2)
              </button>
              <button
                onClick={() => applyPresetSize('medium')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600"
              >
                중형 (4×4)
              </button>
              <button
                onClick={() => applyPresetSize('large')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600"
              >
                대형 (6×6)
              </button>
              <button
                onClick={() => applyPresetSize('xlarge')}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-600"
              >
                특대형 (10×10)
              </button>
            </div>
          </div>

          {/* 슬라이더와 직접 입력 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">가로 (Width)</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={selectedBlock.size[0]}
                onChange={(e) => handleSizeChange(0, parseFloat(e.target.value))}
                className="w-full mb-1"
              />
              <input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={selectedBlock.size[0]}
                onChange={(e) => handleSizeChange(0, parseFloat(e.target.value) || 1)}
                onKeyDown={handleInputKeyDown}
                className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">높이 (Height) - 고정됨</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={selectedBlock.size[1]}
                disabled
                className="w-full mb-1 opacity-50 cursor-not-allowed"
              />
              <input
                type="number"
                min="0.1"
                max="2"
                step="0.1"
                value={selectedBlock.size[1]}
                disabled
                onKeyDown={handleInputKeyDown}
                className="w-full px-2 py-1 bg-gray-600 rounded border border-gray-500 text-gray-400 text-xs cursor-not-allowed"
              />
              <div className="text-xs text-gray-400 mt-1">높이는 고정값입니다</div>
            </div>
            <div>
              <label className="block text-sm mb-1">세로 (Depth)</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={selectedBlock.size[2]}
                onChange={(e) => handleSizeChange(2, parseFloat(e.target.value))}
                className="w-full mb-1"
              />
              <input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={selectedBlock.size[2]}
                onChange={(e) => handleSizeChange(2, parseFloat(e.target.value) || 1)}
                onKeyDown={handleInputKeyDown}
                className="w-full px-2 py-1 bg-gray-700 rounded border border-gray-600 text-white text-xs"
              />
            </div>
          </div>

          {/* 키보드 단축키 안내 */}
          <div className="mt-3 p-3 bg-gray-700 rounded text-xs">
            <div className="font-medium mb-2 text-blue-300">크기 조절 방법:</div>
            <div className="text-gray-300 space-y-1">
              <div>• 위 슬라이더/입력창으로 정확한 값 설정</div>
              <div>• 3D 화면에서 선택된 블록의 흰색/녹색 핸들 드래그</div>
              <div>• <span className="text-red-300">높이는 고정됨</span> (조절 불가)</div>
              <div>• <span className="text-yellow-300">Shift + ←/→</span>: 가로 조절</div>
              <div>• <span className="text-yellow-300">Ctrl + ↑/↓</span>: 세로 조절</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full bg-gray-800 text-white p-4 overflow-y-auto">
      <div className="mb-4 pb-2 border-b border-gray-600">
        <h2 className="text-lg font-semibold">
          {selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)} 속성
        </h2>
        <p className="text-sm text-gray-400">ID: {selectedBlock.id}</p>
      </div>

      <div className="space-y-4">
        {renderBlockProperties()}
        {renderResizeControls()}
        {renderDeleteInfo()}
      </div>
    </div>
  );
};
