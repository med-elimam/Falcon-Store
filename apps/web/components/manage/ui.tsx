"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SessionUserDTO } from "@falcon/shared";
import { api, ApiError } from "@/lib/client-api";

/* ── جلسة المستخدم الإداري ─────────────────────────────── */

interface MeState {
  status: "loading" | "authed" | "guest";
  user: SessionUserDTO | null;
  refresh: () => void;
}

const MeContext = createContext<MeState>({ status: "loading", user: null, refresh: () => undefined });

export function MeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<MeState, "refresh">>({ status: "loading", user: null });
  const refresh = useCallback(() => {
    api<{ user: SessionUserDTO }>("/api/v1/auth/me", { timeoutMs: 8000 })
      .then((r) => setState({ status: "authed", user: r.user }))
      .catch(() => setState({ status: "guest", user: null }));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return <MeContext.Provider value={{ ...state, refresh }}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  return useContext(MeContext);
}

export function useCan() {
  const { user } = useMe();
  return useCallback((perm: string) => user?.permissions.includes(perm as never) ?? false, [user]);
}

/* ── تنبيهات ──────────────────────────────────────────── */

interface ToastState {
  push: (message: string, tone?: "ok" | "error") => void;
}
const ToastContext = createContext<ToastState>({ push: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const timer = useRef<number>(0);
  const push = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toast && (
        <div className="manage-toast" role="status" data-tone={toast.tone === "error" ? "error" : undefined}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  return useContext(ToastContext);
}

/* ── جلب بيانات إداري موحّد ───────────────────────────── */

export function useAdminData<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const { refresh: refreshMe } = useMe();
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setState((s) => ({ ...s, loading: true, error: null }));
        return api<T>(path);
      })
      .then((r) => {
        if (active) setState({ data: r, error: null, loading: false });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) refreshMe();
        setState((s) => ({
          ...s,
          error: err instanceof ApiError ? err.message : "تعذر تحميل البيانات.",
          loading: false,
        }));
      });
    return () => {
      active = false;
    };
  }, [path, tick, refreshMe]);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}

/* ── عناصر عرض ────────────────────────────────────────── */

export function LoadingBlock({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="manage-loading" role="status">
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="manage-error">
      <p>{message}</p>
      <button className="btn btn-ghost" onClick={onRetry}>
        إعادة المحاولة
      </button>
    </div>
  );
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="manage-empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function Chip({ tone, children }: { tone?: "good" | "warn" | "bad" | "info"; children: ReactNode }) {
  return (
    <span className="status-chip" data-tone={tone}>
      {children}
    </span>
  );
}

/** زر حذف/إجراء حساس بتأكيد على نقرتين — بلا نوافذ متصفح خام. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = "btn btn-ghost",
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = window.setTimeout(() => setArm(false), 4000);
    return () => window.clearTimeout(t);
  }, [arm]);
  return (
    <button
      type="button"
      className={className}
      style={arm ? { borderColor: "var(--crimson-hot)", color: "var(--crimson-hot)" } : undefined}
      onClick={() => {
        if (arm) {
          setArm(false);
          onConfirm();
        } else {
          setArm(true);
        }
      }}
    >
      {arm ? confirmLabel : label}
    </button>
  );
}

/** لوحة جانبية للنماذج مع Escape وقفل تمرير. */
export function DrawerForm({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="drawer-form" role="dialog" aria-modal="true" aria-label={title}>
      <button className="drawer-scrim" onClick={onClose} aria-label="إغلاق" tabIndex={-1} />
      <div className="panel">
        <div className="panel-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
