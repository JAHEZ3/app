import axios from "axios";
import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("panel_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("panel_access_token");
      Cookies.remove("panel_refresh_token");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/manager/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// ── Users ────────────────────────────────────────────────
export const usersApi = {
  getAll: (params?: object) => api.get("/admin/users", { params }),
  getOne: (id: string) => api.get(`/admin/users/${id}`),
  update: (id: string, data: object) => api.patch(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/admin/users/${id}/status`, { isActive }),
};

// ── Restaurants ──────────────────────────────────────────
export const adminRestaurantsApi = {
  getAll: (params?: object) => api.get("/admin/restaurants", { params }),
  getOne: (id: string) => api.get(`/admin/restaurants/${id}`),
  approve: (id: string) => api.patch(`/admin/restaurants/${id}/approve`),
  suspend: (id: string, reason?: string) =>
    api.patch(`/admin/restaurants/${id}/suspend`, { reason }),
  delete: (id: string) => api.delete(`/admin/restaurants/${id}`),
};

// ── Orders ───────────────────────────────────────────────
export const adminOrdersApi = {
  getAll: (params?: object) => api.get("/admin/orders", { params }),
  getOne: (id: string) => api.get(`/admin/orders/${id}`),
};

// ── Settings ─────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get("/admin/settings"),
  update: (data: object) => api.patch("/admin/settings", data),
};

// ── Stats ─────────────────────────────────────────────────
export const statsApi = {
  overview: () => api.get("/admin/stats/overview"),
};
