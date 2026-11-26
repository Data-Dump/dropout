# Vercel Deployment & Application Security Audit Report

**Project:** DROPOUT Cafe & Restro (`dropout-pos`)  
**Production URL:** `https://dropout-pos.vercel.app`  
**Audit Date:** 2026-11-27  
**Scope:** Vercel configuration, environment variables, Git history, Next.js serverless API routes, HTTP security headers, dependencies, and non-destructive production header checks.

---

## 1. Overall Security Posture

| Area | Before Remediation | After Remediation |
| --- | --- | --- |
| Staff API Authentication | **Critical** (unauthenticated) | **Secured** (HMAC-SHA256 `HttpOnly` session cookie + RBAC) |
| Hardcoded Credentials & Client PIN | **Critical** (fallback strings + `NEXT_PUBLIC_ADMIN_PIN`) | **Secured** (env-only secrets, client PIN bypass removed) |
| Order & Payment Amount Integrity | **High** (client price/amount fallbacks) | **Secured** (server-authoritative DB/catalog pricing) |
| Rate Limiting | **Medium** (none) | **Secured** (sliding-window rate limits on auth & checkout) |
| HTTP Security Headers | **Medium** (missing CSP, XFO, nosniff) | **Secured** (CSP, XFO, XCTO, Referrer-Policy, Permissions-Policy) |
| Secrets in Git History | **Clean** (`.env.local` never committed) | **Clean** (migration password comments scrubbed) |
| Dependency Security (`next@14.2.24`) | **High/Critical** (`npm audit` advisories) | **Pending Manual Upgrade** (requires breaking Next.js major/minor testing) |

---

## 2. Vulnerabilities Identified

### Critical
1. **Unauthenticated Administrative & Destructive Endpoints (Verified on Production)**
   - Non-destructive `HEAD` requests (`curl -sI`) to `https://dropout-pos.vercel.app/api/orders`, `/api/payments`, and `/api/reports` all returned `HTTP/2 200` without authentication.
   - `DELETE /api/orders?all=true` could purge all orders, order items, and payments without authentication.
   - `PATCH /api/orders` could modify any order status or payment status (`PAID`) without authentication.
   - `GET /api/orders`, `GET /api/payments`, and `GET /api/reports` exposed customer names, phone numbers, transaction IDs, and revenue analytics publicly.
2. **Client-Only Admin Auth & Hardcoded Default Passwords**
   - `src/app/api/admin/login/route.ts` contained hardcoded fallback passwords (`SUPERADMIN_PASSWORD`, `KITCHEN_PASSWORD` fallbacks) and issued no server-verified `HttpOnly` cookie.
   - `src/lib/store/restaurant-store.tsx` exposed `NEXT_PUBLIC_ADMIN_PIN` (with a default fallback) in the client JavaScript bundle.
   - `supabase/migrations/20261117000003_admin_user.sql` documented default passwords in plain text.
   - `src/app/kitchen/page.tsx` lacked `<AdminAuthGate>`.

### High
3. **Client-Supplied Price & Amount Fallbacks**
   - `POST /api/orders` fell back to client-supplied `rawItem.price`, `selectedVariant.price`, and `addon.price` when items were not matched in Supabase or `MOCK_MENU_ITEMS`.
   - `POST /api/create-order` accepted `body.amount` directly from the client without verifying it against `orders.total_paise` in Supabase.
4. **Vulnerable `next@14.2.24` & `postcss` Dependencies**
   - `npm audit` reported **6 vulnerabilities (1 moderate, 4 high, 1 critical)** in `next@14.2.24` and `postcss` (e.g., `GHSA-f82v-jwr5-mffw`, Image Optimization & RSC advisories).

### Medium
5. **Missing HTTP Security Headers**
   - Production responses only included Vercel's default `strict-transport-security` header. `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` were missing.
6. **Missing Rate Limiting**
   - `/api/admin/login`, `/api/orders`, and `/api/create-order` had no brute-force or abuse rate limiting.

### Low / Clean
7. **Secrets & Source Maps**
   - `.env.local` is properly gitignored and was never committed in Git history.
   - `productionBrowserSourceMaps` defaults to `false` (now explicitly enforced alongside `poweredByHeader: false`).

---

## 3. Environment Variables Audit (Names Only)

