// src/services/projectService.ts
import { useProjectStore } from "../stores/projectStore";
import { apiFetch } from "../utils/apiClients";

export async function createProject(name: string, description: string) {
  // apiFetch는 이미 토큰 갱신 및 에러 처리를 포함하고 있음
  // 응답: {success: true, data: {id, name, description, ...}} -> apiFetch가 data 부분만 반환
  const project = await apiFetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  // project는 이미 unwrapped된 {id, name, description, createdAt, updatedAt}
  useProjectStore.getState().loadProject(project);
  return project;
}
