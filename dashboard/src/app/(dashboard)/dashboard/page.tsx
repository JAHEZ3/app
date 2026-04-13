import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { LiveOrders } from "@/components/dashboard/LiveOrders";
import { TopSellingItems } from "@/components/dashboard/TopSellingItems";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { StoreStatus } from "@/components/dashboard/StoreStatus";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header />

      <div className="flex-1 p-5 space-y-5">
        {/* Page title */}
        <div className="animate-fade-in-up">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-0.5">
            DASHBOARD OVERVIEW
          </p>
          <h1 className="text-2xl font-black text-foreground">
            أهلاً بك من جديد، مطعم الأصالة
          </h1>
        </div>

        {/* Stats row */}
        <div className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <StatsCards />
        </div>

        {/* Main grid — wide right column (LiveOrders + Sales), narrow left column (TopSelling + StoreStatus + QuickActions) */}
        <div
          className="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          {/* Wide column (2/3) — LiveOrders + SalesChart */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            <LiveOrders />
            <SalesChart />
          </div>

          {/* Narrow column (1/3) — TopSelling + StoreStatus + QuickActions */}
          <div className="flex flex-col gap-5">
            <TopSellingItems />
            <StoreStatus />
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
