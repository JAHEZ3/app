"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Star,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Receipt,
  QrCode,
  Wallet,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "الرئيسية" },
  { href: "/orders", icon: ShoppingBag, label: "الطلبات" },
  { href: "/pos", icon: Receipt, label: "نقطة البيع" },
  { href: "/tables", icon: QrCode, label: "الطاولات" },
  { href: "/menu", icon: UtensilsCrossed, label: "القائمة" },
  { href: "/analytics", icon: BarChart3, label: "الإحصائيات" },
  { href: "/accounting", icon: Wallet, label: "المحاسبة" },
  { href: "/inventory", icon: Package, label: "المخزون" },
  { href: "/ratings", icon: Star, label: "التقييمات" },
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
      <div className="flex items-center justify-center h-20 border-b border-border/60 px-4 py-2">
        <div className="flex items-center p-1 group cursor-pointer">
          <Image
            src="/jahez-mark.png"
            alt="جاهز"
            width={48}
            height={48}
            priority
            unoptimized
            className="object-contain transition-all duration-700 ease-out group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-[0_8px_20px_rgba(245,89,5,0.55)]"
          />
          <div className="overflow-hidden max-w-0 group-hover:max-w-xs transition-[max-width] duration-700 ease-out">
            <span className="block whitespace-nowrap ps-3 text-2xl font-black text-[#F55905] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out delay-200">جاهز</span>
          </div>
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
