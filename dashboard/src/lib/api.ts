import axios from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/authStore";
import { navigateTo } from "@/lib/navigation";

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message[0];
    if (typeof data?.error === "string") return data.error;
  }
  if (err instanceof Error) return err.message;
  return "حدث خطأ، يرجى المحاولة مرة أخرى";
}

export function normalizeTokens(
  payload: unknown
): { accessToken: string; refreshToken: string } | null {
  const root = payload as Record<string, unknown> | null | undefined;
  // Unwrap { success, data: {...} } envelope if present
  const d = (root?.data ?? root) as Record<string, unknown> | null | undefined;
  const accessToken  = (d?.accessToken  ?? d?.access_token)  as string | undefined;
  const refreshToken = (d?.refreshToken ?? d?.refresh_token) as string | undefined;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004";
const RESTAURANT_URL = process.env.NEXT_PUBLIC_RESTAURANT_URL || "http://localhost:3003";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const restaurantInstance = axios.create({
  baseURL: RESTAURANT_URL,
  headers: { "Content-Type": "application/json" },
});

// Shared request interceptor: attach accessToken from Zustand + strip Content-Type for FormData
function attachToken(config: import("axios").InternalAxiosRequestConfig) {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers["Content-Type"];
  return config;
}

api.interceptors.request.use(attachToken);
restaurantInstance.interceptors.request.use(attachToken);

// Token refresh state
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (t: string) => void;
  reject: (e: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
}

function redirectToLogin() {
  navigateTo("/login");
}

// Shared 401 refresh handler used by both axios instances
async function handle401(
  error: import("axios").AxiosError,
  retryInstance: typeof api
) {
  const original = error.config!;
  if (error.response?.status !== 401 || (original as unknown as Record<string, unknown>)._retry) {
    return Promise.reject(error);
  }

  const refreshToken = Cookies.get("refresh_token");
  if (!refreshToken) {
    redirectToLogin();
    return Promise.reject(error);
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({
        resolve: (token) => {
          original.headers!.Authorization = `Bearer ${token}`;
          resolve(retryInstance(original));
        },
        reject,
      });
    });
  }

  (original as unknown as Record<string, unknown>)._retry = true;
  isRefreshing = true;

  try {
    const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
    const tokens = normalizeTokens(data);
    if (!tokens) throw new Error("No tokens in refresh response");
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
    flushQueue(null, tokens.accessToken);
    original.headers!.Authorization = `Bearer ${tokens.accessToken}`;
    return retryInstance(original);
  } catch (refreshError) {
    flushQueue(refreshError, null);
    useAuthStore.getState().logout();
    redirectToLogin();
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}

