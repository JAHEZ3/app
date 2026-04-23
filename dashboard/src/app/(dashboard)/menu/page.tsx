"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useMenu, useCreateMeal, useUpdateMeal, useDeleteMeal, useToggleMealAvailability, useCreateSection } from "@/hooks/useMenu";
import { Menu, MenuSection, Meal } from "@/types/menu.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  UtensilsCrossed, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/providers/ToastProvider";

// Mock menu data — shown only when the backend returns zero menus.
const mockMenu: Menu[] = [
  {
    id: "m1", restaurantId: "r1", name: "القائمة الرئيسية", isActive: true, displayOrder: 1,
    sections: [
      {
        id: "s1", menuId: "m1", name: "البرجر", displayOrder: 1,
        meals: [
          { id: "meal1", sectionId: "s1", restaurantId: "r1", name: "واجو سيجنيتشر برجر", description: "برجر واجو مميز بالجبنة والصلصة الخاصة", imageUrl: null, basePrice: 85, discountPrice: null, calories: 750, isAvailable: true, isFeatured: true, tags: ["أكثر مبيعاً"], displayOrder: 1, createdAt: "" },
          { id: "meal2", sectionId: "s1", restaurantId: "r1", name: "كلاسيك ماك باربيكيو", description: "برجر لحم كلاسيكي مع صلصة باربيكيو", imageUrl: null, basePrice: 55, discountPrice: 49, calories: 650, isAvailable: true, isFeatured: false, tags: [], displayOrder: 2, createdAt: "" },
        ],
      },
      {
        id: "s2", menuId: "m1", name: "السلطات والصحي", displayOrder: 2,
        meals: [
          { id: "meal3", sectionId: "s2", restaurantId: "r1", name: "جاردن كينوا بول", description: "وعاء صحي بالكينوا والخضار الطازجة", imageUrl: null, basePrice: 65, discountPrice: null, calories: 420, isAvailable: true, isFeatured: true, tags: ["صحي"], displayOrder: 1, createdAt: "" },
          { id: "meal4", sectionId: "s2", restaurantId: "r1", name: "سيزر سالاد دجاج", description: "سلطة سيزر مع شرائح الدجاج المشوي", imageUrl: null, basePrice: 55, discountPrice: null, calories: 380, isAvailable: false, isFeatured: false, tags: [], displayOrder: 2, createdAt: "" },
        ],
      },
    ],
  },
];

interface MealFormData {
  name: string;
  description: string;
  basePrice: string;
  discountPrice: string;
  calories: string;
  isAvailable: boolean;
  isFeatured: boolean;
  tags: string;
}

function MealFormDialog({
  meal,
  sectionId,
  sections,
  onClose,
}: {
  meal?: Meal;
  sectionId?: string;
  sections: MenuSection[];
  onClose?: () => void;
}) {
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const { success, error } = useToast();

  const [form, setForm] = useState<MealFormData>({
    name: meal?.name ?? "",
    description: meal?.description ?? "",
    basePrice: meal?.basePrice?.toString() ?? "",
    discountPrice: meal?.discountPrice?.toString() ?? "",
    calories: meal?.calories?.toString() ?? "",
    isAvailable: meal?.isAvailable ?? true,
    isFeatured: meal?.isFeatured ?? false,
    tags: meal?.tags?.join("، ") ?? "",
  });
  const [selectedSection, setSelectedSection] = useState(sectionId ?? sections[0]?.id ?? "");

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      sectionId: selectedSection,
      name: form.name,
      description: form.description || undefined,
      basePrice: parseFloat(form.basePrice),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      calories: form.calories ? parseInt(form.calories) : undefined,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      tags: form.tags ? form.tags.split("،").map((t) => t.trim()).filter(Boolean) : [],
    };

    if (meal) {
      updateMeal.mutate(
        { id: meal.id, data: payload },
        { onSuccess: () => { success("تم تحديث الوجبة"); onClose?.(); }, onError: () => error("خطأ", "فشل تحديث الوجبة") }
      );
    } else {
      createMeal.mutate(payload, {
        onSuccess: () => { success("تم إضافة الوجبة"); onClose?.(); },
        onError: () => error("خطأ", "فشل إضافة الوجبة"),
      });
    }
  };

  const isPending = createMeal.isPending || updateMeal.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!meal && (
        <Select label="القسم" value={selectedSection} onValueChange={setSelectedSection}>
          {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </Select>
      )}

      <Input label="اسم الوجبة *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: برجر لحم مميز" required />

      <Textarea
        label="الوصف"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="وصف مختصر للوجبة..."
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="السعر الأساسي (SR) *"
          type="number"
          step="0.01"
          value={form.basePrice}
          onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          placeholder="0.00"
          required
        />
        <Input
          label="سعر الخصم (SR)"
          type="number"
          step="0.01"
          value={form.discountPrice}
          onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
          placeholder="اختياري"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="السعرات الحرارية"
          type="number"
          value={form.calories}
          onChange={(e) => setForm({ ...form, calories: e.target.value })}
          placeholder="مثال: 650"
        />
        <Input
          label="الوسوم (مفصولة بـ ،)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="أكثر مبيعاً، صحي"
        />
      </div>

      <div className="flex gap-6">
        <Switch
          checked={form.isAvailable}
          onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
          label="متاح للطلب"
        />
        <Switch
          checked={form.isFeatured}
          onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
          label="مميز"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" loading={isPending}>
          {meal ? "حفظ التغييرات" : "إضافة الوجبة"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline">إلغاء</Button>
        </DialogClose>
      </div>
    </form>
  );
}

