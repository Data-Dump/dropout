import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/payments/razorpay";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

interface CreateOrderRequest {
  amount?: number;
  amountPaise?: number;
  currency?: string;
  receipt?: string;
  orderId?: string;
  notes?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`create-order:${ip}`, 20, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many payment requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as CreateOrderRequest;

    // Amount can be provided as amount (in paise) or amountPaise
    const rawAmount = body.amount !== undefined ? body.amount : body.amountPaise;
    let amount = Number(rawAmount);

    // Server-authoritative amount verification against Supabase order if orderId is provided
    const supabaseAdmin = getSupabaseAdminClient();
    if (body.orderId && supabaseAdmin) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orderId);
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("total_paise, payment_status")
        .eq(isUuid ? "id" : "order_number", body.orderId)
        .maybeSingle();

      if (existingOrder) {
        if (String(existingOrder.payment_status || "").toUpperCase() === "PAID") {
          return NextResponse.json(
            { error: "Order has already been paid." },
            { status: 400 }
          );
        }
        amount = Number(existingOrder.total_paise);
      }
    }

    // Minimum amount check: 100 paise (₹1.00)
    if (!amount || isNaN(amount) || amount < 100) {
      return NextResponse.json(
        {
          error: "Invalid amount. Minimum amount required by Razorpay is 100 paise (₹1.00).",
        },
        { status: 400 }
      );
    }

    const currency = (body.currency || "INR").toUpperCase();
    const receipt = body.receipt || body.orderId || `rcpt_${Date.now()}`;

    // Initialize Razorpay Client
    let razorpay;
    try {
      razorpay = getRazorpayClient();
    } catch (authErr) {
      const msg =
        authErr instanceof Error
          ? authErr.message
          : "Razorpay credentials are missing on server. Please check Vercel Environment Variables.";
      console.error("Razorpay Authentication Configuration Error:", msg);
      return NextResponse.json(
        {
          error: msg,
        },
        { status: 401 }
      );
    }

    // Call Razorpay API to create order
    const options = {
      amount: Math.round(amount), // in paise
      currency,
      receipt: receipt.substring(0, 40), // Razorpay receipt limit 40 chars
      notes: {
        orderId: body.orderId || "",
        ...(body.notes || {}),
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // If orderId is provided, optionally link or log in Supabase
    if (body.orderId && supabaseAdmin) {
      try {
        await supabaseAdmin.from("payments").insert({
          order_id: body.orderId,
          amount_paise: Math.round(amount),
          currency,
          status: "PENDING",
          provider: "razorpay",
          merchant_transaction_id: razorpayOrder.id,
        });
      } catch (dbErr) {
        console.warn("Could not log Razorpay order to Supabase payments table:", dbErr);
      }
    }

    const serverKeyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: serverKeyId,
    });
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create Razorpay order";

    // Handle authentication error code specifically if present
    const statusCode =
      (error as { statusCode?: number })?.statusCode === 401 ? 401 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
