import { Sidebar } from "@/components/layout/Sidebar";
import { StatusGuard } from "@/providers/StatusGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StatusGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main
          className="min-h-screen flex flex-col"
          style={{ marginRight: "var(--sidebar-width, 240px)" }}
        >
          {children}
        </main>
      </div>
    </StatusGuard>
  );
}
