// src/components/ui/ProjectCard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { createProjectEditorRoute } from "../../router/routes";

const GRADIENTS = [
  "from-blue-200 to-blue-400",
  "from-pink-200 to-pink-400",
  "from-purple-200 to-purple-400",
  "from-green-200 to-green-400",
  "from-red-200 to-red-400",
];

function getRelativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(delta / (1000 * 60 * 60));
  if (hours < 24) return `Updated ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} days ago`;
}

export interface ProjectCardProps {
  id: string;
  name: string;
  previewText?: string;
  updatedAt: string;
  index: number;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  previewText,
  updatedAt,
  index,
  onDelete,
  isDeleting = false,
}) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const handleClick = () => {
    if (!isDeleting) {
      navigate(createProjectEditorRoute(id), {
        state: { projectName: name },
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative rounded-lg overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02] group"
    >
      {/* 삭제 버튼 */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // 클릭 이벤트 전파 방지
            onDelete();
          }}
          disabled={isDeleting}
          title="프로젝트 삭제"
          className="absolute top-2 right-2 z-10 bg-white p-1 rounded-md border border-gray-300 hover:border-red-400 hover:text-red-600 text-gray-500 transition disabled:opacity-50"
        >
          {isDeleting ? (
            <div className="w-4 h-4 border-2 border-b-transparent border-gray-400 rounded-full animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}

      <div
        className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}
      >
        {previewText && (
          <span className="text-lg font-medium text-gray-800 text-center px-2">
            {previewText}
          </span>
        )}
      </div>
      <div className="bg-white p-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {getRelativeTime(updatedAt)}
        </p>
      </div>
    </div>
  );
};

export default ProjectCard;
