import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiClients";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock, Loader2, Terminal } from "lucide-react";

interface Props {
  projectId: string;
  deploymentId: number;
  onClose: () => void;
}

const statusMap: Record<
  string,
  { label: string; icon: React.ReactElement; color: string; bg: string }
> = {
  SUCCESS: {
    label: "성공",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  FAILED: {
    label: "실패",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-700",
    bg: "bg-red-100",
  },
  PENDING: {
    label: "대기 중",
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-700",
    bg: "bg-yellow-100",
  },
  RUNNING: {
    label: "진행 중",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
};

const DeploymentDetailModal: React.FC<Props> = ({
  projectId,
  deploymentId,
  onClose,
}) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiFetch(
          `/api/projects/${projectId}/terraform/deployments/${deploymentId}`
        );
        setDetail(res.data);
      } catch (err) {
        toast.error("배포 상세 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [projectId, deploymentId]);

  const statusMeta = detail?.status ? statusMap[detail.status] : null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 제목 */}
        <h2 className="text-2xl font-bold mb-6">배포 상세 정보</h2>

        {/* 로딩 상태 */}
        {loading ? (
          <p className="text-gray-500">불러오는 중...</p>
        ) : detail ? (
          <div className="space-y-6 text-sm text-gray-700">
            {/* 상태 뱃지 */}
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusMeta?.bg} ${statusMeta?.color}`}
              >
                {statusMeta?.icon}
                {statusMeta?.label}
              </div>
              <span className="text-gray-400 text-sm">
                배포 ID: {deploymentId}
              </span>
            </div>

            {/* 시간 정보 */}
            <div className="space-y-2">
              <div>
                <span className="font-semibold mr-2">시작 시각:</span>
                {new Date(detail.startedAt).toLocaleString()}
              </div>
              {detail.completedAt && (
                <div>
                  <span className="font-semibold mr-2">완료 시각:</span>
                  {new Date(detail.completedAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* 메시지 */}
            <div>
              <span className="font-semibold mr-2">메시지:</span>
              {detail.message || "없음"}
            </div>

            {/* 로그 출력 */}
            <div>
              <div className="flex items-center gap-2 font-semibold mb-2">
                <Terminal className="w-4 h-4 text-gray-600" />
                실행 결과 로그
              </div>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-80 text-sm text-gray-800 whitespace-pre-wrap border border-gray-200">
                {detail.output || "출력 없음"}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">상세 정보가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default DeploymentDetailModal;
