import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRazorpayClient } from "@/lib/payments/razorpay";
import { paiseToRupees } from "@/lib/utils";
import { safeServerError } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Server-Side Payment Verification Endpoint for Razorpay
 * 
 * Verifies payment status directly with Razorpay API.
 * Never trusts unverified client claims.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const mtx = url.searchParams.get("mtx"); // merchantTransactionId (e.g. order_xxx or MT_xxx)

    if (!orderId && !mtx) {
      return NextResponse.json(
        { error: "orderId or mtx (merchantTransactionId) is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

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
      if (supabaseAdmin && paymentRecord?.id && paymentRecord?.status?.toUpperCase() !== "PAID") {
        await supabaseAdmin.from("payments").update({
          status: "PAID",
          settled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", paymentRecord.id);
      }
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

    // Query Razorpay
    let razorpay;
    try {
      razorpay = getRazorpayClient();
    } catch {
      // Razorpay client initialization error or not configured
    }

    if (razorpay) {
      const razorpayOrderId = paymentRecord?.merchant_transaction_id || (mtx?.startsWith("order_") ? mtx : null);

      if (razorpayOrderId && razorpayOrderId.startsWith("order_")) {
        try {
          const paymentsRes = await razorpay.orders.fetchPayments(razorpayOrderId);
          const successfulPayment = (paymentsRes?.items || []).find(
            (p: { status: string }) => p.status === "captured" || p.status === "authorized"
          );

          if (successfulPayment) {
            if (supabaseAdmin) {
              if (orderRecord?.id) {
                await supabaseAdmin.from("orders").update({
                  payment_status: "PAID",
                  payment_method: "upi_online",
                  updated_at: new Date().toISOString(),
                }).eq("id", orderRecord.id);
              }
              const pId = paymentRecord?.id;
              if (pId) {
                await supabaseAdmin.from("payments").update({
                  status: "PAID",
                  provider: "razorpay",
                  provider_reference_id: successfulPayment.id,
                  settled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq("id", pId);
              }
            }

            return NextResponse.json({
              verified: true,
              status: "PAID",
              orderId: orderRecord?.id || orderId,
              orderNumber: orderRecord?.order_number,
              merchantTransactionId: razorpayOrderId,
              providerReferenceId: successfulPayment.id,
              amountPaise: Number(successfulPayment.amount),
              amountRupees: paiseToRupees(Number(successfulPayment.amount)),
              message: "Razorpay payment verified as captured & settled.",
            });
          }
        } catch (fetchErr) {
          console.warn("Could not query Razorpay order payments:", fetchErr);
        }
      }

      // Check recent payments by matching notes.orderId
      try {
        const recentPayments = await razorpay.payments.all({ count: 25 });
        const matched = (recentPayments?.items || []).find((p: { notes?: Record<string, string>; status: string; id: string; order_id: string; amount: number | string }) => {
          const noteOrdId = p.notes?.orderId;
          const isMatch = noteOrdId && (
            noteOrdId === orderRecord?.id ||
            noteOrdId === orderRecord?.order_number ||
            noteOrdId === orderId
          );
          return isMatch && (p.status === "captured" || p.status === "authorized");
        });

        if (matched) {
          if (supabaseAdmin) {
            if (orderRecord?.id) {
              await supabaseAdmin.from("orders").update({
                payment_status: "PAID",
                payment_method: "upi_online",
                updated_at: new Date().toISOString(),
              }).eq("id", orderRecord.id);
            }
            if (paymentRecord?.id) {
              await supabaseAdmin.from("payments").update({
                status: "PAID",
                provider: "razorpay",
                merchant_transaction_id: matched.order_id || paymentRecord.merchant_transaction_id,
                provider_reference_id: matched.id,
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("id", paymentRecord.id);
            }
          }

          return NextResponse.json({
            verified: true,
            status: "PAID",
            orderId: orderRecord?.id || orderId,
            orderNumber: orderRecord?.order_number,
            merchantTransactionId: matched.order_id,
            providerReferenceId: matched.id,
            amountPaise: Number(matched.amount),
            amountRupees: paiseToRupees(Number(matched.amount)),
            message: "Matched payment in Razorpay records as settled.",
          });
        }
      } catch (recentErr) {
        console.warn("Could not query recent Razorpay payments:", recentErr);
      }
    }

    return NextResponse.json({
      verified: false,
      status: "PENDING",
      merchantTransactionId: paymentRecord?.merchant_transaction_id || mtx,
      message: "Payment is pending authorization in Razorpay gateway.",
    });
  } catch (err: unknown) {
    console.error("Payment Verification Error:", err);
    return NextResponse.json({ error: safeServerError(err, "Verification route failure") }, { status: 500 });
  }
}
