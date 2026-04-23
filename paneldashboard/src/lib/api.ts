import axios, { AxiosError, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import type { ApiError, ApiResponse, Paginated } from "@/types/common.types";
import type { AuthTokens, LoginCredentials } from "@/types/auth.types";
import type {
  ChangeUserStatusPayload,
  ChangeUserStatusResponse,
  ListUsersParams,
  UpdateUserPayload,
  User,
} from "@/types/user.types";
import type {
  ChangeRestaurantStatusPayload,
  ChangeRestaurantStatusResponse,
  ListRestaurantsParams,
  RejectApplicationPayload,
  Restaurant,
  RestaurantApplication,
  UpdateRestaurantPayload,
} from "@/types/restaurant.types";
import type {
  ChangeAgentStatusPayload,
  ChangeAgentStatusResponse,
  DeliveryAgent,
  DeliveryApplication,
  ListAgentsParams,
  RejectAgentApplicationPayload,
  UpdateAgentPayload,
} from "@/types/delivery.types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const ACCESS_TOKEN_COOKIE = "panel_access_token";
export const REFRESH_TOKEN_COOKIE = "panel_refresh_token";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get(ACCESS_TOKEN_COOKIE);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      Cookies.remove(ACCESS_TOKEN_COOKIE);
      Cookies.remove(REFRESH_TOKEN_COOKIE);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Extracts the backend Arabic message from an axios error, falling back gracefully. */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return fallback;
}

/** Unwraps the backend envelope `{ data, message }` into the typed payload. */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  loginManager: (credentials: LoginCredentials) =>
    api.post<ApiResponse<AuthTokens>>("/auth/manager/login", credentials),
  logout: (refreshToken: string) =>
    api.delete<ApiResponse<null>>("/auth/logout", { data: { refreshToken } }),
};

// ─── Users (auth-service) ────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: ListUsersParams) =>
    api.get<ApiResponse<Paginated<User>>>("/auth/manager/users", { params }),
  getOne: (id: string) =>
    api.get<ApiResponse<User>>(`/auth/manager/users/${id}`),
  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<ApiResponse<User>>(`/auth/manager/users/${id}`, payload),
  changeStatus: (id: string, payload: ChangeUserStatusPayload) =>
    api.patch<ApiResponse<ChangeUserStatusResponse>>(
      `/auth/manager/users/${id}/status`,
      payload,
    ),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/auth/manager/users/${id}`),

  /** @deprecated prototype shim — use `list` with typed params */
  getAll: (params?: object) => api.get("/auth/manager/users", { params }),
  /** @deprecated prototype shim — backend has no `isActive` flag; use `changeStatus` */
  toggleStatus: (_id: string, _isActive: boolean) =>
    Promise.reject(
      new Error("toggleStatus is unsupported — call changeStatus({ status })"),
    ),
};

// ─── Restaurants (restaurant-service) ────────────────────────────────────────
export const restaurantsApi = {
  // Applications
  listApplications: () =>
    api.get<ApiResponse<RestaurantApplication[]>>(
      "/restaurant/manager/applications",
    ),
  approveApplication: (id: string) =>
    api.patch<ApiResponse<null>>(
      `/restaurant/manager/applications/${id}/approve`,
    ),
  rejectApplication: (id: string, payload: RejectApplicationPayload) =>
    api.patch<ApiResponse<null>>(
      `/restaurant/manager/applications/${id}/reject`,
      payload,
    ),

  // Restaurants
  list: (params?: ListRestaurantsParams) =>
    api.get<ApiResponse<Paginated<Restaurant>>>(
      "/restaurant/manager/restaurants",
      { params },
    ),
  getOne: (id: string) =>
    api.get<ApiResponse<Restaurant>>(`/restaurant/manager/restaurants/${id}`),
  update: (id: string, payload: UpdateRestaurantPayload) =>
    api.patch<ApiResponse<Restaurant>>(
      `/restaurant/manager/restaurants/${id}`,
      payload,
    ),
  changeStatus: (id: string, payload: ChangeRestaurantStatusPayload) =>
    api.patch<ApiResponse<ChangeRestaurantStatusResponse>>(
      `/restaurant/manager/restaurants/${id}/status`,
      payload,
    ),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/restaurant/manager/restaurants/${id}`),
};

// ─── Delivery agents (delivery-service) ──────────────────────────────────────
export const deliveryApi = {
  // Applications
  listApplications: () =>
    api.get<ApiResponse<DeliveryApplication[]>>(
      "/delivery/manager/applications",
    ),
  approveApplication: (id: string) =>
    api.patch<ApiResponse<null>>(
      `/delivery/manager/applications/${id}/approve`,
    ),
  rejectApplication: (id: string, payload: RejectAgentApplicationPayload) =>
    api.patch<ApiResponse<null>>(
      `/delivery/manager/applications/${id}/reject`,
      payload,
    ),

  // Agents
  list: (params?: ListAgentsParams) =>
    api.get<ApiResponse<Paginated<DeliveryAgent>>>(
      "/delivery/manager/agents",
      { params },
    ),
  getOne: (id: string) =>
    api.get<ApiResponse<DeliveryAgent>>(`/delivery/manager/agents/${id}`),
  update: (id: string, payload: UpdateAgentPayload) =>
    api.patch<ApiResponse<DeliveryAgent>>(
      `/delivery/manager/agents/${id}`,
      payload,
    ),
  changeStatus: (id: string, payload: ChangeAgentStatusPayload) =>
    api.patch<ApiResponse<ChangeAgentStatusResponse>>(
      `/delivery/manager/agents/${id}/status`,
      payload,
    ),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/delivery/manager/agents/${id}`),
};

// ─── Legacy aliases kept for existing pages ──────────────────────────────────
/** @deprecated prototype shim — use `restaurantsApi` instead */
export const adminRestaurantsApi = {
  ...restaurantsApi,
  getAll: (params?: object) => api.get("/restaurant/manager/restaurants", { params }),
  approve: (id: string) =>
    api.patch(`/restaurant/manager/applications/${id}/approve`),
  suspend: (id: string, reason?: string) =>
    api.patch(`/restaurant/manager/applications/${id}/reject`, { reason }),
};

export const adminOrdersApi = {
  getAll: (params?: object) => api.get("/admin/orders", { params }),
  getOne: (id: string) => api.get(`/admin/orders/${id}`),
};
export const settingsApi = {
  get: () => api.get("/admin/settings"),
  update: (data: object) => api.patch("/admin/settings", data),
};
export const statsApi = {
  overview: () => api.get("/admin/stats/overview"),
};
