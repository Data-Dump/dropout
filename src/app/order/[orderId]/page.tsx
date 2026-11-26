"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Navbar } from "@/components/common/navbar";
import { Footer } from "@/components/common/footer";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, normalizePaymentStatus } from "@/lib/utils";
import { Order } from "@/types";
import {
  CheckCircle2,
  CheckCircle,
  MapPin,
  ArrowLeft,
  Share2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Coffee,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentSessionData {
  paymentUrl: string;
  qrImage: string;
  upiUri: string;
  merchantTransactionId: string;
  intentLinks: {
    generic: string;
    phonepe: string;
    gpay: string;
    paytm: string;
    bhim: string;
  };
}

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const { getOrderById, updatePaymentStatus } = useRestaurant();

  const storeOrder = getOrderById(orderId);
  const [remoteOrder, setRemoteOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(!storeOrder);

  // PhonePe UPI Payment Session state
  const [paymentSession, setPaymentSession] = useState<PaymentSessionData | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Active order object from local store or fetched API
  const order: Order | undefined = storeOrder || remoteOrder || undefined;

  // Supabase Realtime subscription & initial fetch if not in local store
  useEffect(() => {
    let isMounted = true;

    if (!storeOrder && orderId) {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (Array.isArray(data?.orders)) {
            const found = data.orders.find((o: Order) => o.id === orderId || o.orderNumber === orderId);
            if (found) setRemoteOrder(found);
          }
          setIsLoading(false);
        })
        .catch(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [orderId, storeOrder]);

  // Request PhonePe UPI Payment Session if UPI Online is chosen and pending
  useEffect(() => {
    if (!order || order.paymentMethod !== "upi_online" || normalizePaymentStatus(order.paymentStatus) === "PAID") {
      return;
    }

    let isMounted = true;

    async function initPaymentSession() {
      try {
        const res = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order?.id,
            orderNumber: order?.orderNumber,
            amountPaise: order?.totalPaise || Math.round((order?.total || 0) * 100),
            customerName: order?.customerName,
            customerPhone: order?.customerPhone,
            idempotencyKey: order?.idempotencyKey,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.success) {
            const sessionData = data.session || data;
            setPaymentSession(sessionData);
          }
        }
      } catch (err) {
        console.warn("Could not initiate PhonePe payment session:", err);
      }
    }

    initPaymentSession();

    return () => {
      isMounted = false;
    };
  }, [order]);

  // Verify payment status with server
  const handleVerifyPayment = useCallback(async (isAutoPoll = false) => {
    if (!order) return;
    if (!isAutoPoll) setIsVerifyingPayment(true);

    try {
      const mtx = paymentSession?.merchantTransactionId || "";
      const res = await fetch(`/api/payments/verify?orderId=${encodeURIComponent(order.id)}&mtx=${encodeURIComponent(mtx)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "PAID") {
          updatePaymentStatus(order.id, "PAID");
          setRemoteOrder((prev) => (prev ? { ...prev, paymentStatus: "PAID" } : prev));
          toast.success("Payment verified successfully via PhonePe!");
        } else if (!isAutoPoll) {
          toast.info("Payment is still pending authorization.");
        }
      }
    } catch (e) {
      if (!isAutoPoll) console.warn("Verification error:", e);
    } finally {
      if (!isAutoPoll) setIsVerifyingPayment(false);
    }
  }, [order, paymentSession, updatePaymentStatus]);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `DROPOUT Cafe - Order #${order?.orderNumber}`,
          text: `Here is the receipt for our order at ${order?.tableNumber}.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Receipt link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container max-w-md mx-auto my-auto px-4 py-20 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            Loading order details...
          </p>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="container max-w-md mx-auto my-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Order Not Found</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find this order. Please check the order number or place a new order from your table.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            View Menu
          </Link>
        </main>
      </div>
    );
  }

  const tableSlug = order.tableNumber.toLowerCase().replace(/\s+/g, "");
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  const isPaid = paymentStatus === "PAID";
  const isCounter = order.paymentMethod === "counter";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      <Navbar />

      <main className="container max-w-lg mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/table/${tableSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Order more for {order.tableNumber}</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Bill</span>
          </button>
        </div>

        {/* Order Confirmed Header */}
        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-6 text-center space-y-2.5 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
              Order Confirmed & Placed!
            </span>
            <h1 className="text-2xl font-black text-foreground tracking-tight mt-0.5">
              Order #{order.orderNumber}
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-foreground font-black text-xs shadow-xs border border-emerald-200/80">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Dining At {order.tableNumber}</span>
          </div>

          <p className="text-xs text-muted-foreground max-w-xs mx-auto pt-1">
            Our cafe team has received your order and is preparing it fresh!
          </p>
        </div>

        {/* PAYMENT STATUS CARD */}
        {/* 1. Paid Online via UPI */}
        {isPaid && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-emerald-950">
                  Payment Confirmed ({formatCurrency(order.total)})
                </h4>
                <p className="text-[11px] text-emerald-800">
                  {order.paymentMethod === "upi_online" ? "Paid Online via UPI" : "Settled at Counter"} • Thank you!
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-black">
              PAID
            </Badge>
          </div>
        )}

        {/* 2. Pay at Counter - McDonald's / Starbucks Token Rule */}
        {!isPaid && isCounter && (
          <div className="rounded-3xl border-2 border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-900/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Dining Token
                  </span>
                  <h3 className="text-xl font-black text-amber-950 dark:text-amber-100">
                    Token #{order.orderNumber}
                  </h3>
                </div>
              </div>
              <Badge className="bg-amber-600 text-white font-bold text-xs uppercase px-2.5 py-1">
                Pay at Counter
              </Badge>
            </div>

            <div className="rounded-2xl bg-white dark:bg-card p-4 border border-amber-200/70 dark:border-amber-900/50 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-foreground font-semibold leading-relaxed">
                  Please show this <strong>Token #{order.orderNumber}</strong> at the counter (or pay <strong>{formatCurrency(order.total)}</strong> via cash/card).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-foreground font-semibold leading-relaxed">
                  Our chef will start freshly preparing your food as soon as your token is confirmed!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. UPI Online Pending Payment Card */}
        {!isPaid && !isCounter && (
          <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">UPI Payment</h3>
                  <p className="text-[11px] text-muted-foreground">Scan QR or pay via UPI App</p>
                </div>
              </div>
              <Badge variant="amber" className="animate-pulse font-bold text-xs">
                Awaiting Payment
              </Badge>
            </div>

            {/* Dynamic QR Code & Intent Deep Links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
              {paymentSession?.qrImage ? (
                <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-2xl bg-[#FAF8F5] border border-border/70 shrink-0">
                  <div className="relative w-44 h-44 rounded-xl overflow-hidden bg-white p-2 shadow-xs border">
                    <Image
                      src={paymentSession.qrImage}
                      alt="UPI QR Code"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">
                    Scan with any UPI App
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>PhonePe</span> • <span>GPay</span> • <span>Paytm</span>
                  </div>
                </div>
              ) : (
                <div className="w-full sm:w-52 p-4 flex flex-col items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 text-center text-xs space-y-2 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    PhonePe Gateway Offline
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Online UPI payment is currently unavailable. Please show <strong>Token #{order.orderNumber}</strong> at the counter to settle your bill.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="rounded-xl bg-secondary/40 p-3 text-xs space-y-1 border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Bill:</span>
                    <span className="font-black text-base text-primary">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Order Ref:</span>
                    <span className="font-mono">{order.orderNumber}</span>
                  </div>
                </div>

                {/* Mobile App Deep Links */}
                {paymentSession?.intentLinks && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Pay using Mobile App:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={paymentSession.intentLinks.phonepe}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#5f259f] hover:bg-[#4d1d82] text-white text-xs font-bold shadow-xs transition-all"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>PhonePe</span>
                      </a>
                      <a
                        href={paymentSession.intentLinks.gpay}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold shadow-xs transition-all"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                        <span>Google Pay</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Hosted Payment Page Redirect Link */}
                {paymentSession?.paymentUrl && paymentSession.paymentUrl.startsWith("http") && (
                  <a
                    href={paymentSession.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/95 transition-all"
                  >
                    <span>Open PhonePe Payment Page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {/* Manual Status Check Button */}
                <button
                  onClick={() => handleVerifyPayment(false)}
                  disabled={isVerifyingPayment}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-input bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isVerifyingPayment ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                  <span>{isVerifyingPayment ? "Checking status..." : "Refresh Payment Status"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Itemized Order Receipt */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-bold text-foreground">What You Ordered</h3>
            <span className="text-xs text-muted-foreground font-semibold">
              {order.items.length} dishes
            </span>
          </div>

          <div className="space-y-3 divide-y divide-border/40">
            {order.items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded bg-secondary text-foreground font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {item.quantity}x
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DietBadge type={item.dietType} size="sm" />
                      <span className="font-bold text-foreground text-sm">
                        {item.name}
                      </span>
                    </div>

                    {item.selectedVariant && (
                      <span className="inline-block px-1.5 py-0.2 rounded bg-secondary text-[11px] font-semibold text-foreground mt-0.5">
                        Portion: {item.selectedVariant.name}
                      </span>
                    )}

                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                        + {item.selectedAddOns.map((a) => a.name).join(", ")}
                      </p>
                    )}

                    {item.specialInstructions && (
                      <p className="text-[11px] text-primary italic mt-0.5">
                        Note: &quot;{item.specialInstructions}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <span className="font-bold text-foreground shrink-0 text-xs">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-border/60 space-y-1.5 text-xs">
            {order.tax > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Item Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST:</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-black text-foreground pt-1.5 border-t border-border/40">
              <span>Total Amount:</span>
              <span className="text-primary font-black">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3">
          <Link
            href={`/table/${tableSlug}`}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/95 transition-all"
          >
            <Coffee className="h-4 w-4" />
            <span>Order More for {order.tableNumber}</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
