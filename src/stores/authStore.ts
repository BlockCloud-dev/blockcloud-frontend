import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { LoginRequest, AuthState, User } from "../types/auth";
import { AuthService, TokenStorage } from "../services/authService";

interface AuthActions {
  // 로그인 관련
  loginWithGoogle: () => void;
  loginWithEmail: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;

  // OAuth2 콜백 처리
  handleOAuthCallback: (accessToken: string, user: User) => Promise<void>;

  // 토큰 관리
  refreshAccessToken: () => Promise<boolean>;

  // 사용자 정보
  loadUserFromStorage: () => void;
  updateUser: (user: User) => void;

  // 상태 관리
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // 초기화
  initialize: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Google OAuth 로그인
      loginWithGoogle: () => {
        set({ error: null });
        const oauthUrl = `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
        }/oauth2/authorization/google`;
        window.location.href = oauthUrl;
      },

      // OAuth2 콜백 처리
      handleOAuthCallback: async (accessToken: string, user: User) => {
        TokenStorage.saveTokens(accessToken, "");
        TokenStorage.saveUser(user);

        set({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken: null,
          isLoading: false,
          error: null,
        });
      },

      // 로그아웃
      logout: async () => {
        const { accessToken } = get();

        try {
          if (accessToken) {
            await AuthService.logout(accessToken);
          }
        } catch (_) {
          // 서버 실패해도 로컬 정리
        } finally {
          TokenStorage.clearAll();
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: null,
          });
        }
      },

      // 계정 완전 삭제
      signOut: async () => {
        const { accessToken } = get();
        set({ isLoading: true, error: null });

        try {
          if (accessToken) {
            await AuthService.signOut(accessToken);
          }

          TokenStorage.clearAll();
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "계정 삭제 실패",
          });
        }
      },

      refreshAccessToken: async (): Promise<boolean> => {
        try {
          const response = await AuthService.refreshToken(); // 서버로부터 토큰 갱신 요청
          const { accessToken, refreshToken } = response;

          if (!accessToken) throw new Error("No access token returned");

          // 토큰 저장
          TokenStorage.saveTokens(
            accessToken,
            refreshToken ?? get().refreshToken ?? ""
          );

          // 상태 업데이트
          set({
            accessToken,
            refreshToken: refreshToken ?? get().refreshToken ?? "",
          });

          return true;
        } catch (err) {
          // 실패 시 로그아웃 처리
          await get().logout();
          return false;
        }
      },

      // 스토리지에서 사용자 정보 로드
      loadUserFromStorage: () => {
        const user = TokenStorage.getUser();
        const accessToken = TokenStorage.getAccessToken();
        const refreshToken = TokenStorage.getRefreshToken();

        if (user && accessToken) {
          set({
            isAuthenticated: true,
            user,
            accessToken,
            refreshToken: refreshToken || null,
          });
          console.log("✅ 저장된 인증 정보 복원:", user.email);
        }
      },

      // 사용자 정보 업데이트
      updateUser: (user: User) => {
        TokenStorage.saveUser(user);
        set({ user });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // 앱 초기화
      initialize: async () => {
        console.log("🔄 인증 상태 초기화 시작...");
        get().loadUserFromStorage();

        const { isAuthenticated, accessToken } = get();
        if (isAuthenticated && accessToken) {
          console.log("✅ 기존 인증 상태 유지");
        } else {
          console.log("ℹ️ 인증되지 않은 상태");
        }
      },
    }),
    { name: "auth-store" }
  )
);

// 편의 훅
export const useAuth = () => {
  const store = useAuthStore();
  return {
    isAuthenticated: store.isAuthenticated,
    user: store.user,
    isLoading: store.isLoading,
    error: store.error,

    loginWithGoogle: store.loginWithGoogle,
    loginWithEmail: store.loginWithEmail,
    logout: store.logout,
    signOut: store.signOut,
    clearError: store.clearError,

    handleOAuthCallback: store.handleOAuthCallback,

    userName: store.user?.username || "사용자",
    userEmail: store.user?.email || "",
    userImage: store.user?.imgUrl || "",
  };
};
