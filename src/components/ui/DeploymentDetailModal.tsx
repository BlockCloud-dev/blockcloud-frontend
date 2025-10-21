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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 text-xl bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-all"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 제목 */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800">배포 상세 정보</h2>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="flex items-center space-x-3 py-8 px-4 text-gray-500 justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-lg font-medium">배포 정보를 불러오는 중...</p>
          </div>
        ) : detail ? (
          <div className="space-y-8 text-base text-gray-700">
            {/* 상태 뱃지 */}
            <div className="flex flex-wrap items-center gap-4">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${statusMeta?.bg} ${statusMeta?.color}`}
              >
                {statusMeta?.icon}
                {statusMeta?.label}
              </div>
              <span className="text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
                배포 ID: {deploymentId}
              </span>
            </div>

            {/* 시간 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="block text-sm text-gray-500 mb-1">시작 시각</span>
                <span className="font-medium text-gray-800">{new Date(detail.startedAt).toLocaleString('ko-KR')}</span>
              </div>
              {detail.completedAt && (
                <div>
                  <span className="block text-sm text-gray-500 mb-1">완료 시각</span>
                  <span className="font-medium text-gray-800">{new Date(detail.completedAt).toLocaleString('ko-KR')}</span>
                </div>
              )}
            </div>

            {/* 메시지 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <span className="block text-sm text-blue-700 font-bold mb-1">상태 메시지</span>
              <p className="text-gray-800 font-medium">{detail.message || "없음"}</p>
            </div>

            {/* 로그 출력 */}
            <div>
              <div className="flex items-center gap-2 font-bold mb-2 text-gray-800">
                <Terminal className="w-5 h-5 text-gray-700" />
                실행 결과 로그
              </div>
              <pre className="bg-gray-900 text-gray-100 p-5 rounded-md overflow-auto max-h-[400px] text-sm font-mono whitespace-pre-wrap border border-gray-800 shadow-inner">
                {detail.output || "출력 없음"}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">상세 정보를 찾을 수 없습니다</p>
            <p className="text-sm text-gray-500 mt-2">배포 정보가 삭제되었거나 서버 오류가 발생했을 수 있습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentDetailModal;
