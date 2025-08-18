import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiClients";
import ProjectDeploymentCard from "../components/ui/ProjectDeploymentCard";
import DeploymentDetailModal from "../components/ui/DeploymentDetailModal";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
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
    const fetchProjects = async () => {
      try {
        const res = await apiFetch("/api/projects?size=100");
        setProjects(res.data?.projects || []); // ✅ 수정된 부분
      } catch (err) {
        toast.error("프로젝트 목록을 불러오는 데 실패했습니다.", {
          id: "fetch-projects",
        });
      }
    };
    fetchProjects();
  }, []);

  const handleDeploymentClick = (projectId: string, deploymentId: number) => {
    setSelectedProjectId(projectId);
    setSelectedDeploymentId(deploymentId);
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Terraform 배포 대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <ProjectDeploymentCard
            key={project.id}
            projectId={project.id}
            projectName={project.name}
            onDeploymentClick={handleDeploymentClick}
          />
        ))}
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
