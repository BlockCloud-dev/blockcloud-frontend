// src/App.tsx
import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast"; // ← import 추가
import { router } from "./router";
import { useAuthStore } from "./stores/authStore";

/**
 * BlockCloud 메인 애플리케이션 컴포넌트
 * React Router를 사용한 멀티 페이지 구조
 */
function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // 앱 시작 시 인증 상태 초기화
    initialize();
  }, [initialize]);

  return (
    <>
      {/* 전역 토스트 컨테이너 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "14px" },
        }}
      />

      {/* 라우터 */}
      <RouterProvider router={router} />
    </>
  );
}

export default App;
