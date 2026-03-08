/**
 * API client for the Auto-GC backend.
 */

const API_BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  return res.json();
}

export const api = {
  projects: {
    list: () => request<import("@/types").Project[]>("/projects/"),
    get: (id: string) => request<import("@/types").Project>(`/projects/${id}`),
    create: (data: Record<string, unknown>) =>
      request<import("@/types").Project>("/projects/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  milestones: {
    list: (projectId: string) =>
      request<import("@/types").Milestone[]>(`/projects/${projectId}/milestones`),
    create: (projectId: string, data: Record<string, unknown>) =>
      request<import("@/types").Milestone>(`/projects/${projectId}/milestones`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: string, milestoneId: string, data: Record<string, unknown>) =>
      request<import("@/types").Milestone>(
        `/projects/${projectId}/milestones/${milestoneId}`,
        { method: "PATCH", body: JSON.stringify(data) }
      ),
  },
  inbox: {
    list: (params?: { project_id?: string; status?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.project_id) searchParams.set("project_id", params.project_id);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const qs = searchParams.toString();
      return request<import("@/types").InboxItem[]>(`/inbox/${qs ? `?${qs}` : ""}`);
    },
  },
};
