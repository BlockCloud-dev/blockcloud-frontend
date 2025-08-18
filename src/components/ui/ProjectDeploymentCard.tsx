import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiClients";
import toast from "react-hot-toast";

interface Props {
  projectId: string;
  projectName: string;
  onDeploymentClick: (projectId: string, deploymentId: number) => void;
}

interface Deployment {
  deploymentId: number;
  status: string;
  message: string;
  startedAt: string;
}

const ProjectDeploymentCard: React.FC<Props> = ({
  projectId,
  projectName,
  onDeploymentClick,
}) => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await apiFetch(
          `/api/projects/${projectId}/terraform/deployments?size=10`
        );
        setDeployments(res.data?.deployments || []);
      } catch (err) {
        toast.error(
          `프로젝트 ${projectName}의 배포 이력을 불러오지 못했습니다.`,
          {
            id: `deployments-${projectId}`,
          }
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDeployments();
  }, [projectId]);

  return (
    <div className="border rounded-lg shadow-sm p-4 bg-white">
      <h2 className="text-lg font-semibold mb-3">{projectName}</h2>
      {loading ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : deployments.length === 0 ? (
        <p className="text-gray-500 text-sm">배포 이력이 없습니다.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {deployments.map((d) => (
            <li
              key={d.deploymentId}
              className="flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => onDeploymentClick(projectId, d.deploymentId)}
            >
              <div>
                <div className="font-medium">{d.status}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(d.startedAt).toLocaleString()}
                </div>
              </div>
              <span className="text-gray-400 text-xs">{d.deploymentId}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectDeploymentCard;
