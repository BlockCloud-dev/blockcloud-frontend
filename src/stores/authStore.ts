import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AuthState, User, LoginRequest } from '../types/auth';
import { AuthService, TokenStorage } from '../services/authService';

interface AuthActions {
  // 로그인 관련
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;

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

      // Google OAuth 로그인
      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          // Phase 2에서는 임시 구현, Phase 3에서 실제 OAuth 구현
          console.log('Google OAuth 로그인 시작...');

          // 임시 사용자 데이터 (실제로는 백엔드에서 받아옴)
          const mockUser: User = {
            id: 'google-user-1',
            email: 'user@gmail.com',
            name: '구글 사용자',
            profileImageUrl: 'https://via.placeholder.com/64',
            provider: 'google',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const mockTokens = {
            accessToken: 'mock-access-token-google',
            refreshToken: 'mock-refresh-token-google',
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

          console.log('✅ Google 로그인 성공');
        } catch (error) {
          console.error('❌ Google 로그인 실패:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Google 로그인 실패',
          });
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

    // 유틸리티
    isAdmin: store.user?.email === 'admin@blockcloud.dev',
    userName: store.user?.name || '사용자',
    userEmail: store.user?.email || '',
  };
};
