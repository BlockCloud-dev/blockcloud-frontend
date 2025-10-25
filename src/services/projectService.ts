// src/services/projectService.ts
import { useProjectStore } from "../stores/projectStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function createProject(name: string, description: string) {
  const accessToken = localStorage.getItem("accessToken"); // ✅ 토큰 가져오기

  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }), // ✅ 토큰 헤더 추가
    },
    body: JSON.stringify({ name, description }),
    credentials: "include", // refreshToken 쿠키도 함께 보냄
  });

  if (!response.ok) {
    throw new Error("프로젝트 생성 실패");
  }

  const data = await response.json();
  if (data.success && data.data) {
    useProjectStore.getState().loadProject(data.data); // store에 저장
    return data.data;
  }
  throw new Error(data.error?.message || "프로젝트 생성 실패");
}
