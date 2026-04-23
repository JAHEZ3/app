"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRestaurant } from "@/hooks/useRestaurants";
import { extractApiErrorMessage, restaurantsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useToast } from "@/providers/ToastProvider";
import {
  CuisineType,
  type UpdateRestaurantPayload,
} from "@/types/restaurant.types";
import { cuisineLabel } from "./restaurant-labels";

interface EditRestaurantDialogProps {
  restaurantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  phone: string;
  street: string;
  city: string;
  cuisineType: CuisineType | "";
}

const emptyForm: FormState = {
  name: "",
  description: "",
  phone: "",
  street: "",
  city: "",
  cuisineType: "",
};

export function EditRestaurantDialog({
  restaurantId,
  open,
  onOpenChange,
}: EditRestaurantDialogProps) {
  const qc = useQueryClient();
  const { success, error } = useToast();
  const { data: r, isLoading } = useRestaurant(
    open ? restaurantId ?? undefined : undefined,
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (r) {
      setForm({
        name: r.name ?? "",
        description: r.description ?? "",
        phone: r.phone ?? "",
        street: r.street ?? "",
        city: r.city ?? "",
        cuisineType: r.cuisineType ?? "",
      });
    } else if (!open) {
      setForm(emptyForm);
    }
  }, [r, open]);

  const update = useMutation({
    mutationFn: (payload: UpdateRestaurantPayload) => {
      if (!restaurantId) throw new Error("Missing restaurant id");
      return restaurantsApi.update(restaurantId, payload);
    },
    onSuccess: () => {
      if (restaurantId) {
        qc.invalidateQueries({ queryKey: queryKeys.restaurants.detail(restaurantId) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.restaurants.root });
      success("تم حفظ التعديلات");
      onOpenChange(false);
    },
    onError: (err) =>
      error("خطأ", extractApiErrorMessage(err, "تعذّر حفظ التعديلات")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !r) return;
    const payload: UpdateRestaurantPayload = {};
    if (form.name !== (r.name ?? "")) payload.name = form.name;
    if (form.description !== (r.description ?? "")) payload.description = form.description;
    if (form.phone !== (r.phone ?? "")) payload.phone = form.phone;
    if (form.street !== (r.street ?? "")) payload.street = form.street;
    if (form.city !== (r.city ?? "")) payload.city = form.city;
    if (form.cuisineType !== (r.cuisineType ?? "") && form.cuisineType !== "") {
      payload.cuisineType = form.cuisineType;
    }
    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }
    update.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المطعم</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="الاسم"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  label="الهاتف"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="المدينة"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <Input
                  label="الشارع"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    نوع المطبخ
                  </label>
                  <Select
                    value={form.cuisineType || undefined}
                    onValueChange={(v) =>
                      setForm({ ...form, cuisineType: v as CuisineType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المطبخ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CuisineType).map((c) => (
                        <SelectItem key={c} value={c}>
                          {cuisineLabel[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    الوصف
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={update.isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" loading={update.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
