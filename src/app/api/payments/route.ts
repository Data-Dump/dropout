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
      const ord = (row.orders as unknown as {
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
      }) || {};

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
