"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "الرئيسية" },
  { href: "/orders", icon: ShoppingBag, label: "الطلبات" },
  { href: "/menu", icon: UtensilsCrossed, label: "القائمة" },
  { href: "/analytics", icon: BarChart3, label: "الإحصائيات" },
  { href: "/notifications", icon: Bell, label: "الإشعارات" },
  { href: "/settings", icon: Settings, label: "الإعدادات" },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: notifs } = useNotifications(1, 1);
  const unread = notifs?.unread ?? 0;

  return (
    <aside
      className="fixed right-0 top-0 h-full flex flex-col bg-white z-40"
      style={{
        width: "var(--sidebar-width, 240px)",
        boxShadow: "-2px 0 16px rgba(0,0,0,0.07)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-border/60 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: "linear-gradient(135deg,#FF6B00,#FF8C38)" }}
          >
            ج
          </div>
          <span className="text-xl font-black text-foreground">جاهز</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span>{label}</span>
              {href === "/notifications" && unread > 0 && (
                <span className="mr-auto min-w-[20px] h-[20px] px-1.5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {isActive && href !== "/notifications" && (
                <ChevronLeft className="w-4 h-4 text-primary mr-auto" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border/60">
        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-muted-foreground hover:bg-error-light hover:text-error transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
