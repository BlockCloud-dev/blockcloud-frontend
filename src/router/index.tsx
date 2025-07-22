import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "./routes";
import { ProtectedRoute, GuestRoute } from "./ProtectedRoute";

import AppLayout from "../components/layout/AppLayout";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import LoginSuccessPage from "../pages/LoginSuccessPage";
import DashboardPage from "../pages/DashboardPage";
import ProjectEditorPage from "../pages/ProjectEditorPage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: ROUTES.LOGIN,
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      { path: ROUTES.LOGIN_SUCCESS, element: <LoginSuccessPage /> },
      {
        path: ROUTES.DASHBOARD,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  // 헤더랑 사이드바 없이 라우팅
  {
    path: ROUTES.PROJECT_EDITOR,
    element: (
      <ProtectedRoute>
        <ProjectEditorPage />
      </ProtectedRoute>
    ),
  },
]);
