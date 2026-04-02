import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("dc-auth");
      if (raw) {
        const state = JSON.parse(raw);
        const token = state?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dc-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── API helpers ────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),
  me: () => api.get("/users/me/"),
  register: (data: { email: string; name: string; password: string }) =>
    api.post("/auth/register/", data),
};

export const connectionsApi = {
  list: () => api.get("/connections/"),
  create: (data: any) => api.post("/connections/", data),
  update: (id: number, data: any) => api.patch(`/connections/${id}/`, data),
  delete: (id: number) => api.delete(`/connections/${id}/`),
  test: (id: number) => api.post(`/connections/${id}/test/`),
  tables: (id: number) => api.get(`/connections/${id}/tables/`),
  preview: (id: number, query: string) => api.post(`/connections/${id}/preview/`, { query }),
};

export const batchApi = {
  list: () => api.get("/batch-jobs/"),
  create: (data: { connection: number; query: string; batch_size: number }) =>
    api.post("/batch-jobs/", data),
  status: (id: number) => api.get(`/batch-jobs/${id}/status/`),
  delete: (id: number) => api.delete(`/batch-jobs/${id}/`),
};

export const recordsApi = {
  list: (jobId: number) => api.get(`/records/?job=${jobId}`),
  patch: (id: number, data: { edited_data: any; is_edited: boolean }) =>
    api.patch(`/records/${id}/`, data),
  submit: (recordIds: number[], format: "json" | "csv") =>
    api.post("/records/submit/", { record_ids: recordIds, format }),
};

export const filesApi = {
  list: () => api.get("/files/"),
  download: (id: number) => api.get(`/files/${id}/download/`, { responseType: "blob" }),
  share: (fileId: number, sharedWith: number) =>
    api.post("/file-shares/", { file: fileId, shared_with: sharedWith }),
};

export const usersApi = {
  list: () => api.get("/users/"),
};
