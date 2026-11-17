import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePaymentStatus, paiseToRupees, TableNumber } from "@/lib/utils";
import { PaymentMethod, PaymentStatus } from "@/types";

export const dynamic = "force-dynamic";

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
}

export async function GET() {
  try {
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
          customer_phone
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
      }) || {};

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
      };
    });

    return NextResponse.json({ payments: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch payments history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
