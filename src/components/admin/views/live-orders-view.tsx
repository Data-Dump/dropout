"use client";

import React, { useState, useMemo } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { MenuItem } from "@/types";
import { MOCK_MENU_ITEMS } from "@/lib/data/mock-menu";
import { formatCurrency, normalizeOrderStatus, normalizePaymentStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DietBadge } from "@/components/ui/diet-badge";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  QrCode,
  AlertTriangle,
  RotateCcw,
  Ticket,
  Layers,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

function getComboBreakdown(
  item: { name: string; menuItemId?: string; isCombo?: boolean; comboIncludes?: string[] },
  menuItemsList: MenuItem[]
): string[] | null {
  if (item.comboIncludes && item.comboIncludes.length > 0) {
    return item.comboIncludes;
  }
  const cleanName = item.name.replace(/\s*\([^)]*\)$/, "").trim().toLowerCase();
  const matched = menuItemsList.find(
    (m) => m.id === item.menuItemId || m.name.toLowerCase() === cleanName
  );
  if (matched?.comboIncludes && matched.comboIncludes.length > 0) {
    return matched.comboIncludes;
  }
  if (
    matched?.description &&
    matched.description.includes("+") &&
    (matched.isCombo || matched.name.toLowerCase().includes("combo") || matched.categoryId?.includes("combo"))
  ) {
    return matched.description.split("+").map((s) => s.trim()).filter(Boolean);
  }
  const mockMatched = MOCK_MENU_ITEMS.find(
    (m) => m.name.toLowerCase() === cleanName || m.id === item.menuItemId
  );
  if (mockMatched?.comboIncludes && mockMatched.comboIncludes.length > 0) {
    return mockMatched.comboIncludes;
  }
  if (mockMatched?.description && mockMatched.description.includes("+")) {
    return mockMatched.description.split("+").map((s) => s.trim()).filter(Boolean);
  }
  if (item.name.toLowerCase().includes("combo") && matched?.description) {
    const parts = matched.description.split(/[\+,]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  return null;
}

export function LiveOrdersView() {
  const {
    orders,
    menuItems,
    updateOrderStatus,
    updatePaymentStatus,
    deleteOrder,
    clearAllOrders,
  } = useRestaurant();
  const [tabFilter, setTabFilter] = useState<"active" | "completed" | "all">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);

      // Filter by tab
      if (tabFilter === "active") {
        if (st === "COMPLETED" || st === "CANCELLED") return false;
      } else if (tabFilter === "completed") {
        if (st !== "COMPLETED") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesTable = o.tableNumber.toLowerCase().includes(q);
        const matchesCust = o.customerName?.toLowerCase().includes(q);
        const matchesItem = o.items.some((i) => i.name.toLowerCase().includes(q));
        return matchesNum || matchesTable || matchesCust || matchesItem;
      }
      return true;
    });
  }, [orders, tabFilter, searchQuery]);

  const activeCount = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return st !== "COMPLETED" && st !== "CANCELLED";
    }).length;
  }, [orders]);

  const completedCount = useMemo(() => {
    return orders.filter((o) => normalizeOrderStatus(o.status) === "COMPLETED").length;
  }, [orders]);

  const handleMarkCompleted = (orderId: string) => {
    updateOrderStatus(orderId, "COMPLETED");
    toast.success("Order cleared & marked Completed");
  };

  const handleMarkPaid = (orderId: string) => {
    updatePaymentStatus(orderId, "PAID");
    toast.success("Payment marked as PAID at Counter");
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      updateOrderStatus(orderId, "CANCELLED");
      toast.info("Order marked as Cancelled");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header, Search & Quick Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Simple Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setTabFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              tabFilter === "active"
                ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Live Customer Orders</span>
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-black">
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setTabFilter("completed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              tabFilter === "completed"
                ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Completed History</span>
            <span className="text-[11px] text-muted-foreground">({completedCount})</span>
          </button>

          <button
            onClick={() => setTabFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tabFilter === "all"
                ? "bg-[#211D1A] text-[#FAF8F5] shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All ({orders.length})</span>
          </button>
        </div>

        {/* Search & Empty Orders */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {orders.length > 0 && (
            <button
              onClick={async () => {
                if (confirm("Delete all current orders from queue and database?")) {
                  await clearAllOrders();
                  toast.success("All orders deleted and queue emptied.");
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive hover:text-white text-destructive text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Delete all orders and empty queue"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Empty All Orders</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search table, order, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-foreground text-sm">No orders in this view</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {tabFilter === "active"
              ? "All caught up! New orders placed by customers at Table 01-10 will appear here automatically."
              : "No orders match your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredOrders.map((ord) => {
            const st = normalizeOrderStatus(ord.status);
            const paySt = normalizePaymentStatus(ord.paymentStatus);
            const isPaid = paySt === "PAID";
            const isUpi = ord.paymentMethod === "upi_online";

            const elapsedMins = Math.max(
              0,
              Math.floor((Date.now() - new Date(ord.createdAt).getTime()) / (1000 * 60))
            );

            return (
              <div
                key={ord.id}
                className={`rounded-2xl border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
                  st === "COMPLETED"
                    ? "border-border/60 opacity-80"
                    : st === "CANCELLED"
                    ? "border-rose-200 opacity-60"
                    : isPaid
                    ? "border-emerald-200/80 shadow-xs"
                    : "border-border/80"
                }`}
              >
                <div>
                  {/* Card Header: Table Number & Order Number */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight">
                          {ord.tableNumber}
                        </span>
                        <Badge variant="stone" className="font-mono text-xs font-bold">
                          {ord.orderNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-semibold">
                          {elapsedMins === 0 ? "Just now" : `${elapsedMins}m ago`}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(ord.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Badges: Payment Mode & Status */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isPaid ? (
                        <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1 shadow-2xs">
                          {isUpi ? <QrCode className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          <span>PAID ({isUpi ? "UPI" : "Counter"}) • Ready to Cook</span>
                        </Badge>
                      ) : isUpi ? (
                        <Badge variant="amber" className="text-xs font-bold gap-1 animate-pulse">
                          <QrCode className="h-3 w-3" />
                          <span>UPI Pending</span>
                        </Badge>
                      ) : (
                        <Badge variant="stone" className="text-xs font-bold gap-1 bg-amber-100 text-amber-950 border border-amber-300">
                          <Ticket className="h-3 w-3 text-amber-800" />
                          <span>Token #{ord.orderNumber} • Awaiting Counter</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Customer Info & Notes */}
                  {(ord.customerName || ord.notes) && (
                    <div className="my-2.5 rounded-xl bg-secondary/40 p-2.5 text-xs space-y-0.5 border border-border/40">
                      {ord.customerName && (
                        <p className="font-bold text-foreground">
                          Guest: {ord.customerName} {ord.customerPhone && `• ${ord.customerPhone}`}
                        </p>
                      )}
                      {ord.notes && (
                        <p className="text-primary font-semibold italic">Note: {ord.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Ordered Items List (What to make) */}
                  <div className="my-3 space-y-2.5 divide-y divide-border/40">
                    {ord.items.map((item) => {
                      const comboContents = getComboBreakdown(item, menuItems);

                      return (
                        <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="h-6 w-6 rounded-md bg-secondary text-foreground font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {item.quantity}x
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <DietBadge type={item.dietType} size="sm" />
                                <span className="font-bold text-foreground text-sm">
                                  {item.name}
                                </span>
                                {comboContents && comboContents.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                    <span>Combo</span>
                                  </span>
                                )}
                              </div>

                              {/* COMBO CONTENTS BREAKDOWN */}
                              {comboContents && comboContents.length > 0 && (
                                <div className="mt-1.5 p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/50 text-[11px] space-y-1">
                                  <div className="flex items-center gap-1 font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                                    <Layers className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                    <span>Combo Contains ({comboContents.length} Items):</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {comboContents.map((cName, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/60 font-bold text-amber-950 dark:text-amber-100 shadow-2xs text-[11px]"
                                      >
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                        <span>{cName}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {item.selectedVariant && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-secondary text-[11px] font-semibold text-foreground mt-0.5">
                                  Portion: {item.selectedVariant.name}
                                </span>
                              )}
                              {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                                  + {item.selectedAddOns.map((a) => a.name).join(", ")}
                                </p>
                              )}
                              {item.specialInstructions && (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Note: &quot;{item.specialInstructions}&quot;</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="font-bold text-foreground shrink-0 text-xs">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions: Total & 1-Click Buttons */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Order Total:</span>
                    <span className="font-black text-base text-foreground">
                      {formatCurrency(ord.total)}
                    </span>
                  </div>

                  {st !== "COMPLETED" && st !== "CANCELLED" && (
                    <div className="space-y-2 pt-1">
                      {/* If Pay at counter is pending, show 1-click Mark Paid */}
                      {!isPaid && (
                        <button
                          onClick={() => handleMarkPaid(ord.id)}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Mark as Paid ({formatCurrency(ord.total)})</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        {/* 1-Click Done / Served Button */}
                        <button
                          onClick={() => handleMarkCompleted(ord.id)}
                          className="flex-1 py-2 rounded-xl bg-[#211D1A] hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Done & Served (Complete)</span>
                        </button>

                        {/* Cancel Button */}
                        <button
                          onClick={() => handleCancelOrder(ord.id)}
                          className="px-3 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                          title="Cancel Order"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>

                        {/* Direct Delete Button */}
                        <button
                          onClick={async () => {
                            if (confirm(`Permanently delete order ${ord.orderNumber}?`)) {
                              await deleteOrder(ord.id);
                              toast.success(`Order ${ord.orderNumber} deleted.`);
                            }
                          }}
                          className="px-2.5 py-2 rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-bold text-xs flex items-center justify-center gap-1 transition-all"
                          title="Permanently Delete Order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {st === "COMPLETED" && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Completed & Cleared</span>
                      </span>
                      <button
                        onClick={() => updateOrderStatus(ord.id, "NEW")}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        title="Re-open order if needed"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Re-open</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
