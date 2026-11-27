import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStaffSessionFromRequest,
  isDirectBrowserDocumentRequest,
  directBrowserBlockedResponse,
} from "@/lib/auth/staff-session";
import { safeServerError } from "@/lib/security/sanitize";
import { normalizePaymentStatus, paiseToRupees, TableNumber } from "@/lib/utils";
import { PaymentMethod, PaymentStatus } from "@/types";

export const dynamic = "force-dynamic";

export interface AdminPaymentItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  dietType?: string;
  specialInstructions?: string;
}

export interface AdminPaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: TableNumber;
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
  items?: AdminPaymentItem[];
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

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({
        payments: [],
        message: "Supabase not configured, running in local memory mode",
      });
    }

    const { data: paymentsData, error } = await supabaseAdmin
      .from("payments")
      .select(`
        id,
        order_id,
        payment_method,
        amount_paise,
        status,
        provider,
        merchant_transaction_id,
        provider_reference_id,
        settled_at,
        created_at,
        orders (
          order_number,
          table_number,
          customer_name,
          customer_phone,
          order_items (
            id,
            item_name,
            unit_price_paise,
            quantity,
            diet_type,
            special_instructions
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      console.error("Error querying payments history:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted: AdminPaymentTransaction[] = (paymentsData || []).map((row) => {
      const rawOrd = row.orders;
      const ord = (Array.isArray(rawOrd) ? rawOrd[0] : rawOrd) as {
        order_number?: string;
        table_number?: string;
        customer_name?: string | null;
        customer_phone?: string | null;
        order_items?: Array<{
          id: string;
          item_name: string;
          unit_price_paise: number;
          quantity: number;
          diet_type?: string;
          special_instructions?: string | null;
        }>;
      } || {};

      const items: AdminPaymentItem[] = (ord.order_items || []).map((it) => ({
        id: it.id,
        name: it.item_name,
        quantity: it.quantity,
        price: paiseToRupees(it.unit_price_paise),
        dietType: it.diet_type || "veg",
        specialInstructions: it.special_instructions || undefined,
      }));

      return {
        id: row.id,
        orderId: row.order_id,
        orderNumber: ord.order_number || "DRP-0000",
        tableNumber: (ord.table_number as TableNumber) || "Table 01",
        customerName: ord.customer_name || undefined,
        customerPhone: ord.customer_phone || undefined,
        paymentMethod: row.payment_method as PaymentMethod,
        amountPaise: Number(row.amount_paise),
        amount: paiseToRupees(Number(row.amount_paise)),
        status: normalizePaymentStatus(row.status),
        provider: row.provider || "phonepe",
        merchantTransactionId: row.merchant_transaction_id || undefined,
        providerReferenceId: row.provider_reference_id || undefined,
        settledAt: row.settled_at || undefined,
        createdAt: row.created_at,
        items,
      };
    });

    return NextResponse.json({ payments: formatted });
  } catch (err: unknown) {
    console.error("Payments API Error:", err);
    return NextResponse.json({ error: safeServerError(err, "Failed to fetch payments history") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (isDirectBrowserDocumentRequest(req)) {
      return directBrowserBlockedResponse();
    }

    const session = getStaffSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // 1. Fetch all payment rows and their associated order IDs
    const { data: payments, error: selErr } = await supabaseAdmin.from("payments").select("id, order_id");
    if (selErr) {
      console.error("Error selecting payments for deletion:", selErr);
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }

    const paymentIds = (payments || []).map((p: { id: string }) => p.id);
    const paymentOrderIds = (payments || []).map((p: { order_id: string }) => p.order_id).filter(Boolean);

    // 2. Fetch all orders
    const { data: allOrders } = await supabaseAdmin.from("orders").select("id");
    const allOrderIds = Array.from(new Set([...paymentOrderIds, ...(allOrders || []).map((o: { id: string }) => o.id)]));

    let delPaymentErr = null;
    if (paymentIds.length > 0) {
      const { error } = await supabaseAdmin.from("payments").delete().in("id", paymentIds);
      delPaymentErr = error;
    }

    let delOrderErr = null;
    if (allOrderIds.length > 0) {
      await supabaseAdmin.from("order_items").delete().in("order_id", allOrderIds);
      const { error } = await supabaseAdmin.from("orders").delete().in("id", allOrderIds);
      delOrderErr = error;
    }

    // Reset table occupancy
    await supabaseAdmin
      .from("restaurant_tables")
      .update({ status: "available" })
      .not("id", "is", null);

    return NextResponse.json({
      success: true,
      foundPayments: paymentIds.length,
      foundOrders: allOrderIds.length,
      paymentError: delPaymentErr?.message || null,
      orderError: delOrderErr?.message || null,
    });
  } catch (err: unknown) {
    console.error("Delete Payments Error:", err);
    return NextResponse.json({ error: safeServerError(err, "Failed to purge payments") }, { status: 500 });
  }
}
