// src/components/modal/CreateProjectModal.tsx
import React, { useState } from "react";
import { createProject } from "../../services/projectService";
import { useNavigate } from "react-router-dom"; // ✅ 추가

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (name: string, description: string) => Promise<void>;
  isSubmitting?: boolean;
}

const CreateProjectModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (onSubmit) {
      // 외부에서 onSubmit을 제공한 경우
      try {
        await onSubmit(name, description);
        setName("");
        setDescription("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "생성 실패");
      }
    } else {
      // 기본 동작
      setLoading(true);
      setError(null);
      try {
        const project = await createProject(name, description);
        navigate(`/project/${project.id}`);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "생성 실패");
      } finally {
        setLoading(false);
      }
    }
  };

  const isCurrentlyLoading = isSubmitting || loading;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">새 프로젝트 만들기</h2>
        <input
          type="text"
          placeholder="프로젝트 이름"
          className="w-full border p-2 rounded mb-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder="프로젝트 설명"
          className="w-full border p-2 rounded mb-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCurrentlyLoading}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {isCurrentlyLoading ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
