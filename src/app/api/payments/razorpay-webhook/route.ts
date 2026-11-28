import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("Razorpay Webhook signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payload?.payment?.entity;
      const order = payload.payload?.order?.entity;

      const razorpayOrderId = payment?.order_id || order?.id;
      const razorpayPaymentId = payment?.id;
      const orderIdFromNotes = payment?.notes?.orderId || order?.notes?.orderId;

      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        // 1. If we have custom orderId from notes
        if (orderIdFromNotes) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdFromNotes);
          const { data: ord } = await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "PAID",
              payment_method: "upi_online",
              updated_at: new Date().toISOString(),
            })
            .eq(isUuid ? "id" : "order_number", orderIdFromNotes)
            .select("id")
            .maybeSingle();

          const targetOrderId = ord?.id || (isUuid ? orderIdFromNotes : null);
          if (targetOrderId) {
            await supabaseAdmin
              .from("payments")
              .update({
                status: "PAID",
                provider: "razorpay",
                merchant_transaction_id: razorpayOrderId,
                provider_reference_id: razorpayPaymentId,
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", targetOrderId);
          }
        }

        // 2. Also update by merchant_transaction_id if present
        if (razorpayOrderId) {
          const { data: updatedPayment } = await supabaseAdmin
            .from("payments")
            .update({
              status: "PAID",
              provider: "razorpay",
              provider_reference_id: razorpayPaymentId,
              settled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("merchant_transaction_id", razorpayOrderId)
            .select("order_id")
            .maybeSingle();

          if (updatedPayment?.order_id) {
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "PAID",
                payment_method: "upi_online",
                updated_at: new Date().toISOString(),
              })
              .eq("id", updatedPayment.order_id);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
