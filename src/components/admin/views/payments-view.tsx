"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { PaymentMethod, PaymentStatus } from "@/types";
import { formatCurrency, normalizePaymentStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Receipt,
  Phone,
  Utensils,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface LedgerItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  dietType?: string;
  specialInstructions?: string;
}

interface LedgerPayment {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  amountPaise: number;
  amount: number;
  status: PaymentStatus;
  provider: string;
  merchantTransactionId?: string;
  providerReferenceId?: string;
  settledAt?: string;
  createdAt: string;
  items: LedgerItem[];
}

interface GroupedPayment {
  groupId: string;
  isGroup: boolean;
  orderCount: number;
  orderIds: string[];
  orderNumbers: string[];
  tableNumber: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  status: PaymentStatus;
  createdAt: string;
  merchantTransactionId?: string;
  providerReferenceId?: string;
  orders: LedgerPayment[];
  combinedItems: Array<LedgerItem & { orderNumber: string }>;
}

export function PaymentsView() {
  const { orders, updatePaymentStatus, clearAllOrders } = useRestaurant();

  const [dbPayments, setDbPayments] = useState<LedgerPayment[]>([]);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingTxnId, setCheckingTxnId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const fetchPayments = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/payments", {
        headers: { "x-staff-pin": "1234" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.payments)) {
          setDbPayments(data.payments);
          setHasLoadedFromDb(true);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn("Failed fetching payments history:", res.status, errJson);
        toast.error(errJson?.error || `Payments API error (${res.status})`);
      }
    } catch (e) {
      console.warn("Failed fetching payments history:", e);
      toast.error("Network error while connecting to payments ledger.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Combined transactions from DB or mapped from store, enriched with item details
  const allTransactions: LedgerPayment[] = useMemo(() => {
    // If successfully queried from Supabase database and has payments, use DB records enriched with store
    if (hasLoadedFromDb && dbPayments.length > 0) {
      return dbPayments.map((p) => {
        let items: LedgerItem[] = (p.items || []).map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          dietType: it.dietType,
          specialInstructions: it.specialInstructions,
        }));

        const matchedOrder = orders.find(
          (o) => o.id === p.orderId || o.orderNumber === p.orderNumber
        );

        // Fallback to store orders if dbPayments row lacks items
        if (items.length === 0 && matchedOrder && matchedOrder.items) {
          items = matchedOrder.items.map((oi) => ({
            id: oi.id,
            name: oi.name,
            quantity: oi.quantity,
            price: oi.price,
            dietType: oi.dietType,
            specialInstructions: oi.specialInstructions,
          }));
        }

        // SYNC STATUS: If the matching order in orders store is PAID, this payment is authoritative PAID!
        const isOrderPaid = matchedOrder && normalizePaymentStatus(matchedOrder.paymentStatus) === "PAID";
        const effectiveStatus: PaymentStatus = isOrderPaid ? "PAID" : normalizePaymentStatus(p.status);

        return {
          ...p,
          status: effectiveStatus,
          provider: "razorpay",
          items,
        };
      });
    }

    // When NOT loaded from DB yet, or if DB is empty, use active store orders
    const legacyMockNumbers = new Set([
      "DRP-2758", "DRP-8063", "DRP-2908", "DRP-2421", "DRP-9579", "DRP-7329", "DRP-9855"
    ]);
    const cleanOrders = orders.filter((o) => !legacyMockNumbers.has(o.orderNumber));

    return cleanOrders.map((o) => ({
      id: `p-${o.id}`,
      orderId: o.id,
      orderNumber: o.orderNumber,
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      paymentMethod: o.paymentMethod,
      amountPaise: Math.round(o.total * 100),
      amount: o.total,
      status: normalizePaymentStatus(o.paymentStatus),
      provider: "razorpay",
      merchantTransactionId: o.idempotencyKey ? `MT_${o.orderNumber}_${o.idempotencyKey.slice(0, 8)}` : undefined,
      createdAt: o.createdAt,
      items: (o.items || []).map((oi) => ({
        id: oi.id,
        name: oi.name,
        quantity: oi.quantity,
        price: oi.price,
        dietType: oi.dietType,
        specialInstructions: oi.specialInstructions,
      })),
    }));
  }, [hasLoadedFromDb, dbPayments, orders]);

  // Group Pay at Counter orders placed from the same table with the same contact phone
  const groupedPayments: GroupedPayment[] = useMemo(() => {
    const groupsMap = new Map<string, LedgerPayment[]>();

    for (const payment of allTransactions) {
      const paySt = normalizePaymentStatus(payment.status);
      const cleanPhone = (payment.customerPhone || "").replace(/\D/g, "").slice(-10);
      const cleanTable = payment.tableNumber.trim().toLowerCase();

      // Only group Pay at Counter orders with matching table & valid contact number
      if (payment.paymentMethod === "counter" && cleanPhone && cleanPhone.length === 10) {
        // Active pending orders group together for combined bill settlement
        // Settled orders group together by table, phone, and date
        const groupKey =
          paySt === "PENDING"
            ? `counter_${cleanTable}_${cleanPhone}_pending`
            : `counter_${cleanTable}_${cleanPhone}_settled_${payment.createdAt.slice(0, 10)}`;

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)!.push(payment);
      } else {
        // Individual entry for online UPI payments or standalone orders
        const standaloneKey = `single_${payment.id || payment.orderId}`;
        groupsMap.set(standaloneKey, [payment]);
      }
    }

    const result: GroupedPayment[] = [];

    groupsMap.forEach((txns, key) => {
      // Sort transactions chronologically (newest first)
      txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const latest = txns[0];
      const isGroup = txns.length > 1;
      const orderIds = txns.map((t) => t.orderId);
      const orderNumbers = txns.map((t) => t.orderNumber);
      const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

      // Status: if any order is PENDING, the combined group status is PENDING
      const hasPending = txns.some((t) => normalizePaymentStatus(t.status) === "PENDING");
      const hasFailed = txns.some((t) => normalizePaymentStatus(t.status) === "FAILED");
      const hasRefunded = txns.every((t) => normalizePaymentStatus(t.status) === "REFUNDED");
      const status: PaymentStatus = hasPending
        ? "PENDING"
        : hasFailed
        ? "FAILED"
        : hasRefunded
        ? "REFUNDED"
        : "PAID";

      // Combine all items across all orders in this group
      const combinedItems: Array<LedgerItem & { orderNumber: string }> = [];
      for (const t of txns) {
        for (const it of t.items) {
          combinedItems.push({
            ...it,
            orderNumber: t.orderNumber,
          });
        }
      }

      result.push({
        groupId: key,
        isGroup,
        orderCount: txns.length,
        orderIds,
        orderNumbers,
        tableNumber: latest.tableNumber,
        customerName: latest.customerName,
        customerPhone: latest.customerPhone,
        paymentMethod: latest.paymentMethod,
        totalAmount,
        status,
        createdAt: latest.createdAt,
        merchantTransactionId: latest.merchantTransactionId,
        providerReferenceId: latest.providerReferenceId,
        orders: txns,
        combinedItems,
      });
    });

    // Sort grouped list with newest orders on top
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [allTransactions]);

  const filteredGroups = useMemo(() => {
    return groupedPayments.filter((g) => {
      const paySt = normalizePaymentStatus(g.status);
      if (methodFilter !== "all" && g.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "all" && paySt !== statusFilter.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = g.orderNumbers.some((num) => num.toLowerCase().includes(q));
        const matchesTable = g.tableNumber.toLowerCase().includes(q);
        const matchesName = g.customerName?.toLowerCase().includes(q) || false;
        const matchesPhone = g.customerPhone?.includes(q) || false;
        const matchesItem = g.combinedItems.some((it) => it.name.toLowerCase().includes(q));
        const matchesTxn = g.merchantTransactionId?.toLowerCase().includes(q) || false;

        return (
          matchesOrder ||
          matchesTable ||
          matchesName ||
          matchesPhone ||
          matchesItem ||
          matchesTxn
        );
      }
      return true;
    });
  }, [groupedPayments, methodFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalCollected = allTransactions
      .filter((p) => normalizePaymentStatus(p.status) === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    const upiCollected = allTransactions
      .filter((p) => p.paymentMethod === "upi_online" && normalizePaymentStatus(p.status) === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    const counterCollected = allTransactions
      .filter((p) => p.paymentMethod === "counter" && normalizePaymentStatus(p.status) === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = allTransactions
      .filter((p) => normalizePaymentStatus(p.status) === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCollected,
      upiCollected,
      counterCollected,
      pendingAmount,
    };
  }, [allTransactions]);

  const handleUpdatePayment = async (orderId: string, status: PaymentStatus) => {
    try {
      await updatePaymentStatus(orderId, status);
      setDbPayments((prev) =>
        prev.map((p) =>
          p.orderId === orderId || p.orderNumber === orderId ? { ...p, status } : p
        )
      );
      try {
        await fetch("/api/payments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-staff-pin": "1234" },
          body: JSON.stringify({ orderId, status }),
        });
      } catch {
        // non-blocking
      }
      toast.success(`Payment status marked as ${status}`);
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment status");
    }
  };

  const handleUpdateGroupPayment = async (orderIds: string[], status: PaymentStatus, tableNumber?: string) => {
    try {
      for (const id of orderIds) {
        await updatePaymentStatus(id, status);
        try {
          await fetch("/api/payments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-staff-pin": "1234" },
            body: JSON.stringify({ orderId: id, status }),
          });
        } catch {
          // non-blocking
        }
      }
      setDbPayments((prev) =>
        prev.map((p) =>
          orderIds.includes(p.orderId) || orderIds.includes(p.orderNumber)
            ? { ...p, status }
            : p
        )
      );
      toast.success(
        orderIds.length > 1
          ? `Settled combined tab for ${tableNumber || "Table"} (${orderIds.length} orders marked as ${status})`
          : `Payment status marked as ${status}`
      );
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment status");
    }
  };

  const handleRecheckRazorpay = async (txnId?: string, orderId?: string) => {
    if (!txnId && !orderId) return;
    setCheckingTxnId(txnId || orderId || "");

    try {
      const query = txnId ? `mtx=${encodeURIComponent(txnId)}` : `orderId=${encodeURIComponent(orderId || "")}`;
      const res = await fetch(`/api/payments/verify?${query}`);
      const data = await res.json();

      if (data?.status === "PAID") {
        if (orderId) {
          updatePaymentStatus(orderId, "PAID");
          try {
            await fetch("/api/payments", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "x-staff-pin": "1234" },
              body: JSON.stringify({ orderId, status: "PAID" }),
            });
          } catch {
            // non-blocking
          }
        }
        setDbPayments((prev) =>
          prev.map((p) =>
            p.orderId === orderId || p.orderNumber === orderId ? { ...p, status: "PAID" } : p
          )
        );
        fetchPayments();
        toast.success("Razorpay verified payment as PAID & SETTLED!");
      } else {
        toast.info(`Provider status: ${data?.status || "PENDING"} - ${data?.message || "Awaiting authorization"}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to query Razorpay Status API");
    } finally {
      setCheckingTxnId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Collected */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Settled
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(metrics.totalCollected)}
          </div>
          <span className="text-[11px] text-muted-foreground">Successfully received</span>
        </div>

        {/* UPI Payments */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              UPI (Razorpay Gateway)
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(metrics.upiCollected)}
          </div>
          <span className="text-[11px] text-muted-foreground">Online UPI & Cards</span>
        </div>

        {/* Counter Payments */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pay at Counter
            </span>
            <div className="h-7 w-7 rounded-lg bg-stone-500/10 text-stone-700 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(metrics.counterCollected)}
          </div>
          <span className="text-[11px] text-muted-foreground">Cash & Desk POS Manual</span>
        </div>

        {/* Pending Receivables */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Clearance
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {formatCurrency(metrics.pendingAmount)}
          </div>
          <span className="text-[11px] text-muted-foreground">Unsettled active orders</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Method & Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Method Tabs */}
          <div className="flex rounded-xl border border-border bg-secondary/50 p-0.5 text-xs font-bold">
            <button
              onClick={() => setMethodFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                methodFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              All Methods
            </button>
            <button
              onClick={() => setMethodFilter("upi_online")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                methodFilter === "upi_online" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              <QrCode className="h-3 w-3 text-primary" />
              <span>Razorpay UPI</span>
            </button>
            <button
              onClick={() => setMethodFilter("counter")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                methodFilter === "counter" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              <CreditCard className="h-3 w-3 text-stone-600" />
              <span>Counter (Cash/POS)</span>
            </button>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All States</option>
            <option value="paid">Paid (Settled)</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={async () => {
              await fetchPayments();
              toast.success("Payment ledger refreshed from database");
            }}
            className="p-1.5 rounded-xl border border-input bg-card text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          {/* Purge / Reset Ledger Button */}
          <button
            onClick={async () => {
              if (window.confirm("Purge all test payments and orders from database and reset ledger to zero?")) {
                try {
                  localStorage.removeItem("dropout_pos_orders");
                } catch {
                  // ignore
                }
                try {
                  const delRes = await fetch("/api/payments", {
                    method: "DELETE",
                    headers: { "x-staff-pin": "1234" },
                  });
                  if (delRes.ok) {
                    toast.success("Database ledger purged successfully!");
                  }
                } catch (e) {
                  console.error("Purge API call failed:", e);
                }
                await clearAllOrders();
                setDbPayments([]);
                setHasLoadedFromDb(true);
                await fetchPayments();
                toast.success("Ledger reset clean! Ready for fresh orders.");
              }
            }}
            className="px-2.5 py-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset ledger to zero and delete all test orders from database"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span className="hidden sm:inline">Reset Ledger (Zero)</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order #, table, dish, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Transactions & Consolidated Tabs Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Order Reference</th>
                <th className="py-3 px-4">Dining Table & Guest</th>
                <th className="py-3 px-4">Items Ordered</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">No payment records found</p>
                    <p className="text-xs">Adjust your search or filter criteria above.</p>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const paySt = normalizePaymentStatus(group.status);
                  const isExpanded = Boolean(expandedGroups[group.groupId]);

                  return (
                    <React.Fragment key={group.groupId}>
                      <tr
                        className={`hover:bg-muted/30 transition-colors ${
                          group.isGroup ? "bg-amber-500/5" : ""
                        }`}
                      >
                        {/* Order Reference */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            {group.isGroup ? (
                              <div className="flex flex-col gap-1">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold">
                                  <Layers className="h-3 w-3" />
                                  <span>Combined Tab ({group.orderCount} Orders)</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {group.orderNumbers.map((num) => (
                                    <span
                                      key={num}
                                      className="font-mono text-[11px] font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded"
                                    >
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-foreground text-xs block">
                                {group.orderNumbers[0]}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground block">
                              {new Date(group.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Dining Table & Guest */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <span className="font-black text-foreground block text-xs">
                              {group.tableNumber}
                            </span>
                            {group.customerName && (
                              <span className="text-[11px] font-semibold text-muted-foreground block truncate max-w-[130px]">
                                {group.customerName}
                              </span>
                            )}
                            {group.customerPhone && (
                              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{group.customerPhone}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Items Ordered — Combined list with preview */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 max-w-[240px] sm:max-w-[320px]">
                            {group.combinedItems.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">
                                Standard ticket items
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {group.combinedItems.slice(0, 3).map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] font-medium text-foreground border border-border/40"
                                      title={group.isGroup ? `From order ${item.orderNumber}` : undefined}
                                    >
                                      <span className="font-bold text-primary">{item.quantity}x</span>
                                      <span className="truncate max-w-[110px]">{item.name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                    </span>
                                  ))}
                                </div>

                                {group.combinedItems.length > 3 && (
                                  <button
                                    onClick={() => toggleExpand(group.groupId)}
                                    className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>
                                      {isExpanded
                                        ? "Hide items"
                                        : `+${group.combinedItems.length - 3} more items`}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {group.isGroup && (
                              <div className="text-[10px] font-medium text-amber-700 flex items-center gap-1 pt-0.5">
                                <Utensils className="h-2.5 w-2.5" />
                                <span>
                                  {group.combinedItems.reduce((acc, it) => acc + it.quantity, 0)} items total across {group.orderCount} tickets
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary font-semibold text-[11px]">
                            {group.paymentMethod === "upi_online" ? (
                              <>
                                <QrCode className="h-3 w-3 text-primary" />
                                <span>Razorpay UPI</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-3 w-3 text-stone-600" />
                                <span>Counter Desk</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <span className="font-black text-sm text-foreground block">
                              {formatCurrency(group.totalAmount)}
                            </span>
                            {group.isGroup && (
                              <span className="text-[10px] text-muted-foreground block">
                                {group.orders.map((o) => formatCurrency(o.amount)).join(" + ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top">
                          <Badge
                            variant={
                              paySt === "PAID"
                                ? "emerald"
                                : paySt === "REFUNDED"
                                ? "stone"
                                : paySt === "FAILED"
                                ? "destructive"
                                : "amber"
                            }
                            className="text-[10px] font-bold uppercase tracking-wider"
                          >
                            {paySt}
                          </Badge>
                        </td>

                        {/* Desk Actions */}
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If Grouped Counter and pending: Settle all orders together */}
                            {group.isGroup && paySt !== "PAID" && (
                              <button
                                onClick={() =>
                                  handleUpdateGroupPayment(
                                    group.orderIds,
                                    "PAID",
                                    group.tableNumber
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 transition-transform active:scale-95"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>
                                  Mark All Paid ({group.orderCount} Orders)
                                </span>
                              </button>
                            )}

                            {/* Standalone pending: Settle single order */}
                            {!group.isGroup && paySt !== "PAID" && (
                              <button
                                onClick={() =>
                                  handleUpdatePayment(group.orderIds[0], "PAID")
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            )}

                            {/* Razorpay UPI pending: Provider status recheck */}
                            {group.paymentMethod === "upi_online" &&
                              paySt !== "PAID" && (
                                <button
                                  onClick={() =>
                                    handleRecheckRazorpay(
                                      group.merchantTransactionId,
                                      group.orderIds[0]
                                    )
                                  }
                                  disabled={
                                    checkingTxnId === group.merchantTransactionId
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="Query Razorpay Status directly"
                                >
                                  <RefreshCw
                                    className={`h-3 w-3 ${
                                      checkingTxnId ===
                                      group.merchantTransactionId
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                  <span>Check Razorpay</span>
                                </button>
                              )}

                            {/* Refund action if settled */}
                            {paySt === "PAID" && (
                              <button
                                onClick={() =>
                                  handleUpdateGroupPayment(
                                    group.orderIds,
                                    "REFUNDED",
                                    group.tableNumber
                                  )
                                }
                                className="px-2 py-1 rounded-lg border border-border text-stone-600 hover:bg-muted font-bold text-[10px]"
                              >
                                Refund
                              </button>
                            )}

                            {/* Expand toggle */}
                            <button
                              onClick={() => toggleExpand(group.groupId)}
                              className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                              title={isExpanded ? "Collapse Details" : "View Full Item Breakdown"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Full Item & Ticket Breakdown */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b border-border/60">
                          <td colSpan={7} className="p-4">
                            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                                    {group.isGroup
                                      ? `Item Breakdown Across ${group.orderCount} Combined Order Tickets`
                                      : `Itemized Order Details (${group.orderNumbers[0]})`}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-xs text-primary">
                                  Total: {formatCurrency(group.totalAmount)}
                                </span>
                              </div>

                              {/* Per Ticket Breakdown if grouped */}
                              {group.isGroup ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                  {group.orders.map((subOrder) => (
                                    <div
                                      key={subOrder.orderId}
                                      className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-bold text-foreground">
                                            {subOrder.orderNumber}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(
                                              subOrder.createdAt
                                            ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                        <span className="font-bold text-foreground">
                                          {formatCurrency(subOrder.amount)}
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        {subOrder.items.map((it, iIdx) => (
                                          <div
                                            key={iIdx}
                                            className="flex items-center justify-between text-xs py-0.5"
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-primary text-[11px]">
                                                {it.quantity}x
                                              </span>
                                              <span className="font-medium text-foreground">
                                                {it.name}
                                              </span>
                                            </div>
                                            <span className="text-muted-foreground text-[11px]">
                                              {formatCurrency(
                                                it.price * it.quantity
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-1.5 pt-1">
                                  {group.combinedItems.map((it, iIdx) => (
                                    <div
                                      key={iIdx}
                                      className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">
                                          {it.quantity}x
                                        </span>
                                        <span className="font-medium text-foreground">
                                          {it.name}
                                        </span>
                                        {it.specialInstructions && (
                                          <span className="text-[10px] text-muted-foreground italic">
                                            ({it.specialInstructions})
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono font-semibold text-foreground">
                                        {formatCurrency(it.price * it.quantity)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
