// src/components/ui/ProjectCard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { createProjectEditorRoute, ROUTES } from "../../router/routes";

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
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  previewText,
  updatedAt,
  index,
}) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      onClick={() => navigate(createProjectEditorRoute(id))}
      className="rounded-lg overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
    >
      <div
        className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}
      >
        {previewText && (
          <span className="text-lg font-medium text-gray-800">
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
