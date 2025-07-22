import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../stores/authStore";
import Sidebar from "../ui/SideBar";
import DashboardHeader from "../ui/DashboardHeader";

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 사이드바 열린 상태
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 로그아웃 중 상태
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    setIsLoggingOut(true);
    const toastId = toast.loading("로그아웃 중입니다…");
    try {
      await logout();
      toast.success("로그아웃 되었습니다.", { id: toastId });
      navigate("/login");
    } catch {
      toast.error("로그아웃에 실패했습니다.", { id: toastId });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
          userName={user?.name}
          userEmail={user?.email}
          onSettingsClick={() => navigate("/settings")}
          onLogoutClick={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* 자식 라우트가 렌더링될 영역 */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
