"use client";

import React from "react";
import Image from "next/image";
import { MenuItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Plus, Minus, Sparkles, SlidersHorizontal } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
  onOpenDetails: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onOpenDetails }: MenuItemCardProps) {
  const { cart, addToCart, updateQuantity } = useRestaurant();

  // Find all cart entries for this menuItem
  const cartEntries = cart.filter((c) => c.menuItem.id === item.id);
  const currentQuantity = cartEntries.reduce((sum, c) => sum + c.quantity, 0);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If item has customizable add-on groups, open details modal instead
    if (item.addOnGroups && item.addOnGroups.length > 0) {
      onOpenDetails(item);
      return;
    }
    if (cartEntries.length > 0) {
      updateQuantity(cartEntries[0].id, cartEntries[0].quantity + 1);
    } else {
      addToCart(item, 1);
    }
  };

  const handleQuickDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartEntries.length > 0) {
      updateQuantity(cartEntries[0].id, cartEntries[0].quantity - 1);
    }
  };

  const hasCustomizations = item.addOnGroups && item.addOnGroups.length > 0;

  return (
    <div
      onClick={() => onOpenDetails(item)}
      className="group relative rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden hover:border-primary/40 active:scale-[0.99] flex flex-col justify-between"
    >
      {/* ---------------- MOBILE VIEW (< sm): Horizontal Layout ---------------- */}
      <div className="flex sm:hidden items-start justify-between gap-3">
        {/* Left Column: Info & Price */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="bg-white/95 px-1 py-0.5 rounded shadow-2xs">
              <DietBadge type={item.dietType} showLabel={false} size="sm" />
            </div>

            {item.discountText && (
              <Badge variant="amber" className="text-[9px] py-0 px-1.5 font-bold bg-amber-500 text-stone-950 border-amber-400">
                {item.discountText}
              </Badge>
            )}

            {item.isBestseller && !item.discountText && (
              <Badge variant="amber" className="text-[9px] py-0 px-1.5 font-bold">
                <Sparkles className="h-2 w-2 mr-0.5" />
                Bestseller
              </Badge>
            )}

            {item.isChefSpecial && !item.isBestseller && !item.discountText && (
              <Badge variant="stone" className="text-[9px] py-0 px-1.5 font-bold">
                Special
              </Badge>
            )}
          </div>

          {/* Dish Name */}
          <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {item.name}
          </h4>

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-foreground">
              {formatCurrency(item.price)}
            </span>
            {item.oldPrice && (
              <span className="text-[11px] text-muted-foreground line-through font-medium">
                {formatCurrency(item.oldPrice)}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
              {item.description}
            </p>
          )}

          {/* Combo preview or Customisable info */}
          {((item.comboIncludes && item.comboIncludes.length > 0) || item.isCombo || item.categoryId.toLowerCase().includes("combo") || item.name.toLowerCase().includes("combo")) && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {(item.comboIncludes && item.comboIncludes.length > 0
                ? item.comboIncludes
                : item.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean)
              ).slice(0, 2).map((ci, idx) => (
                <span
                  key={idx}
                  className="inline-block text-[9px] font-semibold bg-secondary text-foreground px-1 py-0.2 rounded border border-border/50"
                >
                  {ci}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Square Thumbnail + Action Button */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-muted/40 shadow-xs border border-border/60">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="96px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* Sold Out Overlay */}
            {!item.isAvailable && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] uppercase tracking-wider">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* ADD / Quantity Stepper Overlay on mobile */}
          <div className="-mt-3.5 relative z-10">
            {currentQuantity > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded-xl border border-primary/30 bg-[#211D1A] text-white px-2 py-1 shadow-md"
              >
                <button
                  onClick={handleQuickDecrement}
                  className="flex h-5 w-5 items-center justify-center rounded bg-stone-800 text-white hover:bg-stone-700 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-4 text-center text-xs font-bold">
                  {currentQuantity}
                </span>
                <button
                  onClick={handleQuickAdd}
                  className="flex h-5 w-5 items-center justify-center rounded bg-primary text-white hover:bg-primary/90 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleQuickAdd}
                disabled={!item.isAvailable}
                className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-card text-primary px-3 py-1 text-xs font-black shadow-md hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-3 w-3 stroke-[3]" />
                <span>{item.isAvailable ? "ADD" : "OUT"}</span>
              </button>
            )}
          </div>
          {hasCustomizations && item.isAvailable && (
            <span className="text-[9px] text-muted-foreground font-semibold mt-1">
              customisable
            </span>
          )}
        </div>
      </div>

      {/* ---------------- DESKTOP VIEW (>= sm): Vertical Card Layout ---------------- */}
      <div className="hidden sm:flex flex-col justify-between h-full">
        <div>
          {/* Food Photography & Badges */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted/40 mb-3">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70" />

            {/* Top badging */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
              <div className="bg-white/95 backdrop-blur-sm px-1.5 py-1 rounded-md shadow-sm">
                <DietBadge type={item.dietType} showLabel={false} size="sm" />
              </div>

              {item.discountText && (
                <Badge variant="amber" className="text-[10px] py-0 px-2 shadow-sm font-bold bg-amber-500 text-stone-950 border-amber-400">
                  {item.discountText}
                </Badge>
              )}

              {item.isBestseller && !item.discountText && (
                <Badge variant="amber" className="text-[10px] py-0 px-2 shadow-sm font-semibold">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Bestseller
                </Badge>
              )}

              {item.isChefSpecial && !item.isBestseller && !item.discountText && (
                <Badge variant="stone" className="text-[10px] py-0 px-2 shadow-sm font-semibold">
                  Special
                </Badge>
              )}
            </div>

            {/* Sold Out Overlay */}
            {!item.isAvailable && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                <span className="px-3 py-1 rounded-lg bg-rose-600/90 text-white font-bold text-xs uppercase tracking-wider shadow">
                  Sold Out
                </span>
              </div>
            )}

            {/* Portion size or Customisable badge */}
            {hasCustomizations && item.isAvailable && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-stone-200 backdrop-blur-md px-2 py-0.5 rounded-md">
                <SlidersHorizontal className="h-2.5 w-2.5" />
                <span>Customisable</span>
              </div>
            )}
            {item.portionSize && !hasCustomizations && (
              <div className="absolute bottom-2 right-2 text-[10px] font-semibold bg-black/60 text-stone-200 backdrop-blur-md px-2 py-0.5 rounded-md">
                {item.portionSize}
              </div>
            )}
          </div>

          {/* Item Info */}
          <div className="space-y-1">
            <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {item.name}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>

            {/* Combo items preview */}
            {((item.comboIncludes && item.comboIncludes.length > 0) || item.isCombo || item.categoryId.toLowerCase().includes("combo") || item.name.toLowerCase().includes("combo")) && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {(item.comboIncludes && item.comboIncludes.length > 0
                  ? item.comboIncludes
                  : item.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean)
                ).slice(0, 3).map((ci, idx) => (
                  <span
                    key={idx}
                    className="inline-block text-[10px] font-semibold bg-secondary/80 text-foreground px-1.5 py-0.5 rounded border border-border/50"
                  >
                    {ci}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Footer: Price & Add Button */}
        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-border/50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-foreground">
              {formatCurrency(item.price)}
            </span>
            {item.oldPrice && (
              <span className="text-xs text-muted-foreground line-through font-medium">
                {formatCurrency(item.oldPrice)}
              </span>
            )}
          </div>

          <div>
            {currentQuantity > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2 py-1 text-primary shadow-xs"
              >
                <button
                  onClick={handleQuickDecrement}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-primary hover:bg-primary hover:text-white transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold text-foreground">
                  {currentQuantity}
                </span>
                <button
                  onClick={handleQuickAdd}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleQuickAdd}
                disabled={!item.isAvailable}
                className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{item.isAvailable ? "Add" : "Sold Out"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
