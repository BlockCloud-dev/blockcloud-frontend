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

interface BlockPaletteProps {
  onDragStart?: (blockData: any) => void;
  onDragEnd?: () => void;
}

const awsBlocks = [
  {
    id: "vpc",
    name: "VPC",
    description: "가상 프라이빗 클라우드",
    icon: Building2,
    color: "bg-blue-500",
    type: "foundation",
    category: "Network",
  },
  {
    id: "subnet",
    name: "Subnet",
    description: "서브넷",
    icon: Route,
    color: "bg-green-500",
    type: "network",
    category: "Network",
  },
  {
    id: "ec2",
    name: "EC2",
    description: "인스턴스",
    icon: Server,
    color: "bg-orange-500",
    type: "compute",
    category: "Compute",
  },
  {
    id: "volume",
    name: "EBS Volume",
    description: "스토리지",
    icon: Archive,
    color: "bg-purple-500",
    type: "storage",
    category: "Storage",
  },
  {
    id: "security-group",
    name: "Security Group",
    description: "보안 그룹",
    icon: Shield,
    color: "bg-red-500",
    type: "security",
    category: "Security",
  },
  {
    id: "load-balancer",
    name: "Load Balancer",
    description: "로드 밸런서",
    icon: Cloud,
    color: "bg-yellow-500",
    type: "network",
    category: "Load Balancer",
  },
];

const CSP_TABS = ["AWS", "GCP", "Azure"];
const CATEGORY_TABS = [
  "Compute",
  "Network",
  "Storage",
  "Security",
  "Load Balancer",
  "DNS",
];

export function BlockPalette({ onDragStart, onDragEnd }: BlockPaletteProps) {
  // Zustand에서 CSP 상태 가져오기
  const selectedCSP = useProjectStore((state) => state.currentCSP);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

  // 상태 관리
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const getBlocksForCSP = (csp: string) => {
    switch (csp) {
      case "AWS":
        return awsBlocks;
      case "GCP":
        return []; // TODO: GCP 블록 추가
      case "Azure":
        return []; // TODO: Azure 블록 추가
      default:
        return [];
    }
  };

  const filteredBlocks = getBlocksForCSP(selectedCSP).filter(
    (b) =>
      b.category === selectedCategory &&
      b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            {cat}
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
            const requiresStacking = block.id !== "vpc";
            const stackingHints = {
              "subnet": "VPC 위에",
              "ec2": "서브넷/EBS 위에",
              "security-group": "VPC/서브넷 위에",
              "volume": "서브넷 위에",
              "load-balancer": "서브넷 위에"
            };

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
                        {stackingHints[block.id as keyof typeof stackingHints] || "다른 블록 위에"} 배치
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
