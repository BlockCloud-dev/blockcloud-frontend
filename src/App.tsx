// src/App.tsx
import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import { useAuthStore } from "./stores/authStore";

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    console.log("🧩 App initialized");
    initialize();
  }, [initialize]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
