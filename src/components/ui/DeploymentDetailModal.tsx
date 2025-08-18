import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiClients";
import toast from "react-hot-toast";

interface Props {
  projectId: string;
  deploymentId: number;
  onClose: () => void;
}

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">배포 상세 정보</h2>
        {loading ? (
          <p>불러오는 중...</p>
        ) : detail ? (
          <div className="space-y-2 text-sm">
            <div>
              <strong>Status:</strong> {detail.status}
            </div>
            <div>
              <strong>Started At:</strong>{" "}
              {new Date(detail.startedAt).toLocaleString()}
            </div>
            <div>
              <strong>Completed At:</strong>{" "}
              {new Date(detail.completedAt).toLocaleString()}
            </div>
            <div>
              <strong>Message:</strong> {detail.message}
            </div>
            <div className="mt-2">
              <strong>Output:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40 text-xs whitespace-pre-wrap">
                {detail.output}
              </pre>
            </div>
          </div>
        ) : (
          <p>상세 정보가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default DeploymentDetailModal;
