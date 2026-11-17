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
} from "lucide-react";
import { toast } from "sonner";

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
}

export function PaymentsView() {
  const { orders, updatePaymentStatus } = useRestaurant();

  const [dbPayments, setDbPayments] = useState<LedgerPayment[]>([]);
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingTxnId, setCheckingTxnId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.payments) && data.payments.length > 0) {
          setDbPayments(data.payments);
        }
      }
    } catch (e) {
      console.warn("Failed fetching payments history:", e);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Combined transactions from DB or mapped from store
  const allTransactions: LedgerPayment[] = useMemo(() => {
    if (dbPayments.length > 0) {
      return dbPayments;
    }
    return orders.map((o) => ({
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
      provider: "phonepe",
      merchantTransactionId: o.idempotencyKey ? `MT_${o.orderNumber}_${o.idempotencyKey.slice(0, 8)}` : undefined,
      createdAt: o.createdAt,
    }));
  }, [dbPayments, orders]);

  const filteredPayments = useMemo(() => {
    return allTransactions.filter((p) => {
      const paySt = normalizePaymentStatus(p.status);
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "all" && paySt !== statusFilter.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.orderNumber.toLowerCase().includes(q) ||
          p.tableNumber.toLowerCase().includes(q) ||
          p.customerName?.toLowerCase().includes(q) ||
          p.customerPhone?.includes(q) ||
          p.merchantTransactionId?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, methodFilter, statusFilter, searchQuery]);

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

  const handleUpdatePayment = (orderId: string, status: PaymentStatus) => {
    updatePaymentStatus(orderId, status);
    setDbPayments((prev) =>
      prev.map((p) => (p.orderId === orderId ? { ...p, status } : p))
    );
    toast.success(`Payment status marked as ${status}`);
  };

  const handleRecheckPhonePe = async (txnId?: string, orderId?: string) => {
    if (!txnId && !orderId) return;
    setCheckingTxnId(txnId || orderId || "");

    try {
      const query = txnId ? `mtx=${encodeURIComponent(txnId)}` : `orderId=${encodeURIComponent(orderId || "")}`;
      const res = await fetch(`/api/payments/verify?${query}`);
      const data = await res.json();

      if (data?.status === "PAID") {
        if (orderId) updatePaymentStatus(orderId, "PAID");
        fetchPayments();
        toast.success("PhonePe verified payment as PAID & SETTLED!");
      } else {
        toast.info(`Provider status: ${data?.status || "PENDING"} - ${data?.message || "Awaiting authorization"}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to query PhonePe Status API");
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
              UPI (PhonePe Gateway)
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(metrics.upiCollected)}
          </div>
          <span className="text-[11px] text-muted-foreground">Zero-commission online UPI</span>
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
              <span>PhonePe UPI</span>
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
              setIsRefreshing(true);
              await fetchPayments();
              setIsRefreshing(false);
              toast.success("Payment ledger refreshed");
            }}
            className="p-1.5 rounded-xl border border-input bg-card text-muted-foreground hover:text-foreground"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order #, table, Txn ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Dining Table</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Merchant Txn ID / Reference</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPayments.map((p) => {
                const paySt = normalizePaymentStatus(p.status);

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-foreground block">
                        {p.orderNumber}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-foreground">
                      {p.tableNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary font-semibold text-[11px]">
                        {p.paymentMethod === "upi_online" ? (
                          <>
                            <QrCode className="h-3 w-3 text-primary" />
                            <span>PhonePe UPI</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3 w-3 text-stone-600" />
                            <span>Counter Desk</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.merchantTransactionId ? (
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-foreground font-semibold block truncate max-w-[160px]" title={p.merchantTransactionId}>
                            {p.merchantTransactionId}
                          </span>
                          {p.providerReferenceId && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]" title={p.providerReferenceId}>
                              PSP: {p.providerReferenceId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Counter Desk Register</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-sm text-foreground">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* If PhonePe UPI and pending, allow provider recheck */}
                        {p.paymentMethod === "upi_online" && paySt !== "PAID" && (
                          <button
                            onClick={() => handleRecheckPhonePe(p.merchantTransactionId, p.orderId)}
                            disabled={checkingTxnId === p.merchantTransactionId}
                            className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] flex items-center gap-1"
                            title="Query PhonePe Status API directly"
                          >
                            <RefreshCw className={`h-3 w-3 ${checkingTxnId === p.merchantTransactionId ? "animate-spin" : ""}`} />
                            <span>Check PhonePe</span>
                          </button>
                        )}

                        {/* For Counter payments, manual desk mark paid */}
                        {p.paymentMethod === "counter" && paySt !== "PAID" && (
                          <button
                            onClick={() => handleUpdatePayment(p.orderId, "PAID")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs"
                          >
                            Mark Paid at Desk
                          </button>
                        )}

                        {paySt === "PAID" && (
                          <button
                            onClick={() => handleUpdatePayment(p.orderId, "REFUNDED")}
                            className="px-2 py-1 rounded-lg border border-border text-stone-600 hover:bg-muted font-bold text-[10px]"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
