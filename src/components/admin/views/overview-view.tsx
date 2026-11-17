"use client";

import React, { useMemo } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { formatCurrency, normalizeOrderStatus, normalizePaymentStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DietBadge } from "@/components/ui/diet-badge";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  QrCode,
  CreditCard,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface OverviewViewProps {
  onNavigateTab: (tab: string) => void;
}

export function OverviewView({ onNavigateTab }: OverviewViewProps) {
  const { orders, tables, menuItems, updateOrderStatus, updatePaymentStatus } = useRestaurant();

  // Metrics calculation
  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => normalizeOrderStatus(o.status) !== "CANCELLED");
    const todaySales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrdersCount = orders.length;

    const pendingOrders = orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(st);
    }).length;

    const completedOrders = orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return st === "COMPLETED" || st === "SERVED";
    }).length;

    // Payment breakdown
    const upiOrders = validOrders.filter((o) => o.paymentMethod === "upi_online");
    const counterOrders = validOrders.filter((o) => o.paymentMethod === "counter");

    const upiTotal = upiOrders.reduce((sum, o) => sum + o.total, 0);
    const counterTotal = counterOrders.reduce((sum, o) => sum + o.total, 0);

    const paidTotal = validOrders
      .filter((o) => normalizePaymentStatus(o.paymentStatus) === "PAID")
      .reduce((sum, o) => sum + o.total, 0);

    const pendingPaymentTotal = validOrders
      .filter((o) => normalizePaymentStatus(o.paymentStatus) === "PENDING")
      .reduce((sum, o) => sum + o.total, 0);

    // Popular menu items calculation
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number; dietType: "veg" | "non-veg" | "egg"; category: string }>();

    validOrders.forEach((ord) => {
      ord.items.forEach((item) => {
        const existing = itemMap.get(item.menuItemId) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
          dietType: item.dietType,
          category: menuItems.find((m) => m.id === item.menuItemId)?.categoryName || "General",
        };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.menuItemId, existing);
      });
    });

    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Occupied tables count
    const occupiedTables = tables.filter((t) => t.status === "occupied" || t.status === "needs_attention").length;

    return {
      todaySales,
      todayOrdersCount,
      pendingOrders,
      completedOrders,
      upiTotal,
      counterTotal,
      paidTotal,
      pendingPaymentTotal,
      popularItems,
      occupiedTables,
    };
  }, [orders, tables, menuItems]);

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 6);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Today&apos;s Gross Sales
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(metrics.todaySales)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.todayOrdersCount} total orders logged
          </p>
        </div>

        {/* Today's Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Today&apos;s Orders
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {metrics.todayOrdersCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.occupiedTables} of 10 tables currently occupied
          </p>
        </div>

        {/* Pending Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending in Kitchen
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight text-amber-600">
            {metrics.pendingOrders}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Awaiting preparation & plating
          </p>
        </div>

        {/* Completed Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Completed Orders
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {metrics.completedOrders}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Served & finalized successfully
          </p>
        </div>
      </div>

      {/* Middle Grid: Payment Breakdown & Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Breakdown Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground tracking-tight">
              Payment Breakdown
            </h3>
            <button
              onClick={() => onNavigateTab("payments")}
              className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>View all</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {/* UPI */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    UPI (PhonePe / Apps)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Online QR Settlement</span>
                </div>
              </div>
              <span className="font-black text-sm text-foreground">
                {formatCurrency(metrics.upiTotal)}
              </span>
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    Pay at Counter
                  </span>
                  <span className="text-[10px] text-muted-foreground">Cash / Card / POS Terminal</span>
                </div>
              </div>
              <span className="font-black text-sm text-foreground">
                {formatCurrency(metrics.counterTotal)}
              </span>
            </div>
          </div>

          {/* Settled vs Pending Status */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Settled:</span>
              <span className="font-bold text-foreground">{formatCurrency(metrics.paidTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-bold text-amber-700">{formatCurrency(metrics.pendingPaymentTotal)}</span>
            </div>
          </div>
        </div>

        {/* Popular Menu Items */}
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black text-foreground tracking-tight">
                Top Selling Items Today
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("menu")}
              className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Manage Menu</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.popularItems.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-secondary text-foreground font-black text-[11px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <DietBadge type={item.dietType} size="sm" />
                  <div>
                    <h5 className="font-bold text-foreground line-clamp-1">{item.name}</h5>
                    <span className="text-[10px] text-muted-foreground">{item.category}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-foreground block">
                    {formatCurrency(item.revenue)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {item.quantity} orders
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-foreground tracking-tight">
              Recent Orders Feed
            </h3>
            <p className="text-xs text-muted-foreground">
              Real-time customer orders from Tables 01 to 10
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("orders")}
            className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5"
          >
            <span>Live Order Desk</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Table</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-foreground">
                    {o.orderNumber}
                  </td>
                  <td className="py-3 px-3 font-black text-foreground">
                    {o.tableNumber}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                    {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </td>
                  <td className="py-3 px-3 font-black text-foreground">
                    {formatCurrency(o.total)}
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        normalizeOrderStatus(o.status) === "READY"
                          ? "emerald"
                          : normalizeOrderStatus(o.status) === "PREPARING"
                          ? "amber"
                          : normalizeOrderStatus(o.status) === "COMPLETED" || normalizeOrderStatus(o.status) === "SERVED"
                          ? "stone"
                          : normalizeOrderStatus(o.status) === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {normalizeOrderStatus(o.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold">
                        {o.paymentMethod === "upi_online" ? "UPI" : "Counter"}
                      </span>
                      <Badge
                        variant={
                          normalizePaymentStatus(o.paymentStatus) === "PAID"
                            ? "emerald"
                            : normalizePaymentStatus(o.paymentStatus) === "REFUNDED"
                            ? "stone"
                            : normalizePaymentStatus(o.paymentStatus) === "FAILED"
                            ? "destructive"
                            : "amber"
                        }
                        className="text-[10px] py-0"
                      >
                        {normalizePaymentStatus(o.paymentStatus)}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {normalizePaymentStatus(o.paymentStatus) !== "PAID" && normalizeOrderStatus(o.status) !== "CANCELLED" && (
                        <button
                          onClick={() => {
                            updatePaymentStatus(o.id, "PAID");
                            toast.success(`Order ${o.orderNumber} marked as Paid`);
                          }}
                          className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] hover:bg-emerald-100"
                        >
                          Mark Paid
                        </button>
                      )}
                      {normalizeOrderStatus(o.status) !== "COMPLETED" && normalizeOrderStatus(o.status) !== "CANCELLED" && (
                        <button
                          onClick={() => {
                            updateOrderStatus(o.id, "COMPLETED");
                            toast.success(`Order ${o.orderNumber} marked as Done`);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#211D1A] text-white font-bold text-[10px] hover:bg-black"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
