import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const STAFF_SESSION_COOKIE = "dropout_staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface StaffSessionPayload {
  role: "superadmin" | "kitchen";
  email: string;
  exp: number;
}

function getSigningSecret(): string {
  const secret = (
    process.env.STAFF_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RAZORPAY_KEY_SECRET ||
    ""
  ).trim();

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("STAFF_SESSION_SECRET or server secret must be configured in production.");
  }

  // Local development fallback only when no server secrets are configured
  return "dev-only-insecure-session-secret";
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
}

export function createStaffSessionToken(payload: {
  role: "superadmin" | "kitchen";
  email: string;
}): string {
  const fullPayload: StaffSessionPayload = {
    role: payload.role,
    email: payload.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  try {
    const expectedSig = sign(encoded);
    const a = Buffer.from(providedSig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as StaffSessionPayload;

    if (
      !decoded ||
      (decoded.role !== "superadmin" && decoded.role !== "kitchen") ||
      typeof decoded.exp !== "number" ||
      decoded.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function getStaffSessionFromRequest(req: NextRequest): StaffSessionPayload | null {
  const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value;
  return verifyStaffSessionToken(token);
}

export function attachStaffSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearStaffSessionCookie(res: NextResponse): void {
  res.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Blocks direct browser address-bar navigation (e.g. opening /api/orders in a tab)
 * while allowing fetch/XHR API calls from the Next.js frontend.
 */
export function isDirectBrowserDocumentRequest(req: NextRequest): boolean {
  const fetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (fetchDest === "document") {
    return true;
  }
  const accept = (req.headers.get("accept") || "").toLowerCase();
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    return true;
  }
  return false;
}
