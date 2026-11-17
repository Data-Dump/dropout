"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { TableSelectorModal } from "./table-selector-modal";
import { ShoppingBag, Coffee, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onOpenCart?: () => void;
}

export function Navbar({ onOpenCart }: NavbarProps) {
  const pathname = usePathname();
  const { selectedTable, cartCount } = useRestaurant();
  const [tableModalOpen, setTableModalOpen] = useState(false);

  const isMenu = pathname === "/" || pathname.startsWith("/menu") || pathname.startsWith("/table");
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/80 border border-border/60 shadow-xs transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain p-0.5"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-foreground">
                  DROPOUT
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase leading-none mt-1">
                  Cafe & Restro
                </span>
              </div>
            </Link>

            {/* Table Selector Pill */}
            <button
              onClick={() => setTableModalOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                selectedTable
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-muted/70 border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{selectedTable || "Select Table (01-10)"}</span>
            </button>
          </div>

          {/* Center Navigation — Menu only (Admin hidden from customer view) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                isMenu
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Coffee className="h-4 w-4" />
              <span>Menu</span>
            </Link>
          </nav>

          {/* Right Action: Table on Mobile & Cart Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTableModalOpen(true)}
              className={cn(
                "sm:hidden flex items-center justify-center h-9 px-2 rounded-lg text-xs font-semibold border",
                selectedTable
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {selectedTable ? selectedTable.replace("Table ", "T-") : "Table"}
            </button>

            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="relative flex items-center justify-center h-10 px-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:bg-primary/95 transition-transform active:scale-95"
                aria-label="View Order Cart"
              >
                <ShoppingBag className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Order</span>
                {cartCount > 0 && (
                  <span className="ml-1 sm:ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary text-xs font-bold shadow">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <TableSelectorModal
        open={tableModalOpen}
        onOpenChange={setTableModalOpen}
      />
    </>
  );
}
