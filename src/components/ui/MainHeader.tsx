import React, { useState, useEffect } from "react";
import { Save, FolderOpen } from "lucide-react";

interface MainHeaderProps {
  projectName: string;
  currentCSP: "AWS" | "GCP" | "Azure";
  isSaved: boolean;
  onProjectNameChange: (newName: string) => void;
  onCSPChange: (csp: "AWS" | "GCP" | "Azure") => void;
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  userName: string;
  userImageUrl: string;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  projectName,
  currentCSP,
  isSaved,
  onProjectNameChange,
  onCSPChange,
  onNewProject,
  onLoadProject,
  onSaveProject,
  userName,
  userImageUrl,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  const handleNameSubmit = () => {
    if (tempName.trim() !== "" && tempName !== projectName) {
      onProjectNameChange(tempName.trim());
    }
    setEditingName(false);
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between z-50">
      {/* 좌측: 로고 + 이름 + CSP + 상태 */}
      <div className="flex items-center space-x-4">
        {/* 로고 */}
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

        {/* CSP 표시 */}
        <div className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
          {currentCSP}
        </div>

        {/* 상태 표시 */}
        {/* <span className="text-green-600 text-sm font-medium ml-2">
          ● Healthy
        </span> */}
      </div>

      {/* 우측: 저장/열기 + 사용자 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onLoadProject}
            className="flex items-center text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <FolderOpen className="w-4 h-4 mr-1" />새 프로젝트 열기
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
            src={userImageUrl}
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
