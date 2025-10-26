import { TokenStorage } from "../services/authService";
import type { ApiResponse } from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  let accessToken = TokenStorage.getAccessToken();

  // 1. 첫 요청
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // 기존 headers 복사
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // 2. accessToken 만료 → refresh 시도
  if (res.status === 401) {
    console.warn("🔁 accessToken 만료 → refresh 시도");

    const refreshRes = await fetch(`${API_BASE_URL}/api/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!refreshRes.ok) {
      console.error("❌ refresh token도 만료됨. 로그인 필요");
      TokenStorage.clearAll();
      throw new Error("로그인이 만료되었습니다.");
    }

    const refreshData: ApiResponse = await refreshRes.json();

    if (!refreshData.success || !refreshData.data) {
      console.error("❌ refresh token 갱신 실패");
      TokenStorage.clearAll();
      throw new Error(refreshData.error?.message || "로그인이 만료되었습니다.");
    }

    const newAccessToken = refreshData.data.accessToken;
    TokenStorage.saveTokens(newAccessToken, TokenStorage.getRefreshToken() || "");
    accessToken = newAccessToken;

    // 원래 요청 재시도
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  }

  // 3. 최종 응답 처리 (빈 응답도 대응)
  const contentType = res.headers.get("Content-Type");
  if (
    res.status === 204 ||
    !contentType ||
    contentType.indexOf("application/json") === -1
  ) {
    return null;
  }

  const data: ApiResponse = await res.json();

  // 4. success: false인 경우 에러 처리
  if (!data.success && data.error) {
    const errorMsg = data.error.message || "API 요청 실패";
    const fields = data.error.fields;

    if (fields) {
      const fieldErrors = Object.values(fields).join(", ");
      throw new Error(fieldErrors || errorMsg);
    }

    throw new Error(errorMsg);
  }

  return data.data || data;
};

export const logout = async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data: ApiResponse = await res.json();

  if (!data.success && data.error) {
    throw new Error(data.error.message || "로그아웃 실패");
  }
};
