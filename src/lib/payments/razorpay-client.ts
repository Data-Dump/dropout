"use client";

import { toast } from "sonner";

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id?: string;
    };
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, callback: (response: RazorpayFailureResponse) => void) => void;
    };
  }
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

/**
 * Dynamically loads the Razorpay checkout script if not present
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Standard Web Checkout
 */
export async function initiateRazorpayPayment({
  amountPaise,
  orderId,
  tableNumber,
  customerName,
  customerPhone,
  onSuccess,
  onFailure,
  onDismiss,
}: {
  amountPaise: number;
  orderId: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  onSuccess: (data: RazorpaySuccessResponse) => void | Promise<void>;
  onFailure?: (error: string) => void;
  onDismiss?: () => void;
}): Promise<void> {
  try {
    // 1. Ensure SDK script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      const err = "Payment gateway failed to initialize. Please check your internet connection.";
      toast.error(err);
      onFailure?.(err);
      return;
    }

    // 2. Call backend to create Razorpay Order
    const createRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(amountPaise),
        orderId,
        currency: "INR",
        notes: {
          tableNumber: tableNumber || "",
          customerName: customerName || "",
        },
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.order_id) {
      const errMsg = createData.error || "Unable to generate payment order";
      toast.error(errMsg);
      onFailure?.(errMsg);
      return;
    }

    const razorpayKey = (createData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    if (!razorpayKey) {
      const err = "Razorpay Key ID is missing from server configuration.";
      toast.error(err);
      onFailure?.(err);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const logoUrl = origin ? `${origin}/logo.png` : undefined;

    // 3. Open Razorpay Standard Checkout modal
    const options: RazorpayCheckoutOptions = {
      key: razorpayKey,
      amount: createData.amount,
      currency: createData.currency || "INR",
      name: "DROPOUT Cafe & Restro",
      description: tableNumber ? `Dining Order for ${tableNumber}` : "Cafe Dine-in & Takeaway",
      image: logoUrl,
      order_id: createData.order_id,
      prefill: {
        name: customerName || "",
        contact: customerPhone ? customerPhone.replace(/\D/g, "") : "",
      },
      theme: {
        color: "#C35B29", // Cafe terracotta brand amber
      },
      handler: async (response: RazorpaySuccessResponse) => {
        try {
          toast.loading("Verifying payment security...", { id: "rzp-verify" });

          // Send verification payload to backend
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            }),
          });

          const verifyData = await verifyRes.json();
          toast.dismiss("rzp-verify");

          if (verifyRes.ok && verifyData.success) {
            toast.success("Payment successful! Your order is being prepared.");
            await onSuccess(response);
          } else {
            const err = verifyData.error || "Payment signature verification failed.";
            toast.error(err);
            onFailure?.(err);
          }
        } catch (vErr) {
          toast.dismiss("rzp-verify");
          console.error("Verification error:", vErr);
          const err = "Error contacting server to verify payment.";
          toast.error(err);
          onFailure?.(err);
        }
      },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled. You can retry or pay at the counter.", {
            duration: 4000,
          });
          onDismiss?.();
        },
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", (response: RazorpayFailureResponse) => {
      console.error("Razorpay Payment Failed:", response.error);
      const desc = response.error.description || "Transaction failed or was declined.";
      toast.error(`Payment failed: ${desc}`);
      onFailure?.(desc);
    });

    rzp.open();
  } catch (err: unknown) {
    console.error("Razorpay checkout initiation error:", err);
    const msg = err instanceof Error ? err.message : "Failed to open checkout";
    toast.error(msg);
    onFailure?.(msg);
  }
}
