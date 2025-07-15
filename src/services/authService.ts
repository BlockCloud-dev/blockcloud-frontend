import type {
  LoginResponse,
  RefreshTokenResponse,
  LoginRequest,
  User
} from '../types/auth';

/**
 * 백엔드 API 베이스 URL
 * TODO: 환경변수로 관리
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 인증 관련 API 호출 클래스
 * 백엔드 API 스펙에 맞춘 구현
 */
export class AuthService {
  /**
   * Google OAuth 로그인 시작
   * 백엔드에서 Google OAuth URL을 받아와서 리다이렉트
   */
  static async initiateGoogleLogin(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Google 로그인 초기화 실패');
      }

      const data = await response.json();
      return data.authUrl; // 구글 OAuth URL
    } catch (error) {
      console.error('Google OAuth 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * Google OAuth 콜백 처리
   * OAuth 인증 코드를 백엔드로 전송하여 토큰 받기
   */
  static async handleGoogleCallback(authCode: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: authCode }),
      });

      if (!response.ok) {
        throw new Error('Google 로그인 처리 실패');
      }

      return await response.json();
    } catch (error) {
      console.error('Google OAuth 콜백 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트용 이메일 로그인
   * TODO: 실제 프로덕션에서는 제거하거나 개발 모드에서만 활성화
   */
  static async loginWithEmail(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그인 실패');
      }

      return await response.json();
    } catch (error) {
      console.error('이메일 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 갱신
   */
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reissue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('토큰 갱신 실패');
      }

      return await response.json();
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 정보 조회
   */
  static async getCurrentUser(accessToken: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('사용자 정보 조회 실패');
      }

      return await response.json();
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 로그아웃
   */
  static async logout(accessToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('서버 로그아웃 실패, 로컬 상태만 정리');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 네트워크 오류라도 로컬 상태는 정리
    }
  }

  /**
   * 계정 완전 삭제 (sign-out)
   */
  static async signOut(accessToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sign-out`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('계정 삭제 실패');
      }
    } catch (error) {
      console.error('계정 삭제 실패:', error);
      throw error;
    }
  }
}

/**
 * 토큰 저장소 유틸리티
 */
export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'blockcloud_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'blockcloud_refresh_token';
  private static readonly USER_KEY = 'blockcloud_user';

  static saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static saveUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static clearAll(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('isLoggedIn'); // 기존 임시 키도 정리
  }

  static hasValidTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}
