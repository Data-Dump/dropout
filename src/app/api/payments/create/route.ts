import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPhonePePaymentSession } from "@/lib/payments/phonepe";
import { paiseToRupees } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface CreatePaymentRequestBody {
  orderId: string;
  orderNumber?: string;
  amountPaise?: number;
  customerName?: string;
  customerPhone?: string;
  idempotencyKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePaymentRequestBody;

    if (!body || !body.orderId) {
      return NextResponse.json(
        { error: "orderId is required to initiate payment." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    let orderRecord: {
      id: string;
      order_number: string;
      table_number: string;
      total_paise: number;
      payment_method: string;
      payment_status: string;
      customer_phone?: string | null;
      customer_name?: string | null;
    } | null = null;

    // 1. Fetch order from Supabase to guarantee server-authoritative amount
    if (supabaseAdmin) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orderId);
      const query = supabaseAdmin
        .from("orders")
        .select("id, order_number, table_number, total_paise, payment_method, payment_status, customer_phone, customer_name");

      const { data: dbOrder } = isUuid
        ? await query.eq("id", body.orderId).maybeSingle()
        : await query.eq("order_number", body.orderId).maybeSingle();

      if (dbOrder) {
        orderRecord = dbOrder;
      }
    }

    if (!orderRecord && body.orderNumber && body.amountPaise) {
      orderRecord = {
        id: body.orderId,
        order_number: body.orderNumber,
        table_number: "Table",
        total_paise: Number(body.amountPaise),
        payment_method: "upi_online",
        payment_status: "PENDING",
        customer_phone: body.customerPhone || null,
        customer_name: body.customerName || null,
      };
    }

    if (!orderRecord) {
      return NextResponse.json(
        { error: `Order "${body.orderId}" not found in system records.` },
        { status: 404 }
      );
    }

    // 2. Reject if already paid
    if (orderRecord.payment_status?.toUpperCase() === "PAID") {
      return NextResponse.json(
        { error: `Order #${orderRecord.order_number} has already been settled and paid.` },
        { status: 400 }
      );
    }

    const totalPaise = Number(orderRecord.total_paise);
    if (!totalPaise || totalPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid order amount. Amount must be greater than 0 paise." },
        { status: 400 }
      );
    }

    const customerPhone = body.customerPhone || orderRecord.customer_phone || undefined;
    const customerName = orderRecord.customer_name || undefined;

    // 3. Initiate payment session using UPIPay PhonePe integration
    const session = await createPhonePePaymentSession({
      orderId: orderRecord.id,
      orderNumber: orderRecord.order_number,
      amountPaise: totalPaise,
      customerPhone,
      customerName,
      idempotencyKey: body.idempotencyKey,
    });

    // 4. Record payment transaction attempt in Supabase
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("payments").insert({
          order_id: orderRecord.id,
          payment_method: "upi_online",
          amount_paise: totalPaise,
          status: "pending",
          provider: "phonepe",
          merchant_transaction_id: session.merchantTransactionId,
          raw_payload: {
            initiated_at: new Date().toISOString(),
            idempotency_key: body.idempotencyKey || null,
          },
        });
      } catch (insertErr) {
        console.warn("Failed recording payment row in Supabase:", insertErr);
      }
    }

    // Sanitize session to ensure no provider internals or raw payloads leak to frontend
    const sanitizedSession = {
      merchantTransactionId: session.merchantTransactionId,
      paymentUrl: session.paymentUrl,
      amountPaise: session.amountPaise,
      qrImage: session.qrImage,
      upiUri: session.upiUri,
      intentLinks: session.intentLinks,
    };

    return NextResponse.json(
      {
        success: true,
        session: sanitizedSession,
        order: {
          id: orderRecord.id,
          orderNumber: orderRecord.order_number,
          tableNumber: orderRecord.table_number,
          totalPaise,
          totalRupees: paiseToRupees(totalPaise),
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to initiate payment session";
    console.error("Create Payment API Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
