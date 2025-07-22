import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROUTES } from "../router/routes";
import ProjectCard from "../components/ui/ProjectCard";

interface Project {
  id: string;
  name: string;
  previewText?: string;
  updatedAt: string;
  createdAt: string;
  blocksCount: number;
  connectionsCount: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 검색어 & 정렬 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    // TODO: 실제 API 호출로 교체
    const now = Date.now();
    const mock: Project[] = [
      {
        id: "project-preview",
        name: "Mobile Banking App",
        previewText: "프로젝트 미리보기",
        updatedAt: new Date(now - 2 * 3600 * 1000).toISOString(),
        createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
        blocksCount: 8,
        connectionsCount: 12,
      },
      {
        id: "project-2",
        name: "E‑commerce Platform",
        previewText: "프로젝트 미리보기",
        updatedAt: new Date(now - 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(now - 48 * 3600 * 1000).toISOString(),
        blocksCount: 10,
        connectionsCount: 18,
      },
      {
        id: "project-3",
        name: "Analytics Dashboard",
        previewText: "프로젝트 미리보기",
        updatedAt: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
        blocksCount: 12,
        connectionsCount: 20,
      },
      {
        id: "project-4",
        name: "Social Media App",
        previewText: "프로젝트 미리보기",
        updatedAt: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
        blocksCount: 7,
        connectionsCount: 9,
      },
    ];
    setProjects(mock);
    setIsLoading(false);
  };

  const handleCreateProject = () => {
    navigate(ROUTES.PROJECT_NEW);
  };
  // 필터링 및 정렬
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortOrder === "newest" ? tb - ta : ta - tb;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Body */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Recent Projects
          </h2>

          {/* Search, Sort, New Project */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="프로젝트 이름 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "newest" | "oldest")
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">최신 순</option>
                <option value="oldest">오래된 순</option>
              </select>
            </div>
            <button
              onClick={handleCreateProject}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">Loading projects…</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                첫 번째 프로젝트를 만들어보세요
              </p>
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              >
                <Plus className="w-5 h-5 mr-2" />새 프로젝트 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {sorted.map((proj, idx) => (
                <ProjectCard
                  key={proj.id}
                  id={proj.id}
                  name={proj.name}
                  previewText={proj.previewText}
                  updatedAt={proj.updatedAt}
                  index={idx}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
