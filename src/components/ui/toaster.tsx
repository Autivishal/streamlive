"use client";

import { useState, createContext, useContext, ReactNode, useCallback } from "react";

interface Toast { id: string; title: string; description?: string; variant?: "default" | "destructive"; }

const ToastCtx = createContext<{
    toasts: Toast[];
    toast: (t: Omit<Toast, "id">) => void;
    dismiss: (id: string) => void;
}>({ toasts: [], toast: () => { }, dismiss: () => { } });

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toast = useCallback((t: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { ...t, id }]);
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
    }, []);
    const dismiss = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), []);
    return <ToastCtx.Provider value={{ toasts, toast, dismiss }}>{children}</ToastCtx.Provider>;
}

export function useToast() { return useContext(ToastCtx); }

export function Toaster() {
    const { toasts, dismiss } = useContext(ToastCtx);
    if (!toasts.length) return null;
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs w-full">
            {toasts.map(t => (
                <div key={t.id} onClick={() => dismiss(t.id)} className={`cursor-pointer px-4 py-3 rounded-xl border text-sm shadow-lg transition-all ${t.variant === "destructive" ? "bg-red-900/80 border-red-500/30 text-red-200" : "bg-[#1e1e2e] border-white/10 text-white"}`}>
                    {t.title && <p className="font-medium">{t.title}</p>}
                    {t.description && <p className="text-white/60 text-xs mt-0.5">{t.description}</p>}
                </div>
            ))}
        </div>
    );
}