api.interceptors.response.use((res) => res, (err) => handle401(err, api));
restaurantInstance.interceptors.response.use((res) => res, (err) => handle401(err, restaurantInstance));

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  registerRestaurant: (phone: string) =>
    api.post("/api/auth/restaurant/register", { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post("/api/auth/verify-otp", { phone, otp }),

  resendOtp: (phone: string) => api.post("/api/auth/resend-otp", { phone }),

  loginRestaurant: (phone: string, password: string) =>
    api.post("/api/auth/restaurant/login", { phone, password }),

  forgotPassword: (phone: string) =>
    api.post("/api/auth/forgot-password", { phone }),

  resetPassword: (phone: string, otp: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { phone, otp, newPassword }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { oldPassword, newPassword }),

  refresh: (refreshToken: string) =>
    api.post("/api/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    api.delete("/api/auth/logout", { data: { refreshToken } }),

  listSessions: (refreshToken?: string) =>
    api.get("/api/auth/sessions", {
      params: refreshToken ? { refreshToken } : undefined,
    }),

  revokeSession: (id: string) => api.delete(`/api/auth/sessions/${id}`),

  revokeOtherSessions: (refreshToken: string) =>
    api.delete("/api/auth/sessions", { data: { refreshToken } }),
};

// ── Restaurant (port 3003) ────────────────────────────────────────────────────
export const restaurantApi = {
  completeProfile: (data: FormData) =>
    restaurantInstance.post("/api/restaurant/profile", data),

  getProfile: () => restaurantInstance.get("/api/restaurant/profile"),

  updateProfile: (data: object) =>
    restaurantInstance.patch("/api/restaurant/profile", data),

  updateSettings: (data: object) =>
    restaurantInstance.patch("/api/restaurant/settings", data),

  toggleOpen: () => restaurantInstance.patch("/api/restaurant/toggle-open"),

  getHours: () => restaurantInstance.get("/api/restaurant/hours"),

  setHours: (
    hours: { dayOfWeek: number; openTime: string; closeTime: string }[],
  ) => restaurantInstance.post("/api/restaurant/hours", { hours }),

  getPublicList: (city?: string) =>
    restaurantInstance.get("/api/restaurant", { params: city ? { city } : undefined }),

  getPublicById: (id: string) => restaurantInstance.get(`/api/restaurant/${id}`),

  getDashboardStats: () => restaurantInstance.get("/api/restaurant/me/stats"),

  getSalesData: (period: "daily" | "weekly" | "monthly") =>
    restaurantInstance.get(`/api/restaurant/me/sales?period=${period}`),

  getTopMeals: () => restaurantInstance.get("/api/restaurant/me/top-meals"),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll: (params?: object) => api.get("/api/orders", { params }),
  getOne: (id: string) => api.get(`/api/orders/${id}`),
  updateStatus: (id: string, data: object) =>
    api.patch(`/api/orders/${id}/status`, data),
};

// ── Menus / Sections / Meals / Option groups / Options (restaurant-service) ───
// All live under the restaurant service on port 3003.
export const menuApi = {
  // Menus
  listMenus: () => restaurantInstance.get("/api/restaurant/menus"),
  createMenu: (data: object) =>
    restaurantInstance.post("/api/restaurant/menus", data),
  updateMenu: (menuId: string, data: object) =>
    restaurantInstance.patch(`/api/restaurant/menus/${menuId}`, data),
  deleteMenu: (menuId: string) =>
    restaurantInstance.delete(`/api/restaurant/menus/${menuId}`),

  // Sections (list/create are menu-scoped; update/delete are flat)
  listSections: (menuId: string) =>
    restaurantInstance.get(`/api/restaurant/menus/${menuId}/sections`),
  createSection: (menuId: string, data: object) =>
    restaurantInstance.post(`/api/restaurant/menus/${menuId}/sections`, data),
  updateSection: (sectionId: string, data: object) =>
    restaurantInstance.patch(`/api/restaurant/sections/${sectionId}`, data),
  deleteSection: (sectionId: string) =>
    restaurantInstance.delete(`/api/restaurant/sections/${sectionId}`),
};

export const mealsApi = {
  list: (sectionId: string) =>
    restaurantInstance.get(`/api/restaurant/sections/${sectionId}/meals`),
  create: (data: object) =>
    restaurantInstance.post("/api/restaurant/meals", data),
  update: (mealId: string, data: object) =>
    restaurantInstance.patch(`/api/restaurant/meals/${mealId}`, data),
  delete: (mealId: string) =>
    restaurantInstance.delete(`/api/restaurant/meals/${mealId}`),
  // Backend flips the flag server-side; no body needed.
  toggleAvailability: (mealId: string) =>
    restaurantInstance.patch(
      `/api/restaurant/meals/${mealId}/toggle-availability`,
    ),
};

export const optionGroupsApi = {
  list: (mealId: string) =>
    restaurantInstance.get(`/api/restaurant/meals/${mealId}/option-groups`),
  create: (mealId: string, data: object) =>
    restaurantInstance.post(
      `/api/restaurant/meals/${mealId}/option-groups`,
      data,
    ),
  update: (groupId: string, data: object) =>
    restaurantInstance.patch(`/api/restaurant/option-groups/${groupId}`, data),
  delete: (groupId: string) =>
    restaurantInstance.delete(`/api/restaurant/option-groups/${groupId}`),
};

export const optionsApi = {
  list: (groupId: string) =>
    restaurantInstance.get(
      `/api/restaurant/option-groups/${groupId}/options`,
    ),
  create: (groupId: string, data: object) =>
    restaurantInstance.post(
      `/api/restaurant/option-groups/${groupId}/options`,
      data,
    ),
  update: (optionId: string, data: object) =>
    restaurantInstance.patch(`/api/restaurant/options/${optionId}`, data),
  delete: (optionId: string) =>
    restaurantInstance.delete(`/api/restaurant/options/${optionId}`),
};
