"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DietBadge } from "@/components/ui/diet-badge";
import { formatCurrency } from "@/lib/utils";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Plus, Minus, Trash2, ArrowRight, UtensilsCrossed, MapPin, ChevronLeft } from "lucide-react";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
  onSelectTable: () => void;
}

export function CartDrawer({
  open,
  onOpenChange,
  onCheckout,
  onSelectTable,
}: CartDrawerProps) {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartTax,
    cartTotal,
    selectedTable,
    clearCart,
  } = useRestaurant();

  const handleProceed = () => {
    if (!selectedTable) {
      onSelectTable();
      return;
    }
    onOpenChange(false);
    onCheckout();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 rounded-lg overflow-hidden bg-white border border-border/70 p-0.5 shadow-2xs">
              <Image
                src="/logo.png"
                alt="DROPOUT Cafe"
                width={24}
                height={24}
                className="h-full w-full object-contain"
              />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight">Your Order Cart</DialogTitle>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors mr-6 font-medium"
            >
              Clear Cart
            </button>
          )}
        </DialogHeader>

        {/* Table indicator reminder */}
        <div className="bg-secondary/60 px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs border-b border-border/50">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Dining Table:</span>
          </div>
          {selectedTable ? (
            <button
              onClick={onSelectTable}
              className="font-black text-primary hover:underline flex items-center gap-1"
            >
              <span>{selectedTable}</span>
              <span className="text-[10px] text-muted-foreground font-normal">(change)</span>
            </button>
          ) : (
            <button
              onClick={onSelectTable}
              className="font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse text-[11px]"
            >
              Select Table Now
            </button>
          )}
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-border/40">
          {cart.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">Your cart is empty</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Browse our combos, chai, momos, burgers & flatbreads to add delicious items.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs mt-2"
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pt-3.5 first:pt-0 flex items-start justify-between gap-3">
                {/* Item Thumbnail */}
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-muted">
                  <Image
                    src={item.menuItem.imageUrl}
                    alt={item.menuItem.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <DietBadge type={item.menuItem.dietType} size="sm" />
                    <h5 className="font-bold text-sm text-foreground line-clamp-1">
                      {item.menuItem.name}
                    </h5>
                    {item.selectedVariant && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                        {item.selectedVariant.name}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-foreground block">
                    {formatCurrency(item.unitPrice)}
                  </span>

                  {/* Add-ons list */}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {item.selectedAddOns.map((addon) => (
                        <span key={addon.id} className="block text-primary/90 font-medium">
                          + {addon.name} ({formatCurrency(addon.price)})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Special instruction note */}
                  {item.specialInstructions && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 italic bg-muted/60 px-2 py-0.5 rounded-md inline-block">
                      Note: &quot;{item.specialInstructions}&quot;
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-black text-sm text-foreground">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>

                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1 shadow-2xs">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          removeFromCart(item.id);
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Decrease quantity"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-3 w-3 text-destructive" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-muted text-foreground transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill summary and checkout actions */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-border/80 bg-background space-y-3">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {cartTax > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-foreground">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restaurant GST</span>
                    <span className="font-semibold text-foreground">{formatCurrency(cartTax)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/60">
                <span>Total Amount</span>
                <span className="text-base text-primary font-black">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl text-xs font-bold gap-1 px-3 border-border"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Add More</span>
              </Button>

              <Button
                onClick={handleProceed}
                className="flex-1 h-11 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow"
              >
                <span>{selectedTable ? "Proceed to Checkout" : "Select Table & Order"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
