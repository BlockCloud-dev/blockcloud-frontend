import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from './routes';
import { useAuth } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 * 로그인 상태가 아니면 로그인 페이지로 리다이렉트
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때는 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 로그인 페이지로 리다이렉트하면서 현재 경로를 저장
    const currentPath = window.location.pathname;
    const redirectUrl = currentPath !== ROUTES.LOGIN ?
      `${ROUTES.LOGIN}?redirect=${encodeURIComponent(currentPath)}` :
      ROUTES.LOGIN;

    return <Navigate to={redirectUrl} replace />;
  }

  return <>{children}</>;
}

/**
 * 로그인한 사용자는 접근할 수 없는 라우트 (로그인, 회원가입 등)
 * 이미 로그인되어 있으면 대시보드로 리다이렉트
 */
export function GuestRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때는 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}
