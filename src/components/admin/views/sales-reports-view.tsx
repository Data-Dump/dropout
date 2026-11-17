"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { formatCurrency } from "@/lib/utils";
import { DietBadge } from "@/components/ui/diet-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Calendar,
  CreditCard,
  QrCode,
  AlertOctagon,
  RotateCcw,
  RefreshCw,
  Database,
  ShieldAlert,
  Lock,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { SalesReportResponse } from "@/app/api/reports/route";

export function SalesReportsView() {
  const { currentStaff, adminLogin } = useRestaurant();
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportResponse | null>(null);

  // Staff permission check: Only "Manager" or Admin can view financial sales reports
  const isManagerOrAdmin = !currentStaff || currentStaff.role === "Manager" || currentStaff.id === "stf-1";
  const [elevatePin, setElevatePin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Fetch report from server API (authoritative Supabase queries)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (timeframe === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data: SalesReportResponse = await res.json();
        setReportData(data);
      } else {
        toast.error("Failed to load reports from database");
      }
    } catch (err) {
      console.warn("Report fetch error:", err);
      toast.error("Unable to connect to reports service");
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStart, customEnd]);

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchReport();
    }
  }, [fetchReport, isManagerOrAdmin]);

  // Elevate permission with Manager PIN
  const handleElevateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!elevatePin) return;

    const ok = adminLogin(elevatePin);
    if (ok) {
      toast.success("Manager clearance granted");
      setPinError(false);
      setElevatePin("");
    } else {
      setPinError(true);
      toast.error("Invalid Manager PIN.");
    }
  };

  // CSV Export: Itemized Dish Sales Summary
  const handleExportItemSalesCSV = () => {
    if (!reportData || reportData.topItems.length === 0) {
      toast.error("No item sales data to export for this period");
      return;
    }

    let csv = "Item Name,Category,Diet Type,Quantity Sold,Revenue (INR)\n";
    reportData.topItems.forEach((item) => {
      csv += `"${item.name.replace(/"/g, '""')}","${item.category}",${item.dietType},${item.quantity},${item.revenue}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dropout_item_sales_${timeframe}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Item sales breakdown downloaded as CSV");
  };

  // CSV Export: Comprehensive Order Transactions
  const handleExportTransactionsCSV = async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) {
        toast.error("Could not fetch order audit trail");
        return;
      }
      const data = await res.json();
      const ordersList = Array.isArray(data.orders) ? data.orders : [];

      if (ordersList.length === 0) {
        toast.error("No transactions found to export");
        return;
      }

      let csv = "Order Number,Table,Status,Payment Method,Payment Status,Customer Name,Customer Phone,Subtotal (INR),Tax (5%),Total (INR),Created At\n";
      ordersList.forEach((o: {
        orderNumber: string;
        tableNumber: string;
        status: string;
        paymentMethod: string;
        paymentStatus: string;
        customerName?: string;
        customerPhone?: string;
        subtotal: number;
        tax: number;
        total: number;
        createdAt: string;
      }) => {
        csv += `${o.orderNumber},${o.tableNumber},${o.status},${o.paymentMethod},${o.paymentStatus},"${(o.customerName || "").replace(/"/g, '""')}","${o.customerPhone || ""}",${o.subtotal},${o.tax},${o.total},"${o.createdAt}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `dropout_transactions_ledger_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Transactions ledger exported as CSV");
    } catch {
      toast.error("Export failed");
    }
  };

  // Staff Permission Gate
  if (!isManagerOrAdmin) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-md space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-foreground tracking-tight">
            Manager Authorization Required
          </h3>
          <p className="text-xs text-muted-foreground">
            Current staff role (<strong>{currentStaff?.role}</strong>) does not have permission to view sensitive cafe revenue and financial reports.
          </p>
        </div>

        <form onSubmit={handleElevateRole} className="space-y-3 pt-2">
          <input
            type="password"
            maxLength={4}
            placeholder="Enter Manager PIN"
            value={elevatePin}
            onChange={(e) => {
              setElevatePin(e.target.value);
              setPinError(false);
            }}
            className={`w-full rounded-xl border bg-background px-4 py-2.5 text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:ring-2 ${
              pinError ? "border-destructive text-destructive focus:ring-destructive" : "border-input focus:ring-primary"
            }`}
          />
          <Button type="submit" className="w-full h-10 rounded-xl text-xs font-bold gap-2">
            <Lock className="h-4 w-4" />
            <span>Unlock Financial Reports</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  const kpis = reportData?.kpis || {
    grossRevenue: 0,
    subtotal: 0,
    gstTax: 0,
    totalOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    cancelledRevenue: 0,
    refundedOrders: 0,
    refundedRevenue: 0,
    aov: 0,
  };

  const paymentBreakdown = reportData?.paymentBreakdown || {
    upi: { total: 0, paid: 0, pending: 0, count: 0 },
    counter: { total: 0, paid: 0, pending: 0, count: 0 },
  };

  const totalSettledPayment = paymentBreakdown.upi.paid + paymentBreakdown.counter.paid;
  const upiPercent = totalSettledPayment > 0 ? Math.round((paymentBreakdown.upi.paid / totalSettledPayment) * 100) : 0;
  const counterPercent = totalSettledPayment > 0 ? 100 - upiPercent : 0;

  return (
    <div className="space-y-6">
      {/* Header, Filters & CSV Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-foreground tracking-tight">
              Financial & Sales Reporting
            </h3>
            <Badge
              variant="stone"
              className="text-[10px] font-bold gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
            >
              <Database className="h-3 w-3" />
              <span>{reportData?.source === "supabase" ? "Supabase Live DDL" : "Local Store Sync"}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime revenue velocity, GST compliance, UPI vs counter reconciliation, and menu product velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Quick Pills */}
          <div className="flex rounded-xl border border-border bg-secondary/50 p-0.5 text-xs font-bold">
            <button
              onClick={() => setTimeframe("today")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "today" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "week" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === "month" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe("custom")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                timeframe === "custom" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Custom</span>
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={fetchReport}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-9 w-9 p-0 rounded-xl"
            title="Refresh Report"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* CSV Export Dropdown Buttons */}
          <Button
            onClick={handleExportItemSalesCSV}
            variant="outline"
            className="h-9 rounded-xl text-xs font-bold gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Items CSV</span>
          </Button>

          <Button
            onClick={handleExportTransactionsCSV}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Orders CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {timeframe === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border/80 text-xs">
          <span className="font-bold text-foreground">Select Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground font-semibold">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground font-semibold">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button size="sm" onClick={fetchReport} className="h-7 text-xs font-bold rounded-lg px-3">
            Apply Filter
          </Button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Gross Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(kpis.grossRevenue)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block">
            Direct Food Sales
          </span>
        </div>

        {/* GST Tax Output */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            GST Output (0%)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(kpis.gstTax)}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Subtotal: {formatCurrency(kpis.subtotal)}
          </span>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Total Orders
          </span>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {kpis.totalOrders}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            {kpis.completedOrders} completed • {kpis.activeOrders} active
          </span>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Average Order Value
          </span>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatCurrency(kpis.aov)}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Per dining table
          </span>
        </div>

        {/* Cancelled Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Cancelled Orders
            </span>
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
            {kpis.cancelledOrders}
          </div>
          <span className="text-[11px] text-rose-600/80 font-semibold block">
            Lost: {formatCurrency(kpis.cancelledRevenue)}
          </span>
        </div>

        {/* Refunded Orders */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Refunds
            </span>
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {kpis.refundedOrders}
          </div>
          <span className="text-[11px] text-amber-600/80 font-semibold block">
            Refunded: {formatCurrency(kpis.refundedRevenue)}
          </span>
        </div>
      </div>

      {/* UPI vs Counter Payment Breakdown */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h4 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Payment Channel Reconciliation: UPI (PhonePe) vs Pay at Counter</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Direct verification of settled digital UPI transactions against counter cash and card registers.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            Total Settled: {formatCurrency(totalSettledPayment)}
          </span>
        </div>

        {/* Split Bar */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-secondary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${upiPercent}%` }}
              title={`PhonePe UPI: ${upiPercent}%`}
            />
            <div
              className="h-full bg-stone-500 transition-all duration-500"
              style={{ width: `${counterPercent}%` }}
              title={`Pay at Counter: ${counterPercent}%`}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>UPI Online ({upiPercent}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
              <span className="h-2 w-2 rounded-full bg-stone-500" />
              <span>Counter Register ({counterPercent}%)</span>
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* UPI Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-primary" />
                <span>PhonePe UPI (0% MDR)</span>
              </span>
              <Badge variant="default" className="text-[10px] font-mono">
                {paymentBreakdown.upi.count} orders
              </Badge>
            </div>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(paymentBreakdown.upi.paid)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
              <span>Confirmed Paid: {formatCurrency(paymentBreakdown.upi.paid)}</span>
              <span>Pending / Expired: {formatCurrency(paymentBreakdown.upi.pending)}</span>
            </div>
          </div>

          {/* Counter Box */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-secondary/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                <span>Pay at Counter (Cash / POS)</span>
              </span>
              <Badge variant="stone" className="text-[10px] font-mono">
                {paymentBreakdown.counter.count} orders
              </Badge>
            </div>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(paymentBreakdown.counter.paid)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span>Settled at Counter: {formatCurrency(paymentBreakdown.counter.paid)}</span>
              <span>Awaiting Bill: {formatCurrency(paymentBreakdown.counter.pending)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Most Popular Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h4 className="text-base font-black text-foreground tracking-tight">
                Category-Wise Sales
              </h4>
              <p className="text-xs text-muted-foreground">
                Revenue contribution and item volume across menu categories.
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {reportData?.categoryBreakdown.length || 0} Categories
            </span>
          </div>

          {reportData?.categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No category sales recorded for this period.
            </div>
          ) : (
            <div className="space-y-3.5">
              {reportData?.categoryBreakdown.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{cat.name}</span>
                    <span className="font-black text-foreground">
                      {formatCurrency(cat.revenue)} ({cat.percentage}%) • {cat.count} items
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Popular Menu Items */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h4 className="text-base font-black text-foreground tracking-tight">
                Most Popular Dishes
              </h4>
              <p className="text-xs text-muted-foreground">
                Top selling items ranked by customer order volume.
              </p>
            </div>
            <Badge variant="stone" className="text-[10px]">
              Top 10 Volume
            </Badge>
          </div>

          {reportData?.topItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No item sales recorded for this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {reportData?.topItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-md bg-secondary font-black text-[11px] text-foreground flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <DietBadge type={item.dietType} size="sm" />
                    <div>
                      <h5 className="font-bold text-foreground">{item.name}</h5>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-foreground block">
                      {formatCurrency(item.revenue)}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                      {item.quantity} sold
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
