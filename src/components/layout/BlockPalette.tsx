import React from "react";
import {
  Server,
  Search,
  Cloud,
  Archive,
  Shield,
  Route,
  Building2,
  Layers,
} from "lucide-react";
import { useProjectStore } from "../../stores";
import { providerManager, CloudProviderType } from "../../providers";

interface BlockPaletteProps {
  onDragStart?: (blockData: any) => void;
  onDragEnd?: () => void;
}

// 폴백용 AWS 블록 제거 - 이제 프로바이더 시스템에서만 가져옴

const CSP_TABS = ["AWS", "GCP", "Azure"];
const CATEGORY_TABS = [
  "all",
  "Compute",
  "Network",
  "Storage",
  "Security",
  "Load Balancer",
  "DNS",
];

// 카테고리 매핑 함수 - BlockCategory enum을 UI 카테고리로 변환
const mapCategoryToUI = (category: string): string => {
  // BlockCategory enum 값들을 UI에서 사용하는 카테고리 탭과 매핑
  const categoryMap: Record<string, string> = {
    'compute': 'Compute',
    'network': 'Network',
    'storage': 'Storage',
    'security': 'Security',
    'database': 'Storage', // 데이터베이스를 Storage 카테고리로 매핑 (UI 단순화)
    'load-balancer': 'Load Balancer',
    'dns': 'DNS'
  };

  const normalizedCategory = category.toLowerCase().replace(/_/g, '-');
  const result = categoryMap[normalizedCategory] || 'Network';

  return result;
};

export function BlockPalette({ onDragStart, onDragEnd }: BlockPaletteProps) {
  // Zustand에서 CSP 상태 가져오기
  const selectedCSP = useProjectStore((state) => state.currentCSP);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

  // 상태 관리
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const getBlocksForCSP = (csp: string) => {
    console.log(`🔍 [BlockPalette] Getting blocks for CSP: ${csp}`);

    // 새로운 프로바이더 시스템 사용
    let providerType: CloudProviderType;
    switch (csp) {
      case "AWS":
        providerType = CloudProviderType.AWS;
        break;
      case "GCP":
        providerType = CloudProviderType.GCP;
        break;
      case "Azure":
        providerType = CloudProviderType.AZURE;
        break;
      default:
        providerType = CloudProviderType.AWS;
    }

    const provider = providerManager.getProvider(providerType);
    if (!provider) {
      console.warn(`❌ [BlockPalette] Provider not found: ${providerType}`);
      return []; // 프로바이더가 없으면 빈 배열 반환
    }

    const blocks = provider.getBlocks();
    console.log(`✅ [BlockPalette] Found ${blocks.length} blocks for ${csp}:`, blocks.map(b => `${b.name}(${b.type})`));

    // 기존 형식으로 변환 (UI 호환성을 위해)
    const convertedBlocks = blocks.map(block => {
      const converted = {
        id: block.type,
        name: block.name,
        description: block.description,
        icon: block.icon,
        color: block.color,
        type: block.category.toLowerCase(),
        category: mapCategoryToUI(block.category),
      };
      console.log(`🔄 [BlockPalette] Converting block: ${block.name} → category: ${converted.category}`);
      return converted;
    });

    console.log(`📦 [BlockPalette] Converted blocks for UI:`, convertedBlocks);
    return convertedBlocks;
  };

  const allBlocks = getBlocksForCSP(selectedCSP);
  const filteredBlocks = allBlocks.filter(
    (b) =>
      (selectedCategory === "all" || b.category === selectedCategory) &&
      b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log(`🔍 [BlockPalette] Filtering - CSP: ${selectedCSP}, Category: ${selectedCategory}, Search: "${searchTerm}"`);
  console.log(`📊 [BlockPalette] All blocks: ${allBlocks.length}, Filtered: ${filteredBlocks.length}`);
  console.log(`📋 [BlockPalette] Filtered blocks:`, filteredBlocks.map(b => `${b.name}(${b.category})`));

  return (
    <div className="h-full flex flex-col flex-1 min-w-0 px-4 py-3">
      {/* CSP Selector */}
      <div className="flex gap-2 mb-3">
        {CSP_TABS.map((csp) => (
          <button
            key={csp}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${selectedCSP === csp
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600"
              }`}
            onClick={() => setCurrentCSP(csp as "AWS" | "GCP" | "Azure")}
          >
            {csp.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-3 text-sm text-gray-500 overflow-x-auto">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors text-xs font-medium ${selectedCategory === cat
              ? "bg-blue-100 text-blue-700 border border-blue-400"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === "all" ? "전체" : cat}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Search blocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-1"></div>
      </div>

      {/* Block List */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
        {filteredBlocks.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">
            No blocks found.
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const Icon = block.icon;
            // VPC 계열 블록인지 확인 (aws-vpc, gcp-vpc-network, azure-virtual-network)
            const isBaseBlock = block.id.includes('vpc') || block.id.includes('virtual-network');
            const requiresStacking = !isBaseBlock;

            // 현재 프로바이더에서 스태킹 힌트 가져오기
            const currentProvider = providerManager.getCurrentProvider();
            const stackingHint = currentProvider ?
              currentProvider.getStackingHint(block.id) :
              "다른 블록 위에";

            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => {
                  console.log(
                    "🚀 [BlockPalette] Drag started for block:",
                    block
                  );
                  e.dataTransfer.setData("text/plain", JSON.stringify(block));
                  onDragStart?.(block);
                }}
                onDragEnd={onDragEnd}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm cursor-grab hover:bg-gray-100 relative"
              >
                <div
                  className={`w-10 h-10 ${block.color} rounded-md flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-800">
                      {block.name}
                    </div>
                    {requiresStacking && (
                      <div className="flex items-center gap-1" title="스태킹 필요">
                        <Layers className="w-3 h-3 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {block.description}
                    {requiresStacking && (
                      <span className="block text-xs text-blue-600 mt-0.5">
                        {stackingHint} 배치
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
