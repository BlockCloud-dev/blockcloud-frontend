import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiClients";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react";

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

const statusStyleMap: Record<
  string,
  { label: string; icon: JSX.Element; colorClass: string; bgClass: string }
> = {
  SUCCESS: {
    label: "배포 성공",
    icon: <CheckCircle className="w-4 h-4" />,
    colorClass: "text-green-700",
    bgClass: "bg-green-100",
  },
  FAILED: {
    label: "배포 실패",
    icon: <XCircle className="w-4 h-4" />,
    colorClass: "text-red-700",
    bgClass: "bg-red-100",
  },
  PENDING: {
    label: "배포 대기 중",
    icon: <Clock className="w-4 h-4" />,
    colorClass: "text-yellow-700",
    bgClass: "bg-yellow-100",
  },
  RUNNING: {
    label: "배포 진행 중",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    colorClass: "text-blue-700",
    bgClass: "bg-blue-100",
  },
};

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
          `/api/projects/${projectId}/terraform/deployments?size=1`
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

  const latest = deployments[0];
  const status = latest?.status;
  const statusMeta = status ? statusStyleMap[status] : null;

  return (
    <div
      className="group transition-all duration-200 rounded-xl shadow-md hover:shadow-lg bg-white p-6 cursor-pointer hover:-translate-y-0.5"
      onClick={() =>
        latest && onDeploymentClick(projectId, latest.deploymentId)
      }
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-900">{projectName}</h2>
        <ChevronRight className="w-7 h-7 text-indigo-500 group-hover:scale-110 transition-transform duration-200" />
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">배포 이력을 불러오는 중...</p>
      ) : !latest ? (
        <p className="text-sm text-gray-400">배포 이력이 없습니다.</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusMeta?.bgClass} ${statusMeta?.colorClass}`}
          >
            {statusMeta?.icon}
            {statusMeta?.label}
          </div>

          <div className="text-gray-500 text-xs">
            시작 시각: {new Date(latest.startedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDeploymentCard;
