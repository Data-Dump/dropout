"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItem, MenuItemVariant, AddOnOption } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Plus, Minus, ShoppingBag, Sparkles, Check, Layers, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface MenuItemModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuItemModal({ item, open, onOpenChange }: MenuItemModalProps) {
  const { addToCart } = useRestaurant();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(undefined);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnOption[]>([]);
  const [instructions, setInstructions] = useState("");

  // Reset state when opening a new item
  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      setSelectedAddOns([]);
      setInstructions("");
      const defaultVariant =
        item.variants?.find((v) => v.isDefault) || item.variants?.[0];
      setSelectedVariant(defaultVariant);
    }
  }, [open, item]);

  if (!item) return null;

  // Toggle add-on selection
  const handleToggleAddOn = (option: AddOnOption) => {
    setSelectedAddOns((prev) => {
      const exists = prev.some((o) => o.id === option.id);
      if (exists) {
        return prev.filter((o) => o.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : item.price;
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(item, quantity, selectedAddOns, instructions.trim() || undefined, selectedVariant);
    toast.success(
      `Added ${quantity}x ${item.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} to order`,
      {
        description:
          selectedAddOns.length > 0
            ? `With ${selectedAddOns.map((a) => a.name).join(", ")}`
            : undefined,
      }
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Large Food Photography Header */}
        <div className="relative aspect-[16/9] w-full bg-muted shrink-0">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Badges on image */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                <DietBadge type={item.dietType} showLabel size="sm" />
              </div>

              {item.discountText && (
                <Badge variant="amber" className="text-xs bg-amber-500 text-stone-950 font-bold border-amber-400">
                  {item.discountText}
                </Badge>
              )}

              {item.isBestseller && !item.discountText && (
                <Badge variant="amber" className="text-xs font-bold">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Bestseller
                </Badge>
              )}
            </div>

            {item.portionSize && (
              <span className="text-xs text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full font-medium">
                {item.portionSize}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
                  {item.name}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-foreground">
                    {formatCurrency(basePrice)}
                  </span>
                  {item.oldPrice && !selectedVariant && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(item.oldPrice)}
                    </span>
                  )}
                  {item.categoryName && (
                    <span className="text-xs text-muted-foreground font-medium">
                      • {item.categoryName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          {/* Combo Contents Box */}
          {((item.comboIncludes && item.comboIncludes.length > 0) || item.isCombo || item.categoryId.toLowerCase().includes("combo") || item.name.toLowerCase().includes("combo")) && (
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <span>This Combo Contains:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(item.comboIncludes && item.comboIncludes.length > 0
                  ? item.comboIncludes
                  : item.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean)
                ).map((ci, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{ci}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sizes & Portion Variants */}
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Choose Portion / Size</span>
                </span>
                <span className="text-[11px] font-semibold text-primary">Required</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all flex items-center justify-between",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary font-bold shadow-xs ring-1 ring-primary"
                          : "border-border hover:border-foreground/30 text-foreground bg-card"
                      )}
                    >
                      <span className="text-xs font-semibold">{v.name}</span>
                      <span className="text-xs font-black">{formatCurrency(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customisation & Add-ons */}
          {item.addOnGroups && item.addOnGroups.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              {item.addOnGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {group.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Optional</span>
                  </div>

                  <div className="space-y-1.5">
                    {group.options.map((option) => {
                      const isSelected = selectedAddOns.some((o) => o.id === option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleToggleAddOn(option)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs text-left ${
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground font-semibold ring-1 ring-primary"
                              : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-white"
                                  : "border-input bg-background"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span>{option.name}</span>
                          </div>
                          <span className="font-bold text-foreground">
                            +{formatCurrency(option.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Instructions for Kitchen */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Less spicy, less ice, extra crispy, no onion..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Modal Footer with Quantity & Add to Cart */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-background/95 flex items-center justify-between gap-3 shrink-0">
          {/* Quantity selector */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-7 w-7 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center font-black text-sm text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-7 w-7 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className="flex-1 h-12 gap-2 text-sm font-bold rounded-xl shadow-md"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>
              {item.isAvailable
                ? `Add ${quantity > 1 ? `${quantity} ` : ""}to Order • ${formatCurrency(totalPrice)}`
                : "Sold Out"}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
