// 라우트 상수 정의
export const ROUTES = {
  // 공개 라우트
  HOME: "/",
  LOGIN: "/login",
  LOGIN_SUCCESS: "/oauth2/callback",
  REGISTER: "/register",

  // 인증 필요 라우트
  DASHBOARD: "/dashboard", // 프로젝트 목록
  PROJECT_EDITOR: "/project/:id", // 3D 에디터 (현재 App.tsx)
  PROJECT_NEW: "/project/new", // 새 프로젝트

  // 사용자 관련
  PROFILE: "/profile",
  SETTINGS: "/settings",

  // 기타
  NOT_FOUND: "/404",
} as const;

// 라우트 타입 정의
export type RouteKey = keyof typeof ROUTES;
export type RouteValue = (typeof ROUTES)[RouteKey];

// 동적 라우트 헬퍼 함수들
export const createProjectEditorRoute = (projectId: string) =>
  `/project/${projectId}`;

export const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER];
  return publicRoutes.includes(pathname as any);
};

export const isAuthRequiredRoute = (pathname: string): boolean => {
  const authRoutes = [
    ROUTES.DASHBOARD,
    ROUTES.PROJECT_NEW,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
  ];
  return (
    authRoutes.includes(pathname as any) || pathname.startsWith("/project/")
  );
};
