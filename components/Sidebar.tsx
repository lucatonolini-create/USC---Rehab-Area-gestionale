"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  TrendingUp,
  Settings,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/atleti", label: "Atleti", icon: Users },
  { href: "/appuntamenti", label: "Appuntamenti", icon: Calendar },
  { href: "/esercizi", label: "Programmi", icon: Dumbbell },
  { href: "/progressi", label: "Progressi", icon: TrendingUp },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

// Grigio scuro e rosso — colori USC Cremonese
const BG = "#2B2B2B";
const RED = "#C8102E";
const ACTIVE_TEXT = "#ffffff";

export default function Sidebar() {
  const pathname = usePathname();
  const [aperto, setAperto] = useState(false);

  useEffect(() => { setAperto(false); }, [pathname]);

  return (
    <>
      {/* Overlay mobile */}
      {aperto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setAperto(false)}
        />
      )}

      {/* Bottone hamburger mobile */}
      {!aperto && (
        <button
          onClick={() => setAperto(true)}
          className="fixed top-4 left-4 z-50 md:hidden text-white p-2.5 rounded-xl shadow-lg"
          style={{ backgroundColor: RED }}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          md:static md:translate-x-0
          ${aperto ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ backgroundColor: BG }}
      >
        {/* Header con logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 p-1">
              <Image
                src="/logo.png"
                alt="USC Cremonese"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">USC Cremonese</h1>
              <p className="text-white/50 text-xs">Rehab Area</p>
            </div>
          </div>
          <button
            onClick={() => setAperto(false)}
            className="md:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm font-medium"
                style={
                  isActive
                    ? { backgroundColor: RED, color: ACTIVE_TEXT }
                    : { color: "rgba(255,255,255,0.65)" }
                }
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: RED }}
            >
              S
            </div>
            <div>
              <p className="text-sm font-medium text-white">Staff Medico</p>
              <p className="text-white/40 text-xs">USC Cremonese</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
