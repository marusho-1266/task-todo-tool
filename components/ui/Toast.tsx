"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "error" | "success" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const styles =
            toast.type === "success"
              ? {
                  background: "var(--color-actual-soft)",
                  borderColor: "var(--color-actual)",
                  color: "var(--color-actual)",
                }
              : toast.type === "error"
                ? {
                    background: "var(--color-warn-soft)",
                    borderColor: "var(--color-warn-border)",
                    color: "var(--color-warn)",
                  }
                : {
                    background: "var(--color-paper)",
                    borderColor: "var(--color-rule)",
                    color: "var(--color-ink)",
                  };

          return (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto max-w-sm rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium shadow-lg"
            style={{
              ...styles,
              fontFamily: "var(--font-body)",
            }}
          >
            {toast.message}
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
