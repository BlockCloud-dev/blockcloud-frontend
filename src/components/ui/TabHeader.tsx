import React from "react";
import { Link2, Code, Settings } from "lucide-react";

interface TabHeaderProps {
  activeTab: "connections" | "code" | "properties";
  onTabChange: (tab: "connections" | "code" | "properties") => void;
  connectionCount: number;
}

export const TabHeader: React.FC<TabHeaderProps> = ({
  activeTab,
  onTabChange,
  connectionCount,
}) => {
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
          onClick={() => onTabChange(id)}
          className={`
                        flex items-center px-4 py-3 text-sm font-medium transition-colors
                        ${
                          activeTab === id
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
