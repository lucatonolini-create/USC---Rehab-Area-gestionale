"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  TrendingUp,
  Settings,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/atleti", label: "Atleti", icon: Users },
  { href: "/appuntamenti", label: "Appuntamenti", icon: Calendar },
  { href: "/esercizi", label: "Programmi", icon: Dumbbell },
  { href: "/progressi", label: "Progressi", icon: TrendingUp },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#003087] text-white flex flex-col shadow-xl">
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFCC00] rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-[#003087]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">USC Rehab</h1>
            <p className="text-blue-300 text-xs">Area Riabilitazione</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive
                  ? "bg-[#FFCC00] text-[#003087]"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
            S
          </div>
          <div>
            <p className="text-sm font-medium">Staff Medico</p>
            <p className="text-blue-300 text-xs">USC</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
