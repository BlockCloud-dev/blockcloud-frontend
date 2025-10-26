// src/components/modal/CreateProjectModal.tsx
import React, { useState } from "react";
import { createProject } from "../../services/projectService";
import { useNavigate } from "react-router-dom";
import { PROVIDER_INFO, CloudProviderType, providerManager } from "../../providers";
import { useProjectStore } from "../../stores/projectStore";

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
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

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
        // 1. 프로젝트 생성 (name, description만 전달)
        const project = await createProject(name, description);

        // 2. 선택한 프로바이더를 프론트엔드 상태에 설정
        // CloudProviderType enum을 문자열로 변환
        let cspString: "AWS" | "GCP" | "Azure" = "AWS";
        if (selectedProvider === CloudProviderType.AWS) {
          cspString = "AWS";
        } else if (selectedProvider === CloudProviderType.GCP) {
          cspString = "GCP";
        } else if (selectedProvider === CloudProviderType.AZURE) {
          cspString = "Azure";
        }

        setCurrentCSP(cspString);
        providerManager.setCurrentProvider(selectedProvider);

        // 3. 프로젝트 에디터 페이지로 이동 (프로바이더 정보를 state로 전달)
        navigate(`/project/${project.id}`, {
          state: {
            projectName: name,
            initialProvider: cspString,
          }
        });
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
        <h2 className="text-xl font-bold mb-4 text-gray-800">새 프로젝트 만들기</h2>
        <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 이름</label>
        <input
          type="text"
          placeholder="프로젝트 이름"
          className="w-full border p-2 rounded mb-4 text-gray-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 설명</label>
        <textarea
          placeholder="프로젝트 설명"
          className="w-full border p-2 rounded mb-4 text-gray-800"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* 클라우드 프로바이더 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-800 mb-2">
            클라우드 프로바이더 선택
          </label>
          <div className="flex justify-between gap-2">
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
                    relative p-3 border-2 rounded-lg text-center transition-all flex-1
                    ${isSelected && isImplemented
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                      : isImplemented
                        ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800'
                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-3xl">{info.icon}</span>
                    <span className="text-sm font-semibold">{info.shortName}</span>
                  </div>
                  {!isImplemented && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-gray-700 mt-3 font-medium">
            선택한 프로바이더: <span className="font-bold" style={{ color: PROVIDER_INFO[selectedProvider].color }}>
              {PROVIDER_INFO[selectedProvider].name}
            </span>
          </p>
        </div>
        {error && <p className="text-red-500 text-sm mb-2 font-medium">{error}</p>}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCurrentlyLoading}
            className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-70"
          >
            {isCurrentlyLoading ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
