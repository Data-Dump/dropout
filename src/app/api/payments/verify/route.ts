import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUPIPayClient } from "@/lib/payments/phonepe";
import { paiseToRupees } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Server-Side Payment Verification Endpoint
 * 
 * Used after customer returns from PhonePe or for real-time order polling.
 * Performs independent query to PhonePe's /pg/v1/status/{merchantId}/{transactionId} API.
 * Never trusts client claims.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const mtx = url.searchParams.get("mtx"); // merchantTransactionId

    if (!orderId && !mtx) {
      return NextResponse.json(
        { error: "orderId or mtx (merchantTransactionId) is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const client = getUPIPayClient();

    let paymentRecord: {
      id: string;
      order_id: string;
      amount_paise: number;
      status: string;
      merchant_transaction_id: string;
      provider_reference_id?: string | null;
    } | null = null;

    let orderRecord: {
      id: string;
      order_number: string;
      table_number: string;
      total_paise: number;
      payment_status: string;
    } | null = null;

    if (supabaseAdmin) {
      if (mtx) {
        const { data: p } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, amount_paise, status, merchant_transaction_id, provider_reference_id")
          .eq("merchant_transaction_id", mtx)
          .maybeSingle();
        paymentRecord = p;
      }

      if (!paymentRecord && orderId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const { data: p } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, amount_paise, status, merchant_transaction_id, provider_reference_id")
          .eq(isUuid ? "order_id" : "merchant_transaction_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentRecord = p;
      }

      const lookupOrderId = paymentRecord?.order_id || orderId;
      if (lookupOrderId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupOrderId);
        const { data: ord } = isUuid
          ? await supabaseAdmin
              .from("orders")
              .select("id, order_number, table_number, total_paise, payment_status")
              .eq("id", lookupOrderId)
              .maybeSingle()
          : await supabaseAdmin
              .from("orders")
              .select("id, order_number, table_number, total_paise, payment_status")
              .eq("order_number", lookupOrderId)
              .maybeSingle();

        orderRecord = ord;
      }
    }

    // If already marked PAID in database, return current status
    if (paymentRecord?.status?.toUpperCase() === "PAID" || orderRecord?.payment_status?.toUpperCase() === "PAID") {
      return NextResponse.json({
        verified: true,
        status: "PAID",
        orderId: orderRecord?.id || orderId,
        orderNumber: orderRecord?.order_number,
        merchantTransactionId: paymentRecord?.merchant_transaction_id,
        providerReferenceId: paymentRecord?.provider_reference_id,
        amountPaise: paymentRecord?.amount_paise || orderRecord?.total_paise,
        amountRupees: paiseToRupees(paymentRecord?.amount_paise || orderRecord?.total_paise || 0),
        message: "Payment verified as settled.",
      });
    }

    const transactionIdToCheck = paymentRecord?.merchant_transaction_id || mtx;
    if (!transactionIdToCheck) {
      return NextResponse.json(
        {
          verified: false,
          status: "PENDING",
          message: "No active payment transaction found to verify.",
        },
        { status: 200 }
      );
    }

    const expectedAmount = paymentRecord ? Number(paymentRecord.amount_paise) : undefined;

    // Call PhonePe Status API via UPIPay
    try {
      const pspStatus = await client.checkStatus(transactionIdToCheck, {
        expectedAmount,
      });

      if (pspStatus.status === "SUCCESS") {
        // Mark as PAID in Supabase
        if (supabaseAdmin && paymentRecord) {
          await supabaseAdmin.rpc("settle_phonepe_payment", {
            p_merchant_transaction_id: transactionIdToCheck,
            p_provider_reference_id: pspStatus.transactionId || null,
            p_amount_paise: pspStatus.amount,
            p_raw_payload: pspStatus.rawResponse as Record<string, unknown>,
          });
        }

        return NextResponse.json({
          verified: true,
          status: "PAID",
          orderId: orderRecord?.id || orderId,
          orderNumber: orderRecord?.order_number,
          merchantTransactionId: transactionIdToCheck,
          providerReferenceId: pspStatus.transactionId,
          amountPaise: pspStatus.amount,
          amountRupees: paiseToRupees(pspStatus.amount),
        });
      } else if (pspStatus.status === "FAILED") {
        if (supabaseAdmin && paymentRecord) {
          await supabaseAdmin
            .from("payments")
            .update({ status: "FAILED", updated_at: new Date().toISOString() })
            .eq("id", paymentRecord.id);
        }

        return NextResponse.json({
          verified: false,
          status: "FAILED",
          merchantTransactionId: transactionIdToCheck,
          message: "Payment was not completed or failed with provider.",
        });
      } else {
        return NextResponse.json({
          verified: false,
          status: "PENDING",
          merchantTransactionId: transactionIdToCheck,
          message: "Payment is pending authorization.",
        });
      }
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : "Status check failed";
      return NextResponse.json({
        verified: false,
        status: paymentRecord?.status?.toUpperCase() || "PENDING",
        merchantTransactionId: transactionIdToCheck,
        message: msg,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification route failure";
    console.error("Payment Verification Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
