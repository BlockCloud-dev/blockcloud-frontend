// src/App.tsx
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import { useAuthStore } from "./stores/authStore";
import { initializeProviders } from "./providers";

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    console.log("🧩 App initialized");

    // 인증 시스템 초기화
    initialize();

    // 프로바이더 시스템 초기화
    initializeProviders().catch((error) => {
      console.error("❌ Failed to initialize providers:", error);
    });
  }, [initialize]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
