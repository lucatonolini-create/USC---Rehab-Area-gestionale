import Sidebar from "@/components/Sidebar";
import OfflineBanner from "@/components/OfflineBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex overflow-hidden bg-white"
      style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">{children}</main>
      <OfflineBanner />
    </div>
  );
}
