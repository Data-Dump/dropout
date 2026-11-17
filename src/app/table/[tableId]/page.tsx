"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { normalizeTableNumber, formatCurrency } from "@/lib/utils";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Navbar } from "@/components/common/navbar";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { CartDrawer } from "@/components/menu/cart-drawer";
import { CheckoutModal } from "@/components/checkout/checkout-modal";
import { MenuItem, DietType } from "@/types";
import { CAFE_DETAILS } from "@/lib/data/mock-menu";
import {
  MapPin,
  CheckCircle2,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Coffee,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TableLandingPage() {
  const params = useParams();
  const rawTableId = params?.tableId as string;

  const validTable = useMemo(() => {
    return normalizeTableNumber(rawTableId);
  }, [rawTableId]);

  const {
    selectedTable,
    setSelectedTable,
    menuItems,
    categories,
    cartCount,
    cartTotal,
  } = useRestaurant();

  // Modals
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDiet, setSelectedDiet] = useState<DietType | "all">("all");

  // Lock table on mount
  useEffect(() => {
    if (validTable && selectedTable !== validTable) {
      setSelectedTable(validTable);
      toast.success(`Connected to ${validTable}`, {
        description: "Your orders will be delivered directly to this table.",
      });
    }
  }, [validTable, selectedTable, setSelectedTable]);

  const filteredItems = useMemo(() => {
    return menuItems
      .filter((item) => {
        if (selectedCategory !== "all") {
          const matchesCategory =
            item.categoryId === selectedCategory ||
            (selectedCategory === "cat-combos" && (item.categoryId === "c0000000-0000-0000-0000-000000000001" || item.categoryName?.toLowerCase().includes("combo"))) ||
            (selectedCategory === "c0000000-0000-0000-0000-000000000001" && (item.categoryId === "cat-combos" || item.categoryName?.toLowerCase().includes("combo")));
          if (!matchesCategory) {
            return false;
          }
        }
        if (selectedDiet !== "all" && item.dietType !== selectedDiet) {
          return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tags?.some((t) => t.toLowerCase().includes(query)) ||
            item.categoryName?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });
  }, [menuItems, selectedCategory, selectedDiet, searchQuery]);

  if (!validTable) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container max-w-md mx-auto my-auto px-4 py-16 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Invalid Table QR Code
          </h2>
          <p className="text-xs text-muted-foreground">
            DROPOUT Cafe & Restro currently serves Tables 01 to 10. The table link &quot;{rawTableId}&quot; could not be recognized.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm"
            >
              Go to Main Menu
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28 sm:pb-16 overflow-x-hidden">
      <Navbar onOpenCart={() => setCartOpen(true)} />

      {/* Table Welcome Banner */}
      <section className="border-b border-border/70 bg-[#FAF8F5] pt-5 pb-5 px-4 sm:px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>QR Connected: {validTable}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Welcome to {CAFE_DETAILS.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Browse our complete menu below. Order with UPI or Pay at Counter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Orders will be brought to {validTable}</span>
              </div>
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
              className="w-full rounded-2xl border border-border/80 bg-white pl-10 pr-9 py-2.5 text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
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

      {/* Sticky Category & Diet Filters */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 py-2.5 px-4 sm:px-6 shadow-2xs">
        <div className="container max-w-6xl mx-auto space-y-2">
          {/* Categories */}
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
            {categories.map((cat) => {
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

          {/* Diet filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="h-3 w-3" />
              Diet:
            </span>
            <button
              onClick={() => setSelectedDiet("all")}
              className={`shrink-0 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedDiet === "all" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
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

      {/* Menu Grid */}
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
              Try searching for Chai, Momos or clear the search filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onOpenDetails={(i) => {
                  setActiveItem(i);
                  setItemModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-40 max-w-lg mx-auto sm:hidden animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full rounded-2xl bg-[#211D1A] text-[#FAF8F5] p-3 shadow-xl flex items-center justify-between active:scale-[0.98] transition-all border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-black text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <span className="text-[11px] text-stone-300 block font-medium">{validTable}</span>
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
        onSelectTable={() => {}}
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
    </div>
  );
}
