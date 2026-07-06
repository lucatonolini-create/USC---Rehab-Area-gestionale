"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Dumbbell, TrendingUp, Settings, Menu, X, ChevronLeft, BarChart2, Gauge,
} from "lucide-react";

const navItems = [
  { href: "/",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/atleti",       label: "Atleti",       icon: Users },
  { href: "/esercizi",     label: "Programmi",    icon: Dumbbell },
  { href: "/progressi",    label: "Progressi",    icon: TrendingUp },
  { href: "/analisi",      label: "Analisi",      icon: BarChart2 },
  { href: "/performance",  label: "Performance",  icon: Gauge },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

const RED  = "#BE2E50";
const DARK = "#1A2744";

export default function Sidebar() {
  const pathname = usePathname();
  // mobile: aperta/chiusa; desktop: espansa/collassata
  const [mobileAperta, setMobileAperta] = useState(false);
  const [collapsed, setCollapsed]       = useState(false);

  useEffect(() => { setMobileAperta(false); }, [pathname]);

  return (
    <>
      {/* Overlay mobile */}
      {mobileAperta && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileAperta(false)} />
      )}

      {/* Bottone hamburger — mobile, quando sidebar è chiusa */}
      {!mobileAperta && (
        <button onClick={() => setMobileAperta(true)}
          className="fixed top-4 left-4 z-50 md:hidden text-white p-2.5 rounded-xl shadow-lg"
          style={{ backgroundColor: RED }}>
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        style={{ backgroundColor: DARK }}
        className={`
          flex flex-col shadow-2xl text-white shrink-0
          transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 z-40
          md:static md:translate-x-0
          ${mobileAperta ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          ${collapsed ? "md:w-16" : "md:w-64"}
        `}
      >
        {/* Header */}
        <div className={`border-b border-white/10 flex items-center shrink-0 ${collapsed ? "p-3 justify-center" : "p-5 justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 p-0.5">
                <Image src="/logo.png" alt="U.S. Cremonese" width={40} height={40} className="object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-white leading-tight">U.S. Cremonese</h1>
                <p className="text-white/50 text-xs">Rehab Area</p>
              </div>
            </div>
          )}

          {/* Chiudi su mobile */}
          {mobileAperta && !collapsed && (
            <button onClick={() => setMobileAperta(false)} className="md:hidden text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Toggle collapse su desktop */}
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} className="hidden md:flex text-white/60 hover:text-white" title="Espandi menu">
              <Menu className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => setCollapsed(true)} className="hidden md:flex text-white/60 hover:text-white ml-2" title="Nascondi menu">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto space-y-1 ${collapsed ? "p-2" : "p-4"}`}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-xl transition-all duration-150 text-sm font-medium ${
                  collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
                } ${isActive ? "text-white" : "text-white/65 hover:text-white hover:bg-white/10"}`}
                style={isActive ? { backgroundColor: RED } : {}}>
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: RED }}>S</div>
              <div>
                <p className="text-sm font-medium text-white">Staff Medico</p>
                <p className="text-white/40 text-xs">U.S. Cremonese</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
