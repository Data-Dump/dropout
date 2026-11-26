"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { normalizeTableNumber, formatCurrency } from "@/lib/utils";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Navbar } from "@/components/common/navbar";
import { Footer } from "@/components/common/footer";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { CartDrawer } from "@/components/menu/cart-drawer";
import { CheckoutModal } from "@/components/checkout/checkout-modal";
import { MenuItem, DietType } from "@/types";
import { ArrowRight, Search, Coffee, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TableLandingPage() {
  const params = useParams();
  const rawTableId = params?.tableId as string;

  const validTable = useMemo(() => normalizeTableNumber(rawTableId), [rawTableId]);

  const { selectedTable, setSelectedTable, menuItems, categories, cartCount, cartTotal } = useRestaurant();

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDiet, setSelectedDiet] = useState<DietType | "all">("all");

  useEffect(() => {
    if (validTable && selectedTable !== validTable) {
      setSelectedTable(validTable);
      toast.success(`Connected to ${validTable}`);
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
          if (!matchesCategory) return false;
        }
        if (selectedDiet !== "all" && item.dietType !== selectedDiet) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.tags?.some((t) => t.toLowerCase().includes(q));
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [menuItems, selectedCategory, selectedDiet, searchQuery]);

  if (!validTable) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container max-w-md mx-auto my-auto px-4 py-16 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Invalid Table QR</h2>
          <p className="text-xs text-muted-foreground">
            Table &quot;{rawTableId}&quot; is not recognised. We serve Tables 01–10.
          </p>
          <Link href="/" className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm">
            Go to Menu
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar onOpenCart={() => setCartOpen(true)} />

      {/* Table banner */}
      <div className="border-b border-border/60 bg-background px-4 sm:px-6 py-3">
        <div className="container max-w-6xl mx-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{validTable} — orders delivered to your table</span>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-card pl-9 pr-8 py-2 text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedCategory === "all" ? "bg-[#211D1A] text-[#FAF8F5]" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat.id ? "bg-[#211D1A] text-[#FAF8F5]" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
            <span className="mx-1 text-border">|</span>
            <button
              onClick={() => setSelectedDiet("all")}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${selectedDiet === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedDiet("veg")}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${selectedDiet === "veg" ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
              Veg
            </button>
            <button
              onClick={() => setSelectedDiet("egg")}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${selectedDiet === "egg" ? "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 inline-block" />
              Egg
            </button>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-5 flex-1">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Coffee className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">Nothing found</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedDiet("all"); }}
              className="text-xs font-bold text-primary underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onOpenDetails={(i) => { setActiveItem(i); setItemModalOpen(true); }}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Mobile cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-40 max-w-lg mx-auto sm:hidden animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full rounded-2xl bg-[#211D1A] text-[#FAF8F5] p-3 shadow-xl flex items-center justify-between active:scale-[0.98] transition-all border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-black text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-stone-400 block">{validTable}</span>
                <span className="font-black text-sm">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-primary">
              <span>View Cart</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => setCheckoutOpen(true)} onSelectTable={() => {}} />
      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
      <MenuItemModal item={activeItem} open={itemModalOpen} onOpenChange={setItemModalOpen} />
    </div>
  );
}
