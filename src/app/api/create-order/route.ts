import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/payments/razorpay";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const body = (await req.json()) as CreateOrderRequest;

    // Amount can be provided as amount (in paise) or amountPaise
    const rawAmount = body.amount !== undefined ? body.amount : body.amountPaise;
    const amount = Number(rawAmount);

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
    if (body.orderId) {
      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
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
    }

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
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
