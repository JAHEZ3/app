"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Filter, MoreVertical, UserCheck,
  UserX, Trash2, Eye, Users, Store, Bike, User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";

// ── Types ─────────────────────────────────────────────────
type UserRole = "all" | "restaurant" | "delivery" | "customer";

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "restaurant" | "delivery" | "customer";
  isActive: boolean;
  createdAt: string;
  ordersCount?: number;
  restaurantName?: string;
  vehicleType?: string;
}

// ── Mock data ─────────────────────────────────────────────
const mockUsers: PlatformUser[] = [
  { id: "1", name: "أحمد الشمري",    email: "ahmed@mail.com",    phone: "0501234567", role: "restaurant", isActive: true,  createdAt: "2024-01-15", restaurantName: "مطعم الأصالة", ordersCount: 1240 },
  { id: "2", name: "فاطمة الزهراني", email: "fatima@mail.com",   phone: "0509876543", role: "customer",   isActive: true,  createdAt: "2024-02-20", ordersCount: 38 },
  { id: "3", name: "محمد العتيبي",   email: "moh@mail.com",     phone: "0556677889", role: "delivery",   isActive: true,  createdAt: "2024-03-10", vehicleType: "دراجة نارية",    ordersCount: 420 },
  { id: "4", name: "نورة الدوسري",   email: "nora@mail.com",    phone: "0533445566", role: "customer",   isActive: false, createdAt: "2024-03-25", ordersCount: 5 },
  { id: "5", name: "خالد المطيري",   email: "khalid@mail.com",  phone: "0544332211", role: "restaurant", isActive: true,  createdAt: "2024-04-01", restaurantName: "برجر هاوس",   ordersCount: 780 },
  { id: "6", name: "سارة القحطاني",  email: "sara@mail.com",    phone: "0512345678", role: "delivery",   isActive: false, createdAt: "2024-04-12", vehicleType: "سيارة",          ordersCount: 95 },
  { id: "7", name: "عبدالله الغامدي",email: "abdu@mail.com",    phone: "0598765432", role: "customer",   isActive: true,  createdAt: "2024-05-05", ordersCount: 22 },
  { id: "8", name: "ريم الحربي",     email: "reem@mail.com",    phone: "0567891234", role: "restaurant", isActive: true,  createdAt: "2024-05-18", restaurantName: "مندي الخير",  ordersCount: 350 },
  { id: "9", name: "تركي الرشيدي",   email: "turki@mail.com",   phone: "0545678901", role: "delivery",   isActive: true,  createdAt: "2024-06-01", vehicleType: "دراجة هوائية",   ordersCount: 210 },
  { id: "10", name: "منيرة العنزي",  email: "munira@mail.com",  phone: "0523456789", role: "customer",  isActive: true,  createdAt: "2024-06-15", ordersCount: 14 },
];

const roleLabels: Record<UserRole, string> = {
  all:        "الكل",
  restaurant: "المطاعم",
  delivery:   "التوصيل",
  customer:   "العملاء",
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  all:        <Users className="w-4 h-4" />,
  restaurant: <Store className="w-4 h-4" />,
  delivery:   <Bike  className="w-4 h-4" />,
  customer:   <User  className="w-4 h-4" />,
};

const roleBadgeVariant = (role: PlatformUser["role"]) => {
  if (role === "restaurant") return "default" as const;
  if (role === "delivery")   return "warning" as const;
  return "info" as const;
};

const roleLabel = (role: PlatformUser["role"]) => {
  if (role === "restaurant") return "مطعم";
  if (role === "delivery")   return "سائق توصيل";
  return "عميل";
};

export default function UsersPage() {
  const [activeRole, setActiveRole] = useState<UserRole>("all");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { success, error } = useToast();

  const { data, isLoading } = useQuery<PlatformUser[]>({
    queryKey: queryKeys.users.all({ role: activeRole }),
    queryFn: async () => {
      const res = await usersApi.getAll({ role: activeRole === "all" ? undefined : activeRole });
      return res.data;
    },
    placeholderData: mockUsers,
    retry: false,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.toggleStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      success(isActive ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
      setOpenMenuId(null);
    },
    onError: () => error("خطأ", "تعذّر تغيير حالة المستخدم"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      success("تم حذف المستخدم");
      setOpenMenuId(null);
    },
    onError: () => error("خطأ", "تعذّر حذف المستخدم"),
  });

  const users = data ?? mockUsers;

  const filtered = users.filter((u) => {
    const matchRole = activeRole === "all" || u.role === activeRole;
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    return matchRole && matchSearch;
  });

  // Role counts
  const counts: Record<UserRole, number> = {
    all:        users.length,
    restaurant: users.filter((u) => u.role === "restaurant").length,
    delivery:   users.filter((u) => u.role === "delivery").length,
    customer:   users.filter((u) => u.role === "customer").length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="المستخدمون" subtitle="إدارة جميع مستخدمي المنصة" />

      <div className="p-6 space-y-5 animate-fade-in-up">

        {/* Role filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "restaurant", "delivery", "customer"] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                activeRole === role
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {roleIcons[role]}
              {roleLabels[role]}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeRole === role ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[role]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="بحث بالاسم، البريد، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button variant="outline" size="md">
            <Filter className="w-4 h-4" />
            تصفية
          </Button>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["المستخدم", "الدور", "الهاتف", "الطلبات / النشاط", "تاريخ التسجيل", "الحالة", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      لا يوجد مستخدمون يطابقون البحث
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ background: "linear-gradient(135deg,#F55905,#FF8C38)" }}
                          >
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <Badge variant={roleBadgeVariant(user.role)}>
                            {roleLabel(user.role)}
                          </Badge>
                          {user.restaurantName && (
                            <p className="text-[11px] text-muted-foreground">{user.restaurantName}</p>
                          )}
                          {user.vehicleType && (
                            <p className="text-[11px] text-muted-foreground">{user.vehicleType}</p>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-muted-foreground dir-ltr text-left">
                        {user.phone}
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {formatNumber(user.ordersCount ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground mr-1">طلب</span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDateTime(user.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? "success" : "error"}>
                          {user.isActive ? "نشط" : "موقوف"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === user.id && (
                          <div className="absolute left-0 top-10 z-20 bg-white rounded-xl border border-border shadow-lg py-1 w-44 animate-scale-in">
                            <button className="flex items-center gap-2 px-3 py-2 w-full text-sm text-foreground hover:bg-muted transition-colors">
                              <Eye className="w-4 h-4 text-info" />
                              عرض التفاصيل
                            </button>
                            <button
                              onClick={() => toggleStatus.mutate({ id: user.id, isActive: !user.isActive })}
                              className="flex items-center gap-2 px-3 py-2 w-full text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              {user.isActive
                                ? <><UserX className="w-4 h-4 text-warning" /> إيقاف الحساب</>
                                : <><UserCheck className="w-4 h-4 text-success" /> تفعيل الحساب</>}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => deleteUser.mutate(user.id)}
                              className="flex items-center gap-2 px-3 py-2 w-full text-sm text-error hover:bg-error-light transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف المستخدم
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              عرض {filtered.length} من أصل {users.length} مستخدم
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>السابق</Button>
              <Button variant="outline" size="sm">التالي</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
