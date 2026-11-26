"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { TableSelectorModal } from "./table-selector-modal";
import { ShoppingBag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onOpenCart?: () => void;
}

export function Navbar({ onOpenCart }: NavbarProps) {
  const { selectedTable, cartCount } = useRestaurant();
  const [tableModalOpen, setTableModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white/80 border border-border/60 shadow-xs">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={32}
                height={32}
                className="h-full w-full object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-sm tracking-tight text-foreground">DROPOUT</span>
              <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase mt-0.5">Cafe &amp; Restro</span>
            </div>
          </Link>

          {/* Right: Table + Cart */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTableModalOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                selectedTable
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-muted/70 border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{selectedTable || "Select Table"}</span>
              <span className="sm:hidden">{selectedTable ? selectedTable.replace("Table ", "T") : "Table"}</span>
            </button>

            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="relative flex items-center justify-center h-9 px-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:bg-primary/95 transition-transform active:scale-95"
                aria-label="View cart"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary text-[10px] font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <TableSelectorModal open={tableModalOpen} onOpenChange={setTableModalOpen} />
    </>
  );
}
