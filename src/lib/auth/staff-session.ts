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

export function directBrowserBlockedResponse(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Restricted | DROPOUT Cafe &amp; Restro</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #FAF8F5;
      color: #211D1A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      width: 100%;
      max-width: 400px;
      background: #FFFFFF;
      border: 1px solid #E4DFD8;
      border-radius: 20px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 8px 30px rgba(33, 29, 26, 0.06);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(195, 91, 41, 0.12);
      color: #C35B29;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      line-height: 1.55;
      color: #75716B;
      margin-bottom: 24px;
    }
    a.btn {
      display: inline-block;
      width: 100%;
      padding: 12px 20px;
      border-radius: 12px;
      background: #C35B29;
      color: #FAF8F5;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      transition: opacity 0.15s ease;
    }
    a.btn:hover { opacity: 0.92; }
    .brand {
      margin-top: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #A09A92;
    }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">403 · Protected Endpoint</span>
    <h1>Access Restricted</h1>
    <p>This endpoint is reserved for DROPOUT Cafe &amp; Restro&apos;s internal POS system and cannot be opened directly.</p>
    <a class="btn" href="/">Back to Menu</a>
    <div class="brand">DROPOUT Cafe &amp; Restro</div>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
