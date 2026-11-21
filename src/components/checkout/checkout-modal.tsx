"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { PaymentMethod } from "@/types";
import {
  QrCode,
  CheckCircle2,
  MapPin,
  FileText,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const router = useRouter();
  const { selectedTable, cart, cartSubtotal, cartTax, cartTotal, placeOrder } = useRestaurant();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("counter");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) {
      toast.error("Please select a dining table before placing your order.");
      return;
    }

    const trimmedName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, "");

    if (!trimmedName) {
      toast.error("Please enter your name to proceed.");
      return;
    }

    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number to proceed.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Duplicate submission protection: unique client idempotency token
      const idempotencyKey = `drp_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const order = await placeOrder({
        tableNumber: selectedTable,
        paymentMethod,
        customerName: trimmedName,
        customerPhone: cleanPhone,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      // If paying via UPI PhonePe, initiate the server-side payment session
      if (paymentMethod === "upi_online") {
        try {
          const payRes = await fetch("/api/payments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              customerPhone: customerPhone.trim() || undefined,
              idempotencyKey,
            }),
          });
          if (payRes.ok) {
            toast.info("PhonePe UPI payment session generated");
          }
        } catch (payErr) {
          console.warn("Payment session initiation warning:", payErr);
        }
      }

      toast.success(`Order #${order.orderNumber} placed successfully!`, {
        description: `Delivering directly to ${order.tableNumber}`,
      });

      onOpenChange(false);
      router.push(`/order/${order.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedTable || cart.length === 0) return null;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header with Table Number */}
        <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-[#FAF8F5] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 rounded-lg overflow-hidden bg-white border border-border/70 p-0.5 shadow-2xs">
                <Image
                  src="/logo.png"
                  alt="DROPOUT Cafe"
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-xs">
                <MapPin className="h-3.5 w-3.5" />
                {selectedTable}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {totalItemsCount} {totalItemsCount === 1 ? "Item" : "Items"}
            </span>
          </div>
          <DialogTitle className="text-xl font-black mt-2 tracking-tight text-foreground">
            Review & Place Order
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Your order will be prepared immediately for {selectedTable}.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Order Items Summary Box */}
          <div className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Order Summary</span>
            </div>

            <div className="space-y-2 divide-y divide-border/40 text-xs">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">
                      {item.quantity}x {item.menuItem.name}
                    </span>
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {item.selectedAddOns.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <p className="text-[11px] text-primary italic">
                        Note: &quot;{item.specialInstructions}&quot;
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-foreground shrink-0">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="pt-2.5 border-t border-border/70 space-y-1 text-xs">
              {cartTax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
              )}
              {cartTax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span>
                  <span>{formatCurrency(cartTax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border/60">
                <span>Total Amount</span>
                <span className="text-primary text-base font-black">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Choose Payment Option
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Pay at Counter (Active / Recommended) */}
              <button
                type="button"
                onClick={() => setPaymentMethod("counter")}
                className={`flex flex-col p-3.5 rounded-xl border text-left transition-all relative ${
                  paymentMethod === "counter"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="font-bold text-xs sm:text-sm text-foreground">Pay at Counter</span>
                  </div>
                  {paymentMethod === "counter" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Get a Token number. Confirm or pay at counter (Cash/Card/UPI) to begin cooking.
                </p>
              </button>

              {/* UPI Online via PhonePe (Currently Unavailable) */}
              <button
                type="button"
                onClick={() => {
                  toast.info("PhonePe online payment is currently unavailable. Please select Pay at Counter.");
                }}
                className="flex flex-col p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/40 text-left transition-all relative cursor-not-allowed opacity-75 hover:bg-muted/60"
                title="PhonePe online payment is currently unavailable"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-xs sm:text-sm text-muted-foreground">Instant UPI (PhonePe)</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                    Currently Unavailable
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  PhonePe gateway is temporarily unavailable. Please choose Pay at Counter.
                </p>
              </button>
            </div>
          </div>

          {/* Customer Details (Mandatory) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Guest Info <span className="text-destructive font-black">*</span>
              </label>
              <span className="text-[10px] text-destructive font-bold bg-destructive/10 px-2 py-0.5 rounded-full">
                Required to Order
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Your Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-Digit Mobile Number *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Kitchen / Dining Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Dining Notes / Request (Optional)</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Please bring glasses with water, dining with kids..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Verification / Preparation notice */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/70 text-xs flex items-center gap-2.5">
            <Ticket className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {paymentMethod === "counter"
                ? "You will get a Dining Token. Show it at the counter or pay cash/card so cooking can begin."
                : "UPI payments are verified instantly. Your food is prepared directly for your table."}
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-sm font-black gap-2 rounded-xl shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Confirm & Place Order ({formatCurrency(cartTotal)})</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
