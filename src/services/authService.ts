import type {
  LoginResponse,
  RefreshTokenResponse,
  LoginRequest,
  User,
  ApiResponse,
} from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class AuthService {
  static async loginWithEmail(
    credentials: LoginRequest
  ): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    const data: ApiResponse<LoginResponse> = await res.json();

    if (!data.success || !data.data) {
      const errorMsg = data.error?.message || "로그인 실패";
      const fields = data.error?.fields;

      // 필드별 에러가 있으면 첫 번째 필드 에러 메시지 사용
      if (fields) {
        const firstFieldError = Object.values(fields)[0];
        throw new Error(firstFieldError || errorMsg);
      }

      throw new Error(errorMsg);
    }

    return data.data;
  }

  static async refreshToken(): Promise<RefreshTokenResponse> {
    const res = await fetch(`${API_BASE_URL}/api/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 🍪 리프레시 토큰은 쿠키에 있음
    });

    const data: ApiResponse<RefreshTokenResponse> = await res.json();

    if (!data.success || !data.data) {
      throw new Error(data.error?.message || "토큰 갱신 실패");
    }

    return data.data;
  }

  static async logout(accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data: ApiResponse = await res.json();

    if (!data.success && data.error) {
      throw new Error(data.error.message || "로그아웃 실패");
    }
  }

  static async signOut(accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data: ApiResponse = await res.json();

    if (!data.success && data.error) {
      throw new Error(data.error.message || "계정 삭제 실패");
    }
  }
}

export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = "blockcloud_access_token";
  private static readonly REFRESH_TOKEN_KEY = "blockcloud_refresh_token";
  private static readonly USER_KEY = "blockcloud_user";

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

    // 기존 중복 키들도 정리
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
  }

  static hasValidTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}