- **Public (`NEXT_PUBLIC_*` — intentionally bundled in browser):**
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_CAFE_NAME`
  - `NEXT_PUBLIC_CAFE_WHATSAPP_PHONE`
  - `NEXT_PUBLIC_CURRENCY_SYMBOL`
  - `NEXT_PUBLIC_TABLE_COUNT`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
  - ~~`NEXT_PUBLIC_ADMIN_PIN`~~ (**Removed** from client code and `.env.example`)
- **Server-Only Secrets (Verified NOT prefixed with `NEXT_PUBLIC_`):**
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_ENV`, `PHONEPE_CALLBACK_URL`, `PHONEPE_VPA`, `CAFE_UPI_VPA`
  - `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `KITCHEN_EMAIL`, `KITCHEN_PASSWORD`
  - `STAFF_SESSION_SECRET` (**Newly recommended** in `.env.example`)

---

## 4. Fixes Implemented

1. **Signed `HttpOnly` Staff Session & RBAC**
   - Added [`src/lib/auth/staff-session.ts`](src/lib/auth/staff-session.ts) using HMAC-SHA256 signed tokens in an `HttpOnly; Secure; SameSite=Lax` cookie (`dropout_staff_session`).
   - Added [`src/app/api/admin/logout/route.ts`](src/app/api/admin/logout/route.ts) to clear the session cookie on logout.
   - Updated [`src/app/api/admin/login/route.ts`](src/app/api/admin/login/route.ts) to remove hardcoded fallback passwords, use `crypto.timingSafeEqual`, set the `HttpOnly` cookie, and avoid returning raw Supabase tokens.
   - Protected [`src/app/kitchen/page.tsx`](src/app/kitchen/page.tsx) with `<AdminAuthGate>`.
2. **Secured All Sensitive API Routes**
   - [`src/app/api/orders/route.ts`](src/app/api/orders/route.ts):
     - `GET`: Requires staff session cookie to list all orders; allows unauthenticated single-order lookup **only** via `?orderId=<id>` (updated [`src/app/order/[orderId]/page.tsx`](src/app/order/%5BorderId%5D/page.tsx) accordingly).
     - `PATCH` & `DELETE`: Require valid staff session cookie (`401` otherwise). `DELETE ?all=true` strictly requires `superadmin` role (`403` otherwise).
     - `POST`: Rejects unverified menu items instead of trusting client prices; uses server-side DB/catalog prices only.
   - [`src/app/api/payments/route.ts`](src/app/api/payments/route.ts) & [`src/app/api/reports/route.ts`](src/app/api/reports/route.ts): Require `superadmin` session cookie (`401`/`403` otherwise).
   - [`src/app/api/create-order/route.ts`](src/app/api/create-order/route.ts): Enforces `orders.total_paise` from Supabase when `orderId` is provided instead of trusting client-supplied `amount`.
3. **Rate Limiting**
   - Added [`src/lib/security/rate-limit.ts`](src/lib/security/rate-limit.ts) and applied per-IP sliding-window limits on `/api/admin/login` (10 req / 5 min), `/api/orders` `POST` (20 req / 5 min), and `/api/create-order` (20 req / 5 min).
4. **Removed Hardcoded Secrets & Client PIN Bypass**
   - Removed `NEXT_PUBLIC_ADMIN_PIN` fallback in [`src/lib/store/restaurant-store.tsx`](src/lib/store/restaurant-store.tsx) and [`.env.example`](.env.example).
   - Scrubbed default password comments from [`supabase/migrations/20261117000003_admin_user.sql`](supabase/migrations/20261117000003_admin_user.sql).
5. **HTTP Security Headers & Hardening**
   - Configured `poweredByHeader: false`, `productionBrowserSourceMaps: false`, `Content-Security-Policy` (allowing Razorpay Checkout, Google Maps iframe, Supabase, and Unsplash), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` in [`next.config.mjs`](next.config.mjs).

---

## 5. Remaining Manual Vercel Dashboard Actions

1. **Rotate Staff Passwords & Set `STAFF_SESSION_SECRET`:**
   - In **Vercel Project Settings → Environment Variables** (Production & Preview), ensure `SUPERADMIN_PASSWORD` and `KITCHEN_PASSWORD` are set to strong, unique values (rotate away from any previously used defaults), and add a random 32+ byte `STAFF_SESSION_SECRET`.
   - Also update the corresponding passwords in **Supabase Auth → Users**.
2. **Enable Vercel Deployment Protection on Preview/Development:**
   - In **Vercel Project Settings → Deployment Protection**, enable **Vercel Authentication** for Preview Deployments so unauthenticated users cannot access preview URLs.
3. **Separate Preview vs Production Secrets:**
   - Ensure Preview environments use **Test/Sandbox** Razorpay keys and a staging Supabase project, never Production live keys or production customer data.
4. **Plan Next.js Security Upgrade:**
   - Schedule a dedicated branch test to upgrade `next` from `14.2.24` to a patched Next.js 15/16 release to resolve the `npm audit` Next.js & `postcss` advisories cleanly.
