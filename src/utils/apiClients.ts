const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  let accessToken = localStorage.getItem("accessToken");

  // 1. 첫 요청
  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  // 2. accessToken 만료 → refresh 시도
  if (res.status === 401) {
    console.warn("🔁 accessToken 만료 → refresh 시도");

    const refreshRes = await fetch(`${API_BASE_URL}/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!refreshRes.ok) {
      console.error("❌ refresh token도 만료됨. 로그인 필요");
      localStorage.removeItem("accessToken");
      throw new Error("로그인이 만료되었습니다.");
    }

    const { accessToken: newAccessToken } = await refreshRes.json();
    localStorage.setItem("accessToken", newAccessToken);
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API 요청 실패");
  }

  // 🔁 Content-Length가 0일 수도 있음
  const contentType = res.headers.get("Content-Type");
  if (
    res.status === 204 ||
    !contentType ||
    contentType.indexOf("application/json") === -1
  ) {
    return null;
  }

  return res.json();
};

export const logout = async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("로그아웃 실패");
  }
};
