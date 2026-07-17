"use client";

import { useEffect, useState } from "react";
import { subscribeToIntakeInsert } from "@/lib/store";
import { UserPlus, X } from "lucide-react";

const STORAGE_KEY = "intake_badge_count";

export function getIntakeBadgeCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
}

export function resetIntakeBadge(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "0");
  window.dispatchEvent(new CustomEvent("intake-badge-update", { detail: 0 }));
}

type Toast = { id: number; nome: string; categoria: string };

export default function IntakeNotifier() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = subscribeToIntakeInsert((nome, categoria) => {
      // Aggiorna badge count in localStorage
      const current = getIntakeBadgeCount();
      const next = current + 1;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent("intake-badge-update", { detail: next }));

      // Browser notification (se permesso concesso)
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Nuovo infortunio segnalato", {
          body: `${nome}${categoria ? ` · ${categoria}` : ""}`,
          icon: "/logo.png",
        });
      }

      // Toast in-app
      const id = Date.now();
      setToasts((prev) => [...prev, { id, nome, categoria }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    });

    // Chiedi permesso browser notification al primo caricamento
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div key={t.id}
          className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-8 h-8 rounded-xl bg-[#C8102E] flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Nuovo infortunio segnalato</p>
            <p className="text-sm font-bold truncate">{t.nome}</p>
            {t.categoria && <p className="text-xs text-white/50">{t.categoria}</p>}
          </div>
          <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-white/40 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
