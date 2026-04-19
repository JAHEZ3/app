import axios from "axios";
import { useToken } from "@/store/useToken";

export const authApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_AUTH,
    timeout: 10000,
});

export const customerApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_CUSTOMER,
    timeout: 10000,
});

customerApi.interceptors.request.use((config) => {
    const token = useToken.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});