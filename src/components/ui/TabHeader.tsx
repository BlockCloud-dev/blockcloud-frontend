import React from "react";
import { Link2, Code, Settings } from "lucide-react";
import { useUIStore, useConnectionStore } from "../../stores";

interface TabHeaderProps {
  // props 없이 Zustand에서 직접 상태 가져오기
}

export const TabHeader: React.FC<TabHeaderProps> = ({ }) => {
  // Zustand에서 필요한 상태만 구독
  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const connectionCount = useConnectionStore((state) => state.connections.length);

  const tabs = [
    {
      id: "connections" as const,
      icon: Link2,
      label: "연결",
      badge: connectionCount > 0 ? connectionCount : undefined,
    },
    {
      id: "code" as const,
      icon: Code,
      label: "코드",
    },
    {
      id: "properties" as const,
      icon: Settings,
      label: "속성",
    },
  ];

  return (
    <div className="flex border-b border-gray-600 bg-gray-800">
      {tabs.map(({ id, icon: Icon, label, badge }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`
                        flex items-center px-4 py-3 text-sm font-medium transition-colors
                        ${activeTab === id
              ? "text-white bg-gray-700 border-b-2 border-blue-400"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
            }
                        relative
                    `}
        >
          <Icon className="w-4 h-4 mr-2" />
          {label}
          {badge && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
