import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import ProjectCard from "../components/ui/ProjectCard";
import CreateProjectModal from "../components/ui/ProjectCreateModal";
import { apiFetch } from "../utils/apiClients";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set()); // 👈 추가

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      // apiFetch는 항상 unwrapped data를 반환 (data.data 또는 data)
      const data = await apiFetch("/api/projects?size=8");
      const projectsFromApi = data?.projects ?? [];

      const parsed: Project[] = projectsFromApi.map((proj: any) => ({
        id: String(proj.id),
        name: proj.name,
        previewText: proj.description || "설명 없음",
        createdAt: proj.createdAt,
        updatedAt: proj.updatedAt,
        blocksCount: 0,
        connectionsCount: 0,
      }));

      setProjects(parsed);
    } catch (error: any) {
      console.error("❌ 프로젝트 목록 로딩 실패:", error);
      alert(
        "프로젝트 목록을 불러오지 못했습니다: " +
        (error?.message ?? "unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCreateProject = async (name: string, description: string) => {
    setIsCreating(true);
    try {
      // apiFetch는 항상 unwrapped data를 반환
      const project = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });

      if (project?.id) {
        await loadProjects();
        setIsModalOpen(false);
      } else {
        throw new Error("프로젝트 생성 응답이 올바르지 않습니다.");
      }
    } catch (err: any) {
      alert("프로젝트 생성 실패: " + (err?.message ?? "unknown error"));
    } finally {
      setIsCreating(false);
    }
  };

  // 👇 삭제 함수 추가
  const handleDeleteProject = async (projectId: string) => {
    const ok = window.confirm(
      "정말 이 프로젝트를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    setDeletingIds((prev) => new Set(prev).add(projectId)); // 진행중 표시
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      // 성공 시 로컬 목록에서 제거 (재조회 없이 낙관적 업데이트)
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      console.error("❌ 프로젝트 삭제 실패:", err);
      alert(
        "프로젝트 삭제에 실패했습니다: " + (err?.message ?? "unknown error")
      );
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

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
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Recent Projects
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="프로젝트 이름 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "newest" | "oldest")
                  }
                  className="pl-3 pr-8 py-2 border border-gray-300 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium appearance-none"
                >
                  <option value="newest" className="text-gray-800">최신 순</option>
                  <option value="oldest" className="text-gray-800">오래된 순</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="text-base">New Project</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">Loading projects…</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-gray-400 text-6xl mb-6">📁</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                프로젝트가 없습니다
              </h3>
              <p className="text-gray-700 mb-8 text-lg font-medium">
                첫 번째 프로젝트를 만들어보세요
              </p>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="text-base">새 프로젝트 만들기</span>
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
                  onDelete={() => handleDeleteProject(proj.id)} // 👈 추가
                  isDeleting={deletingIds.has(proj.id)} // 👈 추가
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateProject}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
};

export default DashboardPage;
