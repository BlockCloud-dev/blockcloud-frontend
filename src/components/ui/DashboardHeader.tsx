import React, { useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { useAuth } from "../../stores/authStore";
import CreateProjectModal from "../ui/ProjectCreateModal";
import * as projectService from "../../services/projectService";

export interface DashboardHeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => Promise<void>;
  isLoggingOut?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onMenuClick,
  onSettingsClick,
  onLogoutClick,
  isLoggingOut = false,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, userName, userEmail } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = () => {
    onLogoutClick();
  };

  const openCreateModal = () => setIsModalOpen(true);
  const closeCreateModal = () => setIsModalOpen(false);

  const handleCreateSubmit = async (name: string, description: string): Promise<void> => {
    try {
      const newProject = await projectService.createProject(name, description);
      // 성공 후 처리 로직
      console.log("프로젝트 생성 성공:", newProject);
      closeCreateModal();
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
    }
  };

  return (
    <header className="flex items-center p-4 bg-white shadow border-b border-gray-200">
      <button
        className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
        onClick={onMenuClick}
      >
        <Bars3Icon className="h-6 w-6 text-gray-600" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            {/* 사용자 정보 표시 */}
            <div
              className="hidden lg:flex items-center space-x-3 cursor-pointer"
              onClick={openCreateModal} // ← 사용자 정보 클릭 시 모달 열기
            >
              {user?.imgUrl ? (
                <img
                  src={user.imgUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userName?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
            </div>

            {/* 설정 버튼 */}
            <button
              onClick={onSettingsClick}
              className="inline-flex items-center p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition ${
                isLoggingOut
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {isLoggingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            로그인
          </button>
        )}
      </div>

      {/* 프로젝트 생성 모달 */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateSubmit}
      />
    </header>
  );
};

export default DashboardHeader;
