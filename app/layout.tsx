import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import OfflineBanner from "@/components/OfflineBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "U.S. Cremonese – Rehab Area",
  description: "Gestionale area riabilitazione U.S. Cremonese",
  manifest: "/manifest.json",
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
  themeColor: "#f9fafb",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* Sidebar: fixed su mobile, statica su desktop */}
          <Sidebar />
          {/* Contenuto principale — su mobile ha padding-top per non finire sotto l'hamburger */}
          <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
            {children}
          </main>
        </div>
        <OfflineBanner />
      </body>
    </html>
  );
}
