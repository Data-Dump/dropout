import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { safeServerError } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`verify-payment:${ip}`, 30, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many verification requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as VerifyPaymentRequest;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required payment parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
        },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.warn(
        `[Razorpay Signature Mismatch] Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`
      );
      // Mismatch: return 400, do NOT mark as paid
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed. Signature mismatch.",
        },
        { status: 400 }
      );
    }

    // Signature matches: mark as paid in database if orderId is provided
    if (orderId) {
      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
          const { data: ord } = await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "PAID",
              payment_method: "upi_online",
              updated_at: new Date().toISOString(),
            })
            .eq(isUuid ? "id" : "order_number", orderId)
            .select("id")
            .maybeSingle();

          const targetOrderId = ord?.id || (isUuid ? orderId : null);

          // Update payment record by order_id and/or merchant_transaction_id
          if (targetOrderId) {
            await supabaseAdmin
              .from("payments")
              .update({
                status: "PAID",
                provider: "razorpay",
                merchant_transaction_id: razorpay_order_id,
                provider_reference_id: razorpay_payment_id,
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", targetOrderId);
          } else {
            await supabaseAdmin
              .from("payments")
              .update({
                status: "PAID",
                provider: "razorpay",
                provider_reference_id: razorpay_payment_id,
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("merchant_transaction_id", razorpay_order_id);
          }
        } catch (dbErr) {
          console.warn("Could not update Supabase order payment status:", dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (error: unknown) {
    console.error("Error verifying Razorpay payment:", error);

    return NextResponse.json(
      {
        success: false,
        error: safeServerError(error, "Failed to verify payment"),
      },
      { status: 500 }
    );
  }
}
