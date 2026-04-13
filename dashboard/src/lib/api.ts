import axios from "axios";
import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/gateway";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  logout: () =>
    api.post("/auth/logout"),
  me: () =>
    api.get("/auth/me"),
};

// ── Restaurant ──────────────────────────────────────────
export const restaurantApi = {
  getMe: () =>
    api.get("/restaurant/me"),
  update: (data: object) =>
    api.patch("/restaurant/me", data),
  toggleOpen: (isOpen: boolean) =>
    api.patch("/restaurant/me/status", { isOpen }),
  getHours: () =>
    api.get("/restaurant/me/hours"),
  updateHour: (data: object) =>
    api.put("/restaurant/me/hours", data),
  getDashboardStats: () =>
    api.get("/restaurant/me/stats"),
  getSalesData: (period: "daily" | "weekly" | "monthly") =>
    api.get(`/restaurant/me/sales?period=${period}`),
  getTopMeals: () =>
    api.get("/restaurant/me/top-meals"),
};

// ── Orders ──────────────────────────────────────────────
export const ordersApi = {
  getAll: (params?: object) =>
    api.get("/orders", { params }),
  getOne: (id: string) =>
    api.get(`/orders/${id}`),
  updateStatus: (id: string, data: object) =>
    api.patch(`/orders/${id}/status`, data),
};

// ── Menu ────────────────────────────────────────────────
export const menuApi = {
  getAll: () =>
    api.get("/menu"),
  createMenu: (data: object) =>
    api.post("/menu", data),
  updateMenu: (id: string, data: object) =>
    api.patch(`/menu/${id}`, data),
  deleteMenu: (id: string) =>
    api.delete(`/menu/${id}`),
  createSection: (data: object) =>
    api.post("/menu/sections", data),
  updateSection: (id: string, data: object) =>
    api.patch(`/menu/sections/${id}`, data),
  deleteSection: (id: string) =>
    api.delete(`/menu/sections/${id}`),
};

// ── Meals ───────────────────────────────────────────────
export const mealsApi = {
  create: (data: object) =>
    api.post("/meals", data),
  update: (id: string, data: object) =>
    api.patch(`/meals/${id}`, data),
  delete: (id: string) =>
    api.delete(`/meals/${id}`),
  toggleAvailability: (id: string, isAvailable: boolean) =>
    api.patch(`/meals/${id}/availability`, { isAvailable }),
};
