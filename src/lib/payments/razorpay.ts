import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Singleton or cached Razorpay instance
 */
let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const key_id = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!key_id || !key_secret) {
    const missing: string[] = [];
    if (!key_id) missing.push("RAZORPAY_KEY_ID");
    if (!key_secret) missing.push("RAZORPAY_KEY_SECRET");
    throw new Error(
      `Razorpay credentials missing on server: ${missing.join(", ")}. Please ensure they are added in Vercel Project Settings > Environment Variables and that the project is redeployed.`
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(generatedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
