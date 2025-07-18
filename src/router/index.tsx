import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { ROUTES } from './routes';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute';

// 페이지 컴포넌트들
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import LoginSuccessPage from '../pages/LoginSuccessPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectEditorPage from '../pages/ProjectEditorPage';

/**
 * React Router 7.6.3 기반 애플리케이션 라우터 구성
 * 인증 보호와 중첩 라우팅 지원
 */
const routes: RouteObject[] = [
  {
    path: ROUTES.HOME,
    element: <HomePage />,
  },
  {
    path: ROUTES.LOGIN,
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: ROUTES.LOGIN_SUCCESS,
    element: <LoginSuccessPage />,
  },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/project/:id',
    element: (
      <ProtectedRoute>
        <ProjectEditorPage />
      </ProtectedRoute>
    ),
  },
  // 404 페이지 - 모든 매치되지 않는 경로
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-lg text-gray-600 mb-8">페이지를 찾을 수 없습니다.</p>
          <a
            href={ROUTES.HOME}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    ),
  },
];

/**
 * 애플리케이션의 메인 라우터
 */
export const router = createBrowserRouter(routes);

export default router;
