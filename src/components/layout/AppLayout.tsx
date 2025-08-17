import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../stores/authStore";
import Sidebar from "../ui/SideBar";
import DashboardHeader from "../ui/DashboardHeader";
import { apiFetch } from "../../utils/apiClients"; // 꼭 추가

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
    const toastId = toast.loading("로그아웃 중입니다.");
    try {
      // 1. 서버에 로그아웃 요청 보내기
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });

      // 2. 로컬 상태 초기화
      await logout();

      // 3. 토큰 제거
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      // 4. 성공 후 이동
      toast.success("로그아웃 되었습니다.", { id: toastId });
      console.log("로그아웃성공");
      navigate("/login");
    } catch (err: any) {
      console.error("❌ 로그아웃 실패", err);
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
