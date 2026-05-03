"use client";
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

let sharedSocket: Socket | null = null;

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Reuse a single connection per tab
    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(GATEWAY_URL, {
        auth: { token: `Bearer ${accessToken}` },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });
    }

    socketRef.current = sharedSocket;

    return () => {
      // Don't disconnect on unmount — keep the shared connection alive
    };
  }, [accessToken]);

  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      socketRef.current?.on(event, handler);
      return () => socketRef.current?.off(event, handler);
    },
    [],
  );

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const joinOrder = useCallback((orderId: string) => {
    socketRef.current?.emit("order:join", { orderId });
  }, []);

  const leaveOrder = useCallback((orderId: string) => {
    socketRef.current?.emit("order:leave", { orderId });
  }, []);

  const registerRestaurant = useCallback((restaurantId: string) => {
    socketRef.current?.emit("restaurant:register", { restaurantId });
  }, []);

  return { socket: socketRef.current, on, emit, joinOrder, leaveOrder, registerRestaurant };
}
