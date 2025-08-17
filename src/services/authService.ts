import type {
  LoginResponse,
  RefreshTokenResponse,
  LoginRequest,
  User,
} from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export class AuthService {
  static async loginWithEmail(
    credentials: LoginRequest
  ): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    if (!res.ok) throw new Error("로그인 실패");
    return res.json();
  }

  static async refreshToken(): Promise<RefreshTokenResponse> {
    const res = await fetch(`${API_BASE_URL}/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 🍪 리프레시 토큰은 쿠키에 있음
    });

    if (!res.ok) throw new Error("토큰 갱신 실패");
    return res.json(); // { accessToken: string, user: User }
  }

  static async logout(accessToken: string): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  }

  static async signOut(accessToken: string): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/sign-out`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
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
    localStorage.removeItem("isLoggedIn"); // 기존 임시 키도 정리
  }

  static hasValidTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}
