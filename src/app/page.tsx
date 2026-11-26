"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Navbar } from "@/components/common/navbar";
import { Footer } from "@/components/common/footer";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { CartDrawer } from "@/components/menu/cart-drawer";
import { CheckoutModal } from "@/components/checkout/checkout-modal";
import { TableSelectorModal } from "@/components/common/table-selector-modal";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { MenuItem, DietType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Coffee,
  X,
} from "lucide-react";

export default function HomePage() {
  const {
    menuItems,
    categories,
    selectedTable,
    cartCount,
    cartTotal,
  } = useRestaurant();

  // Modal states
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDiet, setSelectedDiet] = useState<DietType | "all">("all");

  const filteredItems = useMemo(() => {
    return menuItems
      .filter((item) => {
        // Category filter
        if (selectedCategory !== "all") {
          const matchesCategory =
            item.categoryId === selectedCategory ||
            (selectedCategory === "cat-combos" && (item.categoryId === "c0000000-0000-0000-0000-000000000001" || item.categoryName?.toLowerCase().includes("combo"))) ||
            (selectedCategory === "c0000000-0000-0000-0000-000000000001" && (item.categoryId === "cat-combos" || item.categoryName?.toLowerCase().includes("combo")));
          if (!matchesCategory) {
            return false;
          }
        }
        // Diet filter
        if (selectedDiet !== "all" && item.dietType !== selectedDiet) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(query);
          const matchesDesc = item.description.toLowerCase().includes(query);
          const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query));
          const matchesCat = item.categoryName?.toLowerCase().includes(query);
          return matchesName || matchesDesc || matchesTags || matchesCat;
        }
        return true;
      })
      .sort((a, b) => {
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });
  }, [menuItems, selectedCategory, selectedDiet, searchQuery]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [categories]);

  const handleOpenItem = (item: MenuItem) => {
    setActiveItem(item);
    setItemModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28 sm:pb-16 overflow-x-hidden">
      {/* Top Header */}
      <Navbar onOpenCart={() => setCartOpen(true)} />

      {/* Hero & Cafe Branding */}
      <section className="border-b border-border/70 bg-gradient-to-b from-[#FAF8F5] to-background pt-5 pb-5 px-4 sm:px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Branding */}
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl overflow-hidden bg-white shadow-xs border border-border/70 p-1">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe"
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-wider uppercase">
                  <Sparkles className="h-3 w-3" />
                  <span>Modern Indian Cafe & Restro</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {CAFE_DETAILS.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {CAFE_DETAILS.tagline} • Serving Table 01 to 10
                </p>
              </div>
            </div>

            {/* Prominent Table Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs flex items-center justify-between sm:gap-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                    Your Dining Table
                  </span>
                  <span className="font-black text-sm sm:text-base text-foreground">
                    {selectedTable ? selectedTable : "No Table Selected"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setTableModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold border border-border transition-all active:scale-95"
              >
                {selectedTable ? "Change" : "Select Table"}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Chai, Momos, Combos, Burgers, Maggie, Pizza..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-card pl-10 pr-9 py-2.5 text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Categories & Diet Filters */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 py-2.5 px-4 sm:px-6 shadow-2xs">
        <div className="container max-w-6xl mx-auto space-y-2">
          {/* Horizontally Scrollable Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({menuItems.length})
            </button>
            {sortedCategories.map((cat) => {
              const count = menuItems.filter((i) =>
                i.categoryId === cat.id ||
                (cat.id === "cat-combos" && (i.categoryId === "c0000000-0000-0000-0000-000000000001" || i.categoryName?.toLowerCase().includes("combo"))) ||
                (cat.id === "c0000000-0000-0000-0000-000000000001" && (i.categoryId === "cat-combos" || i.categoryName?.toLowerCase().includes("combo")))
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] font-normal opacity-80 ${selectedCategory === cat.id ? "text-stone-300" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Diet Filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="h-3 w-3" />
              Diet:
            </span>
            <button
              onClick={() => setSelectedDiet("all")}
              className={`shrink-0 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedDiet === "all"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Diets
            </button>
            <button
              onClick={() => setSelectedDiet("veg")}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedDiet === "veg"
                  ? "bg-emerald-500/10 text-emerald-700 font-bold ring-1 ring-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
              Pure Veg
            </button>
            <button
              onClick={() => setSelectedDiet("egg")}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedDiet === "egg"
                  ? "bg-amber-500/10 text-amber-700 font-bold ring-1 ring-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 inline-block" />
              Egg Dishes
            </button>
          </div>
        </div>
      </section>

      {/* Main Menu Grid */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-5 flex-1">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Coffee className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">
              No items match your search
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Try searching for Chai, Fries, Momos or clear active dietary filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedDiet("all");
              }}
              className="text-xs font-bold text-primary underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onOpenDetails={handleOpenItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Website Footer with Brand, Quick Links & Policy Compliance */}
      <Footer />

      {/* Floating Bottom Cart Bar (Mobile First) */}
      {cartCount > 0 && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 max-w-lg mx-auto sm:hidden animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full rounded-2xl bg-[#211D1A] text-[#FAF8F5] p-3 shadow-xl flex items-center justify-between active:scale-[0.98] transition-all border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <span className="text-[11px] text-stone-300 block font-medium">
                  {selectedTable ? selectedTable : "Select Table"}
                </span>
                <span className="font-black text-sm">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-black text-primary">
              <span>View Cart</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Modals */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => setCheckoutOpen(true)}
        onSelectTable={() => setTableModalOpen(true)}
      />

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />

      <MenuItemModal
        item={activeItem}
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
      />

      <TableSelectorModal
        open={tableModalOpen}
        onOpenChange={setTableModalOpen}
      />
    </div>
  );
}