function MealCard({ meal, sections }: { meal: Meal; sections: MenuSection[] }) {
  const deleteMeal = useDeleteMeal();
  const toggleAvail = useToggleMealAvailability();
  const { success, error } = useToast();

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${!meal.isAvailable ? "opacity-60 border-border" : "border-border"}`}>
      <div className="flex items-start gap-3">
        {/* Image placeholder */}
        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 text-2xl">
          🍔
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-foreground truncate">{meal.name}</h4>
            {meal.isFeatured && <Badge variant="warning" className="text-[10px] px-1.5 py-0">⭐ مميز</Badge>}
            {!meal.isAvailable && <Badge variant="error" className="text-[10px] px-1.5 py-0">غير متاح</Badge>}
          </div>

          {meal.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-black text-primary">{formatCurrency(meal.basePrice)}</span>
            {meal.discountPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatCurrency(meal.discountPrice)}</span>
            )}
            {meal.calories && (
              <span className="text-xs text-muted-foreground">{meal.calories} سعر</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() =>
              toggleAvail.mutate(meal.id, {
                onSuccess: () =>
                  success(meal.isAvailable ? "تم إيقاف الوجبة" : "تم تفعيل الوجبة"),
                onError: () => error("خطأ", "فشل تحديث الحالة"),
              })
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            title={meal.isAvailable ? "إيقاف" : "تفعيل"}
          >
            {meal.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent title="تعديل الوجبة">
              <MealFormDialog meal={meal} sections={sections} />
            </DialogContent>
          </Dialog>

          <button
            onClick={() =>
              deleteMeal.mutate(meal.id, {
                onSuccess: () => success("تم حذف الوجبة"),
                onError: () => error("خطأ", "فشل حذف الوجبة"),
              })
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-error-light hover:text-error transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ section, sections }: { section: MenuSection; sections: MenuSection[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{section.name}</h3>
            <p className="text-xs text-muted-foreground">{section.meals.length} وجبة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="w-3.5 h-3.5" /> إضافة وجبة
              </Button>
            </DialogTrigger>
            <DialogContent title="إضافة وجبة جديدة" description={`إضافة وجبة إلى قسم: ${section.name}`}>
              <MealFormDialog sectionId={section.id} sections={sections} />
            </DialogContent>
          </Dialog>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          {section.meals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              لا توجد وجبات في هذا القسم بعد
            </p>
          ) : (
            section.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} sections={sections} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  const { data: menus, isLoading } = useMenu();
  const createSection = useCreateSection();
  const { success } = useToast();

  const [newSectionName, setNewSectionName] = useState("");

  const allMenus = menus?.length ? menus : mockMenu;
  const activeMenu = allMenus[0];
  const allSections = activeMenu?.sections ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة القائمة</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allSections.reduce((acc, s) => acc + s.meals.length, 0)} وجبة في {allSections.length} قسم
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Add Section */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4" /> قسم جديد
                </Button>
              </DialogTrigger>
              <DialogContent title="إضافة قسم جديد">
                <div className="space-y-4">
                  <Input
                    label="اسم القسم"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="مثال: المشروبات"
                  />
                  <Button
                    className="w-full"
                    loading={createSection.isPending}
                    disabled={!activeMenu?.id || !newSectionName.trim()}
                    onClick={() =>
                      createSection.mutate(
                        { menuId: activeMenu!.id, data: { name: newSectionName.trim() } },
                        { onSuccess: () => { success("تم إضافة القسم"); setNewSectionName(""); } }
                      )
                    }
                  >
                    إضافة القسم
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Meal */}
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4" /> إضافة وجبة
                </Button>
              </DialogTrigger>
              <DialogContent title="إضافة وجبة جديدة">
                <MealFormDialog sections={allSections} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-4" />
                <div className="space-y-3">
                  {[1, 2].map((j) => <div key={j} className="h-16 bg-muted rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {allSections.map((section) => (
              <SectionBlock key={section.id} section={section} sections={allSections} />
            ))}
            {allSections.length === 0 && (
              <div className="bg-white rounded-xl border border-border p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground">لا توجد أقسام بعد</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">ابدأ بإضافة قسم ثم أضف الوجبات</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4" /> إضافة قسم جديد</Button>
                  </DialogTrigger>
                  <DialogContent title="إضافة قسم جديد">
                    <Input label="اسم القسم" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
                    <Button
                      className="w-full mt-4"
                      disabled={!activeMenu?.id || !newSectionName.trim()}
                      onClick={() =>
                        createSection.mutate({
                          menuId: activeMenu!.id,
                          data: { name: newSectionName.trim() },
                        })
                      }
                    >
                      إضافة
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
