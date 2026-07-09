import type { Metadata, Viewport } from "next";
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
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <div className="flex overflow-hidden bg-gray-50" style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
            {children}
          </main>
        </div>
        <OfflineBanner />
      </body>
    </html>
  );
}
