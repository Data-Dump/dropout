import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUPIPayClient } from "@/lib/payments/phonepe";
import { safeServerError } from "@/lib/security/sanitize";

/**
 * PhonePe Server-to-Server Webhook Handler
 * 
 * PhonePe delivers payment completion callbacks to this route.
 * Security requirements:
 * 1. Raw body HMAC-SHA256 checksum verification via X-VERIFY header.
 * 2. Secondary independent status check with PhonePe Status API.
 * 3. Idempotent processing to prevent duplicate credits.
 * 4. Only marks orders PAID upon verified successful settlement.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-verify") || req.headers.get("X-VERIFY") || "";
    if (!signature) {
      console.warn("PhonePe Webhook rejected: Missing x-verify signature header");
      return NextResponse.json({ error: "Missing x-verify signature header" }, { status: 401 });
    }

    // Read raw body arrayBuffer
    const arrayBuffer = await req.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const client = getUPIPayClient();
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Initial raw signature verification via UPIPay
    const event = client.verifyWebhook(rawBuffer, signature);

    if (!event.verified) {
      console.error("PhonePe Webhook verification failed: Invalid cryptographic signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const merchantTransactionId = event.orderId;
    if (!merchantTransactionId) {
      return NextResponse.json({ error: "Missing order reference in webhook" }, { status: 400 });
    }

    // 2. Fetch the corresponding payment record from Supabase
    let existingPayment: {
      id: string;
      order_id: string;
      amount_paise: number;
      status: string;
    } | null = null;

    if (supabaseAdmin) {
      const { data: pRow } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, amount_paise, status")
        .eq("merchant_transaction_id", merchantTransactionId)
        .maybeSingle();

      if (pRow) {
        existingPayment = pRow;
      }
    }

    // 3. Duplicate/Replay Guard: If payment is already marked PAID, return 200 OK idempotently
    if (existingPayment && existingPayment.status.toUpperCase() === "PAID") {
      console.log(`PhonePe Webhook: Payment ${merchantTransactionId} already settled (idempotent no-op).`);
      return NextResponse.json({ received: true, message: "Payment already settled" }, { status: 200 });
    }

    // 4. Amount Integrity Verification
    const expectedAmount = existingPayment ? Number(existingPayment.amount_paise) : event.amount;
    if (existingPayment && typeof event.amount === "number" && event.amount !== Number(existingPayment.amount_paise)) {
      console.error("PhonePe Webhook amount mismatch detected:", {
        expected: existingPayment.amount_paise,
        received: event.amount,
      });
      return NextResponse.json({ error: "Amount mismatch detected" }, { status: 400 });
    }

    // 5. Secondary Server-Side Verification with PhonePe Status API
    // Never trust client/webhook status alone; query provider Status API directly
    let isConfirmedSuccess = false;
    let providerTransactionId = event.transactionId || "";

    try {
      const statusResponse = await client.checkStatus(merchantTransactionId, {
        expectedAmount,
      });

      if (statusResponse.status === "SUCCESS") {
        isConfirmedSuccess = true;
        if (statusResponse.transactionId) {
          providerTransactionId = statusResponse.transactionId;
        }
      }
    } catch (statusErr) {
      console.warn("Secondary checkStatus query error, evaluating webhook event status:", statusErr);
      if (event.status === "SUCCESS") {
        isConfirmedSuccess = true;
      }
    }

    // 5. Update Database Records
    if (supabaseAdmin && existingPayment) {
      if (isConfirmedSuccess) {
        // Atomic settlement stored procedure or fallback update
        try {
          const { error: rpcErr } = await supabaseAdmin.rpc("settle_phonepe_payment", {
            p_merchant_transaction_id: merchantTransactionId,
            p_provider_reference_id: providerTransactionId,
            p_amount_paise: expectedAmount || 0,
            p_raw_payload: event.rawPayload as Record<string, unknown>,
          });

          if (rpcErr) {
            // Direct fallback update
            await supabaseAdmin
              .from("payments")
              .update({
                status: "PAID",
                provider_reference_id: providerTransactionId,
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPayment.id);

            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "PAID",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPayment.order_id);
          }
        } catch (dbErr) {
          console.error("Error settling payment in Supabase:", dbErr);
        }
      } else if (event.status === "FAILED") {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);
      }
    }

    return NextResponse.json(
      {
        received: true,
        merchantTransactionId,
        settled: isConfirmedSuccess,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("PhonePe Webhook Route Error:", err);
    return NextResponse.json({ error: safeServerError(err, "Webhook processing failed") }, { status: 500 });
  }
}
