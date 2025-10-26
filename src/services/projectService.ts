// src/services/projectService.ts
import { useProjectStore } from "../stores/projectStore";
import { TokenStorage } from "./authService";
import type { ApiResponse } from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function createProject(name: string, description: string) {
  const accessToken = TokenStorage.getAccessToken();

  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify({ name, description }),
    credentials: "include",
  });

  const data: ApiResponse = await response.json();

  if (!data.success || !data.data) {
    const errorMsg = data.error?.message || "프로젝트 생성 실패";
    const fields = data.error?.fields;

    // 필드별 에러가 있으면 사용자에게 친절하게 표시
    if (fields) {
      const fieldErrors = Object.values(fields).join(", ");
      throw new Error(fieldErrors || errorMsg);
    }

    throw new Error(errorMsg);
  }

  useProjectStore.getState().loadProject(data.data);
  return data.data;
}
