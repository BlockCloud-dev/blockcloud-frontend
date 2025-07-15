/**
 * 인증 관련 타입 정의
 */

// 사용자 정보 타입
export interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  provider: 'google' | 'email';
  createdAt: string;
  updatedAt: string;
}

// 로그인 응답 타입
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 토큰 갱신 응답 타입
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// Google OAuth 응답 타입
export interface GoogleOAuthResponse {
  code: string;
  state?: string;
}

// 인증 상태 타입
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

// API 에러 타입
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// 로그인 요청 타입 (테스트용)
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청 타입 (미래 확장용)
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
