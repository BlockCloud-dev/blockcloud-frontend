import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AuthState, User, LoginRequest } from '../types/auth';
import { AuthService, TokenStorage } from '../services/authService';

interface AuthActions {
  // 로그인 관련
  loginWithGoogle: () => void; // Promise 제거, 즉시 리다이렉트
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

/**
 * 인증 상태 관리 Zustand 스토어
 */
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

      // Google OAuth 로그인 (실제 OAuth2 리다이렉트)
      loginWithGoogle: () => {
        console.log('🔄 Google OAuth2 로그인 시작...');

        // 에러 상태 클리어
        set({ error: null });

        // 실제 OAuth2 엔드포인트로 리다이렉트
        const oauthUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth2/authorization/google`;

        console.log('🌐 OAuth2 URL로 리다이렉트:', oauthUrl);
        window.location.href = oauthUrl;
      },

      // OAuth2 콜백 처리 (LoginSuccessPage에서 호출)
      handleOAuthCallback: async (accessToken: string, user: User) => {
        console.log('🔄 OAuth2 콜백 처리 시작:', {
          tokenLength: accessToken.length,
          userName: user.name,
          userEmail: user.email
        });

        try {
          // 토큰과 사용자 정보 저장
          TokenStorage.saveTokens(accessToken, ''); // Refresh Token은 쿠키로 관리
          TokenStorage.saveUser(user);

          // 상태 업데이트
          set({
            isAuthenticated: true,
            user: user,
            accessToken: accessToken,
            refreshToken: null, // 쿠키로 관리되므로 null
            isLoading: false,
            error: null,
          });

          console.log('✅ OAuth2 콜백 처리 성공');
        } catch (error) {
          console.error('❌ OAuth2 콜백 처리 실패:', error);
          throw error; // LoginSuccessPage에서 처리하도록 에러 전파
        }
      },

      // 이메일 로그인 (테스트용)
      loginWithEmail: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          console.log('이메일 로그인 시도:', credentials.email);

          // 간단한 테스트 계정 검증
          if (credentials.email === 'test@blockcloud.dev' && credentials.password === 'test123') {
            const mockUser: User = {
              id: 'test-user-1',
              email: credentials.email,
              name: '테스트 사용자',
              profileImageUrl: 'https://via.placeholder.com/64',
              provider: 'email',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const mockTokens = {
              accessToken: 'mock-access-token-email',
              refreshToken: 'mock-refresh-token-email',
            };

            // 토큰과 사용자 정보 저장
            TokenStorage.saveTokens(mockTokens.accessToken, mockTokens.refreshToken);
            TokenStorage.saveUser(mockUser);

            set({
              isAuthenticated: true,
              user: mockUser,
              accessToken: mockTokens.accessToken,
              refreshToken: mockTokens.refreshToken,
              isLoading: false,
              error: null,
            });

            console.log('✅ 이메일 로그인 성공');
          } else {
            throw new Error('잘못된 이메일 또는 비밀번호입니다.');
          }
        } catch (error) {
          console.error('❌ 이메일 로그인 실패:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '로그인 실패',
          });
        }
      },

      // 로그아웃
      logout: async () => {
        const { accessToken } = get();

        try {
          // 서버에 로그아웃 요청 (에러가 나도 로컬 상태는 정리)
          if (accessToken) {
            await AuthService.logout(accessToken);
          }
        } catch (error) {
          console.warn('서버 로그아웃 실패, 로컬 상태만 정리:', error);
        } finally {
          // 로컬 스토리지 정리
          TokenStorage.clearAll();

          // 상태 초기화
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: null,
          });

          console.log('✅ 로그아웃 완료');
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

          // 로컬 스토리지 정리
          TokenStorage.clearAll();

          // 상태 초기화
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: null,
          });

          console.log('✅ 계정 삭제 완료');
        } catch (error) {
          console.error('❌ 계정 삭제 실패:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '계정 삭제 실패',
          });
        }
      },

      // 토큰 갱신
      refreshAccessToken: async (): Promise<boolean> => {
        const { refreshToken } = get();

        if (!refreshToken) {
          console.warn('리프레시 토큰이 없습니다.');
          return false;
        }

        try {
          // Phase 2에서는 임시 구현
          console.log('토큰 갱신 시도...');

          // 실제로는 AuthService.refreshToken(refreshToken) 호출
          const newAccessToken = 'mock-refreshed-access-token';

          TokenStorage.saveTokens(newAccessToken, refreshToken);

          set({ accessToken: newAccessToken });

          console.log('✅ 토큰 갱신 성공');
          return true;
        } catch (error) {
          console.error('❌ 토큰 갱신 실패:', error);

          // 리프레시 토큰도 만료된 경우 로그아웃
          get().logout();
          return false;
        }
      },

      // 스토리지에서 사용자 정보 로드
      loadUserFromStorage: () => {
        const user = TokenStorage.getUser();
        const accessToken = TokenStorage.getAccessToken();
        const refreshToken = TokenStorage.getRefreshToken();

        if (user && accessToken && refreshToken) {
          set({
            isAuthenticated: true,
            user,
            accessToken,
            refreshToken,
          });
          console.log('✅ 저장된 인증 정보 복원:', user.email);
        }
      },

      // 사용자 정보 업데이트
      updateUser: (user: User) => {
        TokenStorage.saveUser(user);
        set({ user });
      },

      // 로딩 상태 설정
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // 에러 설정
      setError: (error: string | null) => {
        set({ error });
      },

      // 에러 클리어
      clearError: () => {
        set({ error: null });
      },

      // 앱 초기화
      initialize: async () => {
        console.log('🔄 인증 상태 초기화 시작...');

        // 저장된 인증 정보 복원
        get().loadUserFromStorage();

        const { isAuthenticated, accessToken } = get();

        if (isAuthenticated && accessToken) {
          // 토큰 유효성 검사 (실제로는 서버에 확인)
          console.log('✅ 기존 인증 상태 유지');
        } else {
          console.log('ℹ️ 인증되지 않은 상태');
        }
      },
    }),
    {
      name: 'auth-store',
    }
  )
);

// 인증 관련 유틸리티 훅들
export const useAuth = () => {
  const store = useAuthStore();
  return {
    // 상태
    isAuthenticated: store.isAuthenticated,
    user: store.user,
    isLoading: store.isLoading,
    error: store.error,

    // 액션
    loginWithGoogle: store.loginWithGoogle,
    loginWithEmail: store.loginWithEmail,
    logout: store.logout,
    signOut: store.signOut,
    clearError: store.clearError,

    // OAuth2 콜백 처리
    handleOAuthCallback: store.handleOAuthCallback,

    // 유틸리티
    isAdmin: store.user?.email === 'admin@blockcloud.dev',
    userName: store.user?.name || '사용자',
    userEmail: store.user?.email || '',
  };
};
