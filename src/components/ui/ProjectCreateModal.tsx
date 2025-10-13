// src/components/modal/CreateProjectModal.tsx
import React, { useState } from "react";
import { createProject } from "../../services/projectService";
import { useNavigate } from "react-router-dom"; // ✅ 추가
import { PROVIDER_INFO, CloudProviderType } from "../../providers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (name: string, description: string, provider?: CloudProviderType) => Promise<void>;
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
  const [selectedProvider, setSelectedProvider] = useState<CloudProviderType>(CloudProviderType.AWS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (onSubmit) {
      // 외부에서 onSubmit을 제공한 경우
      try {
        await onSubmit(name, description, selectedProvider);
        setName("");
        setDescription("");
        setSelectedProvider(CloudProviderType.AWS);
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
          className="w-full border p-2 rounded mb-4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* 클라우드 프로바이더 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            클라우드 프로바이더 선택
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PROVIDER_INFO).map(([key, info]) => {
              const providerType = key as CloudProviderType;
              const isSelected = selectedProvider === providerType;
              const isImplemented = info.implemented;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isImplemented}
                  onClick={() => isImplemented && setSelectedProvider(providerType)}
                  className={`
                    relative p-3 border-2 rounded-lg text-center transition-all
                    ${isSelected && isImplemented
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isImplemented
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-2xl">{info.icon}</span>
                    <span className="text-xs font-medium">{info.shortName}</span>
                  </div>
                  {!isImplemented && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            선택한 프로바이더: <span className="font-medium" style={{ color: PROVIDER_INFO[selectedProvider].color }}>
              {PROVIDER_INFO[selectedProvider].name}
            </span>
          </p>
        </div>
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
