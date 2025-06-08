import React from "react";
import {
  Server,
  Search,
  ToggleRight,
  ToggleLeft,
  Cloud,
  Archive,
  Shield,
  Route,
  Building2,
} from "lucide-react";

interface BlockPaletteProps {
  selectedCSP: "AWS" | "GCP" | "Azure";
  onCSPChange: (csp: "AWS" | "GCP" | "Azure") => void;
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

export function BlockPalette({
  selectedCSP,
  onCSPChange,
  onDragStart,
  onDragEnd,
}: BlockPaletteProps) {
  const [search, setSearch] = React.useState("");
  const [autoScaffold, setAutoScaffold] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>(
    CATEGORY_TABS[0]
  );

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
      b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col flex-1 min-w-0 px-4 py-3">
      {/* CSP Selector */}
      <div className="flex gap-2 mb-3">
        {CSP_TABS.map((csp) => (
          <button
            key={csp}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
              selectedCSP === csp
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            onClick={() => onCSPChange(csp as "AWS" | "GCP" | "Azure")}
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
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors text-xs font-medium ${
              selectedCategory === cat
                ? "bg-blue-100 text-blue-700 border border-blue-400"
                : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search + Auto Scaffold */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Auto-Scaffold</span>
          <button onClick={() => setAutoScaffold((prev) => !prev)}>
            {autoScaffold ? (
              <ToggleRight className="w-6 h-6 text-blue-500" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-gray-400" />
            )}
          </button>
        </div>
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
            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify(block)
                  );
                  onDragStart?.(block);
                }}
                onDragEnd={onDragEnd}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm cursor-grab hover:bg-gray-100"
              >
                <div
                  className={`w-10 h-10 ${block.color} rounded-md flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {block.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {block.description}
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
