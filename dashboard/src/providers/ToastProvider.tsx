"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import * as Toast from "@radix-ui/react-toast";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-l-4 border-green-500 bg-white",
  error:   "border-l-4 border-red-500 bg-white",
  info:    "border-l-4 border-blue-500 bg-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, title: string, description?: string) => {
    setToasts((prev) => [...prev, { id: nextId++, type, title, description }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    success: (t, d) => push("success", t, d),
    error:   (t, d) => push("error", t, d),
    info:    (t, d) => push("info", t, d),
  };

  return (
    <ToastContext.Provider value={ctx}>
      <Toast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) remove(t.id); }}
            duration={4000}
            className={`${TYPE_STYLES[t.type]} rounded-lg shadow-lg p-4 flex flex-col gap-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-full`}
          >
            <Toast.Title className="text-sm font-bold text-foreground">{t.title}</Toast.Title>
            {t.description && (
              <Toast.Description className="text-xs text-muted-foreground">{t.description}</Toast.Description>
            )}
            <Toast.Close className="absolute top-2 left-2 text-muted-foreground hover:text-foreground text-xs">✕</Toast.Close>
          </Toast.Root>
        ))}

        <Toast.Viewport className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-3rem)]" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
