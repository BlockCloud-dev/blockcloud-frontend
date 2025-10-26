import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiClients";
import ProjectDeploymentCard from "../components/ui/ProjectDeploymentCard";
import DeploymentDetailModal from "../components/ui/DeploymentDetailModal";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
  lastDeletedDeploymentId?: number;
}

const DeployStatusPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<
    number | null
  >(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // apiFetch는 항상 unwrapped data를 반환
      const data = await apiFetch("/api/projects?size=100");
      setProjects(data?.projects || []);
    } catch (err) {
      toast.error("프로젝트 목록을 불러오는 데 실패했습니다.", {
        id: "fetch-projects",
      });
    }
  };

  const handleDeploymentClick = (projectId: string, deploymentId: number) => {
    setSelectedProjectId(projectId);
    setSelectedDeploymentId(deploymentId);
    setShowModal(true);
  };

  const handleDeleteDeployment = async (
    projectId: string,
    deploymentId: number
  ) => {
    if (!window.confirm("정말 이 배포를 삭제하시겠습니까?")) return;

    try {
      await apiFetch(
        `/api/projects/${projectId}/terraform/deployments/${deploymentId}/destroy`,
        { method: "DELETE" }
      );
      toast.success("배포가 성공적으로 삭제되었습니다.");

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, lastDeletedDeploymentId: deploymentId }
            : p
        )
      );
    } catch (err) {
      toast.error("배포 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Terraform 배포 대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">배포된 프로젝트가 없습니다</h3>
            <p className="text-gray-600">프로젝트를 배포하면 여기에 표시됩니다</p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectDeploymentCard
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              lastDeletedDeploymentId={project.lastDeletedDeploymentId}
              onDeploymentClick={handleDeploymentClick}
              onDeleteDeployment={handleDeleteDeployment}
            />
          ))
        )}
      </div>

      {showModal && selectedProjectId && selectedDeploymentId !== null && (
        <DeploymentDetailModal
          projectId={selectedProjectId}
          deploymentId={selectedDeploymentId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default DeployStatusPage;
