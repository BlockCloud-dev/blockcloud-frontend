import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useProjectStore } from "../../stores";
import { useAuth } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";

const MainHeader: React.FC<{
  onLoadProject: () => void;
  onSaveProject: () => void;
}> = ({ onLoadProject, onSaveProject }) => {
  const { userName, userImage } = useAuth();
  const navigate = useNavigate();

  const projectId = useProjectStore((state) => state.projectId);
  const projectName = useProjectStore((state) => state.projectName);
  const description = useProjectStore((state) => state.description);
  const currentCSP = useProjectStore((state) => state.currentCSP);

  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);
  const newProject = useProjectStore((state) => state.newProject);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  const handleNameSubmit = async () => {
    const trimmed = tempName.trim();
    setEditingName(false); // 먼저 편집 모드 종료

    // 이름이 변경되지 않았거나 빈 문자열이면 무시
    if (!trimmed || trimmed === projectName || !projectId) return;

    // UI 상 즉시 업데이트 (optimistic update)
    setProjectName(trimmed);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          name: trimmed,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`(${response.status}) 서버 응답 오류`);
      }

      // 필요 시 서버 응답에서 name을 다시 읽어 동기화 가능
    } catch (err: any) {
      alert("❌ 제목 저장 실패: " + err.message);
      setTempName(projectName); // 실패 시 원래 이름으로 복구
    }
  };

  const handleCSPChange = (csp: "AWS" | "GCP" | "Azure") => {
    setCurrentCSP(csp);
  };

  const handleNewProject = () => {
    newProject();
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between z-50">
      {/* 좌측: 로고 + 이름 + CSP */}
      <div className="flex items-center space-x-4">
        <img
          src="/BlockCloud-logo.png"
          alt="BlockCloud logo"
          className="w-10 h-10"
        />

        {/* 프로젝트 이름 */}
        {editingName ? (
          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            autoFocus
            className="text-lg font-bold text-gray-800 border-b border-gray-300 focus:outline-none px-1 bg-white"
          />
        ) : (
          <h1
            className="text-lg font-bold text-gray-800 cursor-pointer"
            onClick={() => setEditingName(true)}
          >
            {projectName}
          </h1>
        )}

        {/* CSP 선택 */}
        <select
          value={currentCSP}
          onChange={(e) =>
            handleCSPChange(e.target.value as "AWS" | "GCP" | "Azure")
          }
          className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md border-none outline-none cursor-pointer"
        >
          <option value="AWS">AWS</option>
          <option value="GCP">GCP</option>
          <option value="Azure">Azure</option>
        </select>
      </div>

      {/* 우측: 버튼 + 사용자 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            목록으로 이동
          </button>
          <button
            onClick={onSaveProject}
            className="flex items-center text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <Save className="w-4 h-4 mr-1" />
            프로젝트 저장
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <img
            src={userImage}
            alt="user"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-700">{userName}</span>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
