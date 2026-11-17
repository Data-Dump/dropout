"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { MenuItem, MenuItemVariant, DietType, AddOnOption } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Layers,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { uploadMenuImage } from "@/lib/supabase/storage";

const PRESET_IMAGES = [
  { name: "Coffee", url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=80" },
  { name: "Chai", url: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?auto=format&fit=crop&w=700&q=80" },
  { name: "Momos", url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=700&q=80" },
  { name: "Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80" },
  { name: "Fries", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=700&q=80" },
  { name: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80" },
  { name: "Sandwich", url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=80" },
  { name: "Paratha", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=80" },
  { name: "Brownie", url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=80" },
];

export function MenuManagementView() {
  const {
    menuItems,
    categories,
    toggleItemAvailability,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    moveMenuItemOrder,
  } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOldPrice, setFormOldPrice] = useState("");
  const [formDiscountText, setFormDiscountText] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0]?.id || "");
  const [formDiet, setFormDiet] = useState<DietType>("veg");
  const [formImageUrl, setFormImageUrl] = useState(PRESET_IMAGES[0].url);
  const [formPortion, setFormPortion] = useState("");
  const [formPrepTime, setFormPrepTime] = useState("15");
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formIsBestseller, setFormIsBestseller] = useState(false);
  const [formIsChefSpecial, setFormIsChefSpecial] = useState(false);

  // Sizes & Variants state
  const [formVariants, setFormVariants] = useState<MenuItemVariant[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");

  // Combo Meal Contents state
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [formComboIncludes, setFormComboIncludes] = useState<string[]>([]);
  const [newComboItem, setNewComboItem] = useState("");

  // Add-ons state
  const [formAddOns, setFormAddOns] = useState<AddOnOption[]>([]);
  const [newAddOnName, setNewAddOnName] = useState("");
  const [newAddOnPrice, setNewAddOnPrice] = useState("");

  // Async states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const publicUrl = await uploadMenuImage(file);
      setFormImageUrl(publicUrl);
      toast.success("Food photography uploaded to Supabase Storage!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const filteredItems = useMemo(() => {
    return menuItems
      .filter((item) => {
        if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.categoryName?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [menuItems, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormOldPrice("");
    setFormDiscountText("");
    setFormCategory(categories[0]?.id || "");
    setFormDiet("veg");
    setFormImageUrl(PRESET_IMAGES[0].url);
    setFormPortion("");
    setFormPrepTime("15");
    setFormIsAvailable(true);
    setFormIsBestseller(false);
    setFormIsChefSpecial(false);
    setFormVariants([]);
    setFormIsCombo(false);
    setFormComboIncludes([]);
    setNewComboItem("");
    setFormAddOns([
      { id: "opt-1", name: "Extra Cheese Layer", price: 20 },
      { id: "opt-2", name: "Spicy Schezwan Dip", price: 15 },
    ]);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPrice(String(item.price));
    setFormOldPrice(item.oldPrice ? String(item.oldPrice) : "");
    setFormDiscountText(item.discountText || "");
    setFormCategory(item.categoryId);
    setFormDiet(item.dietType);
    setFormImageUrl(item.imageUrl);
    setFormPortion(item.portionSize || "");
    setFormPrepTime(String(item.preparationTimeMinutes || 15));
    setFormIsAvailable(item.isAvailable);
    setFormIsBestseller(Boolean(item.isBestseller));
    setFormIsChefSpecial(Boolean(item.isChefSpecial));

    // Combo items
    const parsedCombo = item.comboIncludes && item.comboIncludes.length > 0
      ? [...item.comboIncludes]
      : item.description && item.description.includes("+")
        ? item.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean)
        : [];
    setFormComboIncludes(parsedCombo);
    setFormIsCombo(
      Boolean(
        item.isCombo ||
        parsedCombo.length > 0 ||
        item.categoryId.toLowerCase().includes("combo") ||
        item.name.toLowerCase().includes("combo")
      )
    );
    setNewComboItem("");

    // Variants
    setFormVariants(item.variants ? [...item.variants] : []);

    // Addons
    const existingOptions = item.addOnGroups?.[0]?.options || [];
    setFormAddOns(existingOptions);
    setModalOpen(true);
  };

  // Combo handlers
  const handleAddComboItem = () => {
    const trimmed = newComboItem.trim();
    if (!trimmed) return;
    if (!formComboIncludes.includes(trimmed)) {
      setFormComboIncludes((prev) => [...prev, trimmed]);
    }
    setNewComboItem("");
  };

  const handleRemoveComboItem = (index: number) => {
    setFormComboIncludes((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Variants handlers
  const handleAddVariant = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    const priceNum = Number(newVariantPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price for the variant.");
      return;
    }

    setFormVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        name: newVariantName.trim(),
        price: priceNum,
        isDefault: prev.length === 0,
      },
    ]);
    setNewVariantName("");
    setNewVariantPrice("");
  };

  const handleRemoveVariant = (id: string) => {
    setFormVariants((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      if (filtered.length > 0 && !filtered.some((v) => v.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleSetDefaultVariant = (id: string) => {
    setFormVariants((prev) =>
      prev.map((v) => ({
        ...v,
        isDefault: v.id === id,
      }))
    );
  };

  // Add-ons handlers
  const handleAddAddOn = () => {
    if (!newAddOnName.trim() || !newAddOnPrice) return;
    const priceNum = Number(newAddOnPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid add-on price.");
      return;
    }

    setFormAddOns((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        name: newAddOnName.trim(),
        price: priceNum,
      },
    ]);
    setNewAddOnName("");
    setNewAddOnPrice("");
  };

  const handleRemoveAddOn = (id: string) => {
    setFormAddOns((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      toast.error("Please fill in item name and base price.");
      return;
    }

    const priceNum = Number(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a positive base price.");
      return;
    }

    if (!formCategory) {
      toast.error("Please assign a category to this item.");
      return;
    }

    const categoryObj = categories.find((c) => c.id === formCategory);
    const categoryName = categoryObj?.name || "General";

    const addOnGroups =
      formAddOns.length > 0
        ? [
            {
              id: "grp-custom",
              title: "Customisations & Add-ons",
              options: formAddOns,
            },
          ]
        : undefined;

    const variantsPayload = formVariants.length > 0 ? formVariants : undefined;

    const isComboMeal = formIsCombo || formComboIncludes.length > 0;
    const finalDescription = formDescription.trim() || (formComboIncludes.length > 0 ? formComboIncludes.join(" + ") : "");

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, {
          name: formName.trim(),
          description: finalDescription,
          price: priceNum,
          oldPrice: formOldPrice ? Number(formOldPrice) : undefined,
          discountText: formDiscountText.trim() || undefined,
          categoryId: formCategory,
          categoryName,
          dietType: formDiet,
          imageUrl: formImageUrl,
          portionSize: formPortion.trim() || undefined,
          preparationTimeMinutes: Number(formPrepTime) || 15,
          isAvailable: formIsAvailable,
          isBestseller: formIsBestseller,
          isChefSpecial: formIsChefSpecial,
          isCombo: isComboMeal,
          comboIncludes: formComboIncludes.length > 0 ? formComboIncludes : undefined,
          variants: variantsPayload,
          addOnGroups,
        });
        toast.success(`Updated "${formName}" successfully`);
      } else {
        await addMenuItem({
          name: formName.trim(),
          description: finalDescription,
          price: priceNum,
          oldPrice: formOldPrice ? Number(formOldPrice) : undefined,
          discountText: formDiscountText.trim() || undefined,
          categoryId: formCategory,
          categoryName,
          dietType: formDiet,
          imageUrl: formImageUrl,
          portionSize: formPortion.trim() || undefined,
          preparationTimeMinutes: Number(formPrepTime) || 15,
          isAvailable: formIsAvailable,
          isBestseller: formIsBestseller,
          isChefSpecial: formIsChefSpecial,
          isCombo: isComboMeal,
          comboIncludes: formComboIncludes.length > 0 ? formComboIncludes : undefined,
          variants: variantsPayload,
          addOnGroups,
        });
        toast.success(`Added "${formName}" to menu`);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed saving item";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMenuItem(itemToDelete.id);
      toast.success(`"${itemToDelete.name}" deleted from menu.`);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (item: MenuItem) => {
    setTogglingItemId(item.id);
    try {
      await toggleItemAvailability(item.id);
      toast.info(
        `${item.name} is now ${item.isAvailable ? "marked Sold Out" : "marked In Stock"}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed toggling availability";
      toast.error(msg);
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleMoveOrder = async (id: string, direction: "up" | "down") => {
    setMovingItemId(id);
    try {
      await moveMenuItemOrder(id, direction);
      toast.success("Menu item order updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move menu item";
      toast.error(msg);
    } finally {
      setMovingItemId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search food item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-bold"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 rounded-xl text-xs font-bold gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Menu Item</span>
        </Button>
      </div>

      {/* Menu Table / Cards */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Order</th>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price (INR)</th>
                <th className="py-3 px-4">Diet</th>
                <th className="py-3 px-4">Options</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredItems.map((item, index) => {
                const isMoving = movingItemId === item.id;
                const isToggling = togglingItemId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    {/* Order & Move Buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
                        <button
                          type="button"
                          disabled={index === 0 || isMoving}
                          onClick={() => handleMoveOrder(item.id, "up")}
                          className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === filteredItems.length - 1 || isMoving}
                          onClick={() => handleMoveOrder(item.id, "down")}
                          className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Thumbnail & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-muted shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="space-y-0.5 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-sm line-clamp-1">
                              {item.name}
                            </span>
                            {item.isBestseller && (
                              <Badge variant="amber" className="text-[9px] py-0 px-1 font-bold">
                                Bestseller
                              </Badge>
                            )}
                            {item.isChefSpecial && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] py-0 px-1 font-bold">
                                Chef Special
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>

                          {/* Combo Contents Badge & Items */}
                          {((item.comboIncludes && item.comboIncludes.length > 0) || item.isCombo || item.categoryId.toLowerCase().includes("combo") || item.name.toLowerCase().includes("combo")) && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                                <UtensilsCrossed className="h-2.5 w-2.5" />
                                <span>Combo Contains:</span>
                              </span>
                              {(item.comboIncludes && item.comboIncludes.length > 0
                                ? item.comboIncludes
                                : item.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean)
                              ).map((ci, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-semibold bg-secondary text-foreground px-1.5 py-0.2 rounded border border-border/60"
                                >
                                  {ci}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-muted-foreground font-semibold">
                      {item.categoryName || "General"}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">
                      <span className="font-black text-foreground text-sm">
                        {formatCurrency(item.price)}
                      </span>
                      {item.oldPrice && (
                        <span className="text-[10px] text-muted-foreground line-through ml-1.5 font-medium">
                          {formatCurrency(item.oldPrice)}
                        </span>
                      )}
                    </td>

                    {/* Diet */}
                    <td className="py-3 px-4">
                      <DietBadge type={item.dietType} showLabel size="sm" />
                    </td>

                    {/* Variants & Addons summary */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 text-[10px]">
                        {item.variants && item.variants.length > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold text-primary">
                            <Layers className="h-3 w-3" />
                            {item.variants.length} Sizes
                          </span>
                        )}
                        {item.addOnGroups?.[0]?.options && item.addOnGroups[0].options.length > 0 && (
                          <span className="text-muted-foreground font-medium">
                            +{item.addOnGroups[0].options.length} Add-ons
                          </span>
                        )}
                        {(!item.variants || item.variants.length === 0) &&
                          (!item.addOnGroups || item.addOnGroups.length === 0) && (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                      </div>
                    </td>

                    {/* Availability toggle */}
                    <td className="py-3 px-4">
                      <button
                        disabled={isToggling}
                        onClick={() => handleToggle(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          item.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100"
                        }`}
                      >
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
                        <span>{item.isAvailable ? "In Stock" : "Sold Out"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-[#FAF8F5] shrink-0">
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              {editingItem ? `Edit "${editingItem.name}"` : "Add New Menu Item"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure item pricing, category, dietary classification, photography, sizes & add-ons.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kullhad Masala Chai"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Combo Meal Toggle & Contents Builder */}
            <div className="space-y-3 p-3.5 rounded-2xl border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      formIsCombo ||
                      Boolean(
                        categories.find((c) => c.id === formCategory)?.slug?.includes("combo") ||
                        categories.find((c) => c.id === formCategory)?.name?.toLowerCase().includes("combo")
                      )
                    }
                    onChange={(e) => setFormIsCombo(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-black text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                    <span>This is a Combo Meal</span>
                  </span>
                </label>
                {(formIsCombo ||
                  Boolean(
                    categories.find((c) => c.id === formCategory)?.slug?.includes("combo") ||
                    categories.find((c) => c.id === formCategory)?.name?.toLowerCase().includes("combo")
                  )) && (
                  <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full">
                    {formComboIncludes.length} Items Included
                  </span>
                )}
              </div>

              {(formIsCombo ||
                Boolean(
                  categories.find((c) => c.id === formCategory)?.slug?.includes("combo") ||
                  categories.find((c) => c.id === formCategory)?.name?.toLowerCase().includes("combo")
                )) && (
                <div className="space-y-2.5 pt-2 border-t border-amber-200/80 dark:border-amber-900/60">
                  <p className="text-[11px] text-muted-foreground">
                    Specify what items are included in this combo (e.g. 1x Veg Burger, 1x Fries, 1x Drink). Customers & staff see this breakdown!
                  </p>

                  {/* Add item to combo input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1x French Fries, 1x Cold Coffee..."
                      value={newComboItem}
                      onChange={(e) => setNewComboItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddComboItem();
                        }
                      }}
                      className="flex-1 rounded-xl border border-input bg-background p-2 text-xs font-semibold focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddComboItem}
                      className="rounded-xl text-xs font-bold shrink-0 bg-foreground text-background hover:bg-foreground/90"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add to Combo
                    </Button>
                  </div>

                  {/* Quick Add Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">Quick Add:</span>
                    {["1x Masala Chai", "1x Cold Coffee", "1x French Fries", "1x Veg Burger", "1x Aloo Paratha", "1x Coke (300ml)"].map(
                      (sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (!formComboIncludes.includes(sug)) {
                              setFormComboIncludes((prev) => [...prev, sug]);
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] font-semibold border border-border text-foreground transition-colors"
                        >
                          + {sug}
                        </button>
                      )
                    )}
                  </div>

                  {/* List of currently included items */}
                  {formComboIncludes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formComboIncludes.map((ci, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border text-xs font-bold text-foreground shadow-2xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{ci}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveComboItem(idx)}
                            className="text-muted-foreground hover:text-destructive p-0.5 ml-0.5"
                            title="Remove item"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium italic">
                      No items added yet. Type an item above or click a quick suggestion.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Price & Savings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Base Price (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 69"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Old Price (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="84 (optional)"
                  value={formOldPrice}
                  onChange={(e) => setFormOldPrice(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Savings Tag
                </label>
                <input
                  type="text"
                  placeholder="Save ₹15"
                  value={formDiscountText}
                  onChange={(e) => setFormDiscountText(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Diet, Portion & Prep Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Dietary Tag *
                </label>
                <select
                  value={formDiet}
                  onChange={(e) => setFormDiet(e.target.value as DietType)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                >
                  <option value="veg">Vegetarian (Pure Veg)</option>
                  <option value="egg">Contains Egg</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Portion Size
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6 Pieces, 400 ml"
                  value={formPortion}
                  onChange={(e) => setFormPortion(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Prep Time (Mins)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="15"
                  value={formPrepTime}
                  onChange={(e) => setFormPrepTime(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Fresh ingredients, signature spices, and recipe details..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Food Image with Supabase Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Food Photography
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>{isUploadingImage ? "Uploading to Storage..." : "Upload Food Image"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://... or choose from quick presets"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
                <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                  <Image src={formImageUrl} alt="preview" fill className="object-cover" />
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold flex items-center shrink-0">
                  Presets:
                </span>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormImageUrl(preset.url)}
                    className="shrink-0 px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] font-bold border border-border"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes & Variants Section */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground uppercase tracking-wider block flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Sizes & Portion Variants (Optional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground">
                  e.g. Small / Large, Half / Full
                </span>
              </div>

              {/* Add Variant Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Variant name (e.g. Large - 400ml)"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background p-2 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Price (₹)"
                  value={newVariantPrice}
                  onChange={(e) => setNewVariantPrice(e.target.value)}
                  className="w-24 rounded-xl border border-input bg-background p-2 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddVariant}
                  className="rounded-xl text-xs font-bold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Size
                </Button>
              </div>

              {/* Active Variants List */}
              {formVariants.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {formVariants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultVariant(v.id)}
                          className={`h-2.5 w-2.5 rounded-full border ${
                            v.isDefault ? "bg-primary border-primary" : "border-muted-foreground"
                          }`}
                          title={v.isDefault ? "Default Size" : "Click to make default"}
                        />
                        <span className="font-bold text-foreground">{v.name}</span>
                        <span className="text-muted-foreground font-semibold">
                          {formatCurrency(v.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons & Customisations */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Customisations & Add-ons (Optional)
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add-on name (e.g. Extra Cheese Layer)"
                  value={newAddOnName}
                  onChange={(e) => setNewAddOnName(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background p-2 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Price (₹)"
                  value={newAddOnPrice}
                  onChange={(e) => setNewAddOnPrice(e.target.value)}
                  className="w-24 rounded-xl border border-input bg-background p-2 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAddOn}
                  className="rounded-xl text-xs font-bold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {/* Active Add-ons List */}
              {formAddOns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formAddOns.map((addon) => (
                    <div
                      key={addon.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-foreground text-xs font-medium border border-border"
                    >
                      <span>
                        {addon.name} (+{formatCurrency(addon.price)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddOn(addon.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Badges & Availability Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-secondary/50 border border-border">
                <input
                  type="checkbox"
                  checked={formIsAvailable}
                  onChange={(e) => setFormIsAvailable(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-bold text-foreground">In Stock</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-secondary/50 border border-border">
                <input
                  type="checkbox"
                  checked={formIsBestseller}
                  onChange={(e) => setFormIsBestseller(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Bestseller
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-secondary/50 border border-border">
                <input
                  type="checkbox"
                  checked={formIsChefSpecial}
                  onChange={(e) => setFormIsChefSpecial(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-bold text-foreground">Chef Special</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setModalOpen(false)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-xl text-xs font-bold shadow-xs gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingItem ? "Save Changes" : "Add to Menu"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-black tracking-tight">
                Delete Menu Item
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-bold">&quot;{itemToDelete?.name}&quot;</strong>{" "}
              from the menu? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {itemToDelete && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 border border-border my-2">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                <Image
                  src={itemToDelete.imageUrl}
                  alt={itemToDelete.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{itemToDelete.name}</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {formatCurrency(itemToDelete.price)} • {itemToDelete.categoryName || "General"}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setItemToDelete(null);
              }}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleExecuteDelete}
              className="h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Delete Item</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
