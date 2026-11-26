import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStaffSessionFromRequest,
  isDirectBrowserDocumentRequest,
  directBrowserBlockedResponse,
} from "@/lib/auth/staff-session";
import { paiseToRupees, normalizeOrderStatus, normalizePaymentStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

export interface ReportItemSummary {
  name: string;
  category: string;
  dietType: "veg" | "non-veg" | "egg";
  quantity: number;
  revenue: number;
}

export interface CategorySummary {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface SalesReportResponse {
  timeframe: string;
  startDate: string;
  endDate: string;
  kpis: {
    grossRevenue: number;
    subtotal: number;
    gstTax: number;
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
    cancelledOrders: number;
    cancelledRevenue: number;
    refundedOrders: number;
    refundedRevenue: number;
    aov: number;
  };
  paymentBreakdown: {
    upi: {
      total: number;
      paid: number;
      pending: number;
      count: number;
    };
    counter: {
      total: number;
      paid: number;
      pending: number;
      count: number;
    };
  };
  topItems: ReportItemSummary[];
  categoryBreakdown: CategorySummary[];
  dailyTrends: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  source: "supabase" | "store_fallback";
}

export async function GET(req: NextRequest) {
  try {
    if (isDirectBrowserDocumentRequest(req)) {
      return directBrowserBlockedResponse();
    }

    const session = getStaffSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const timeframe = url.searchParams.get("timeframe") || "today"; // "today" | "week" | "month" | "custom"
    const customStart = url.searchParams.get("startDate");
    const customEnd = url.searchParams.get("endDate");

    // Determine date range in UTC / Local
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (timeframe === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeframe === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "custom" && customStart) {
      startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    const supabaseAdmin = getSupabaseAdminClient();

    if (supabaseAdmin) {
      // Query actual Supabase orders
      const { data: dbOrders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select(`
          id,
          order_number,
          table_number,
          status,
          payment_method,
          payment_status,
          subtotal_paise,
          tax_paise,
          total_paise,
          customer_name,
          customer_phone,
          notes,
          created_at,
          updated_at,
          order_items (*)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (!ordersError && dbOrders && dbOrders.length > 0) {
        // Fetch categories for mapping
        const { data: dbCategories } = await supabaseAdmin
          .from("menu_categories")
          .select("id, name");
        const categoryMap = new Map<string, string>();
        (dbCategories || []).forEach((c) => categoryMap.set(c.id, c.name));

        // Fetch menu items for category linking
        const { data: dbMenuItems } = await supabaseAdmin
          .from("menu_items")
          .select("id, category_id, name");
        const itemCategoryMap = new Map<string, string>();
        (dbMenuItems || []).forEach((m) => {
          const catName = m.category_id ? categoryMap.get(m.category_id) || "General" : "General";
          itemCategoryMap.set(m.id, catName);
        });

        // Compute KPIs
        let grossRevenuePaise = 0;
        let subtotalPaise = 0;
        let gstTaxPaise = 0;
        const totalOrders = dbOrders.length;
        let completedOrders = 0;
        let activeOrders = 0;
        let cancelledOrders = 0;
        let cancelledRevenuePaise = 0;
        let refundedOrders = 0;
        let refundedRevenuePaise = 0;

        let upiTotalPaise = 0;
        let upiPaidPaise = 0;
        let upiPendingPaise = 0;
        let upiCount = 0;

        let counterTotalPaise = 0;
        let counterPaidPaise = 0;
        let counterPendingPaise = 0;
        let counterCount = 0;

        const itemAggMap = new Map<string, ReportItemSummary>();
        const categoryAggMap = new Map<string, { revenuePaise: number; count: number }>();
        const dailyMap = new Map<string, { revenuePaise: number; orderCount: number }>();

        dbOrders.forEach((ord) => {
          const status = normalizeOrderStatus(ord.status);
          const pStatus = normalizePaymentStatus(ord.payment_status);
          const isCancelled = status === "CANCELLED";
          const isRefunded = pStatus === "REFUNDED";
          const isCompleted = status === "COMPLETED" || status === "SERVED";
          const isActive = status === "NEW" || status === "ACCEPTED" || status === "PREPARING" || status === "READY";

          if (isCancelled) {
            cancelledOrders += 1;
            cancelledRevenuePaise += ord.total_paise || 0;
          } else {
            grossRevenuePaise += ord.total_paise || 0;
            subtotalPaise += ord.subtotal_paise || 0;
            gstTaxPaise += ord.tax_paise || 0;
          }

          if (isRefunded) {
            refundedOrders += 1;
            refundedRevenuePaise += ord.total_paise || 0;
          }

          if (isCompleted) completedOrders += 1;
          if (isActive) activeOrders += 1;

          // Payment method stats
          if (ord.payment_method === "upi_online") {
            upiCount += 1;
            upiTotalPaise += ord.total_paise || 0;
            if (pStatus === "PAID") upiPaidPaise += ord.total_paise || 0;
            else if (pStatus === "PENDING") upiPendingPaise += ord.total_paise || 0;
          } else {
            counterCount += 1;
            counterTotalPaise += ord.total_paise || 0;
            if (pStatus === "PAID") counterPaidPaise += ord.total_paise || 0;
            else if (pStatus === "PENDING") counterPendingPaise += ord.total_paise || 0;
          }

          // Daily trend map
          const dayKey = new Date(ord.created_at).toISOString().split("T")[0];
          const curDay = dailyMap.get(dayKey) || { revenuePaise: 0, orderCount: 0 };
          if (!isCancelled) {
            curDay.revenuePaise += ord.total_paise || 0;
          }
          curDay.orderCount += 1;
          dailyMap.set(dayKey, curDay);

          // Order items aggregation (exclude cancelled orders from product performance)
          if (!isCancelled && Array.isArray(ord.order_items)) {
            ord.order_items.forEach((oi: {
              menu_item_id: string | null;
              item_name: string;
              unit_price_paise: number;
              quantity: number;
              diet_type: string;
            }) => {
              const catName = oi.menu_item_id ? itemCategoryMap.get(oi.menu_item_id) || "General" : "General";
              const lineRevPaise = (oi.unit_price_paise || 0) * (oi.quantity || 1);

              // Top items
              const existingItem = itemAggMap.get(oi.item_name) || {
                name: oi.item_name,
                category: catName,
                dietType: (oi.diet_type as "veg" | "non-veg" | "egg") || "veg",
                quantity: 0,
                revenue: 0,
              };
              existingItem.quantity += oi.quantity || 1;
              existingItem.revenue += paiseToRupees(lineRevPaise);
              itemAggMap.set(oi.item_name, existingItem);

              // Category breakdown
              const existingCat = categoryAggMap.get(catName) || { revenuePaise: 0, count: 0 };
              existingCat.revenuePaise += lineRevPaise;
              existingCat.count += oi.quantity || 1;
              categoryAggMap.set(catName, existingCat);
            });
          }
        });

        const grossRevenue = paiseToRupees(grossRevenuePaise);
        const aov = (totalOrders - cancelledOrders) > 0
          ? Math.round(grossRevenue / (totalOrders - cancelledOrders))
          : 0;

        const topItems = Array.from(itemAggMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        const categoryBreakdown: CategorySummary[] = Array.from(categoryAggMap.entries())
          .map(([name, data]) => {
            const rev = paiseToRupees(data.revenuePaise);
            const percentage = grossRevenue > 0 ? Math.round((rev / grossRevenue) * 100) : 0;
            return {
              name,
              count: data.count,
              revenue: rev,
              percentage,
            };
          })
          .sort((a, b) => b.revenue - a.revenue);

        const dailyTrends = Array.from(dailyMap.entries())
          .map(([date, d]) => ({
            date,
            revenue: paiseToRupees(d.revenuePaise),
            orderCount: d.orderCount,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const response: SalesReportResponse = {
          timeframe,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          kpis: {
            grossRevenue,
            subtotal: paiseToRupees(subtotalPaise),
            gstTax: paiseToRupees(gstTaxPaise),
            totalOrders,
            completedOrders,
            activeOrders,
            cancelledOrders,
            cancelledRevenue: paiseToRupees(cancelledRevenuePaise),
            refundedOrders,
            refundedRevenue: paiseToRupees(refundedRevenuePaise),
            aov,
          },
          paymentBreakdown: {
            upi: {
              total: paiseToRupees(upiTotalPaise),
              paid: paiseToRupees(upiPaidPaise),
              pending: paiseToRupees(upiPendingPaise),
              count: upiCount,
            },
            counter: {
              total: paiseToRupees(counterTotalPaise),
              paid: paiseToRupees(counterPaidPaise),
              pending: paiseToRupees(counterPendingPaise),
              count: counterCount,
            },
          },
          topItems,
          categoryBreakdown,
          dailyTrends,
          source: "supabase",
        };

        return NextResponse.json(response);
      }
    }

    // Fallback response format if Supabase empty / unconfigured
    return NextResponse.json({
      timeframe,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      kpis: {
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
      },
      paymentBreakdown: {
        upi: { total: 0, paid: 0, pending: 0, count: 0 },
        counter: { total: 0, paid: 0, pending: 0, count: 0 },
      },
      topItems: [],
      categoryBreakdown: [],
      dailyTrends: [],
      source: "store_fallback",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Reports API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
