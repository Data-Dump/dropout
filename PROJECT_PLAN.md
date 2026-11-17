# Project Plan: DROPOUT Cafe & Restro QR POS System

## 1. Executive Summary
**DROPOUT Cafe & Restro** is a modern Indian cafe operating with 10 dining tables (`Table 01` to `Table 10`). This system replaces legacy paper menus and fragmented billing with an end-to-end cloud-native QR ordering and Point-of-Sale (POS) platform.

---

## 2. Architecture & Design Principles

### 2.1 Aesthetic & Visual Identity
- **Design Direction**: Minimal, premium, modern Indian cafe aesthetic.
- **Palette**:
  - Background: Warm linen & parchment (`#FAF8F5`).
  - Typography: Dark espresso (`#211D1A` / Stone 900) for contrast and legibility.
  - Accent: Artisan roasted terracotta / warm amber (`#C35B29`).
  - Subtle borders: Warm hairline stone (`#E4DFD8` / Stone 200).
  - Indian Dining Badges: FSSAI-compliant Veg (green square with dot), Non-Veg (red square with triangle), Egg (amber square).
- **Responsiveness**: Mobile-first architecture with thumb-friendly bottom action drawers, responsive grid layouts, and large touch targets for tablets.

### 2.2 System Architecture
```
                         ┌────────────────────────────────────────────────────────┐
                         │                    Vercel Edge CDN                     │
                         └───────────────────────────┬────────────────────────────┘
                                                     │
                   ┌─────────────────────────────────┼────────────────────────────────┐
                   ▼                                 ▼                                ▼
       ┌───────────────────────┐         ┌───────────────────────┐        ┌───────────────────────┐
       │   Customer Devices    │         │      Kitchen KDS      │        │      Manager POS      │
       │  (/table/01 to 10)    │         │      (/kitchen)       │        │       (/admin)        │
       └───────────┬───────────┘         └───────────┬───────────┘        └───────────┬───────────┘
                   │                                 │                                │
                   └─────────────────────────────────┼────────────────────────────────┘
                                                     ▼
                                     ┌───────────────────────────────┐
                                     │     Next.js App Router API    │
                                     │ (SSR / Server Actions / Store)│
                                     └───────────────┬───────────────┘
                                                     │
                                                     ▼
                                     ┌───────────────────────────────┐
                                     │       Supabase Backend        │
                                     │  - PostgreSQL DDL + RLS       │
                                     │  - Realtime Publications      │
                                     │  - Auth & Role Security       │
                                     └───────────────┬───────────────┘
                                                     │
                                                     ▼
                                     ┌───────────────────────────────┐
                                     │  PhonePe UPI Gateway (UPIPay) │
                                     │   (Planned Phase 2 Gateway)   │
                                     └───────────────────────────────┘
```

---

## 3. Core Modules Completed (Milestone 1)

| Module | Scope | Status |
|---|---|---|
| **Foundation & Build** | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Geist font, Sonner toaster | ✅ Completed |
| **Domain Modeling** | 10 fixed tables (`Table 01` – `Table 10`), INR currency (`₹`), Diet tags, Order lifecycle statuses | ✅ Completed |
| **Customer QR Menu** | Responsive menu catalog, category tabs, diet filtering (Veg/Non-Veg/Egg), search, Unsplash photos | ✅ Completed |
| **Table Deep Linking** | Direct QR URL router (`/table/[tableId]`) with auto-table locking and validation | ✅ Completed |
| **Order Cart & Checkout** | Floating bottom bar, special chef instructions, 5% GST computation, Pay-at-Counter & UPI options | ✅ Completed |
| **Order Live Tracking** | Stepper progress bar (`/order/[orderId]`), itemized receipt, shareable bill link | ✅ Completed |
| **Kitchen Display (KDS)** | Real-time order stream (`/kitchen`), elapsed timer with delay alerts, status bump buttons | ✅ Completed |
| **Protected Admin POS** | PIN-gated interface (`/admin`) with master PIN `1234` or staff PINs | ✅ Completed |
| **Admin Overview** | Today's sales (₹), orders, pending/completed, UPI/Counter breakdown, top dishes | ✅ Completed |
| **Live Order Desk** | Status filters, order details, add-ons, Accept/Cook/Ready/Serve/Complete/Cancel actions | ✅ Completed |
| **Menu & Add-on Manager** | Full CRUD for dishes, image presets, prices, savings tags, availability toggle, custom add-ons | ✅ Completed |
| **Category Manager** | Full CRUD for menu categories with display order and item count badges | ✅ Completed |
| **Table Floor Manager** | Seating capacity controls for Tables 01–10, active table totals, occupancy indicators | ✅ Completed |
| **QR Print Hub** | Stand generator for individual tables & batch print sheet for all 10 tables | ✅ Completed |
| **Payments Desk** | Breakdown of UPI vs Counter, states (Paid, Pending, Failed, Refunded), settlement actions | ✅ Completed |
| **Sales Analytics** | Today/Week/Month performance, revenue velocity, AOV, category shares, CSV export | ✅ Completed |
| **Staff & Shift Manager** | Roles (Manager, Chef, Cashier, Barista, Server), shift duty status, 4-digit PINs | ✅ Completed |
| **Cafe Settings** | Outlet profile, 5% GST rate, currency, audio chimes, PhonePe UPIPay status, reset demo | ✅ Completed |

---

## 4. Architectural Decisions

1. **Fixed 10 Tables Architecture**:
   - *Decision*: Hardcode support for exactly `Table 01` through `Table 10` with normalizers for formats like "01", "1", "table-01".
   - *Rationale*: Eliminates customer input errors and guarantees alignment with the cafe's physical layout.

2. **Dual-Mode Persistence (Local + Supabase)**:
   - *Decision*: Built a context store (`src/lib/store/restaurant-store.tsx`) with localStorage caching and mock seed orders, while supplying full Supabase client utilities and SQL DDL.
   - *Rationale*: Allows developers and stakeholders to demo and verify all features immediately without requiring database credentials upfront.

3. **Decoupled Payment Boundary**:
   - *Decision*: Integrated the payment UI with both "Pay at Counter" and "UPI (PhonePe)" selectors without hardcoding or inventing merchant secrets.
   - *Rationale*: Follows the strict security rule: *Do not invent API credentials and do not put secrets in frontend code*.

4. **Self-Contained Local Fonts**:
   - *Decision*: Configured `next/font/local` using the bundled Geist variable font files.
   - *Rationale*: Eliminates network failures during containerized/sandboxed builds caused by external Google Fonts requests.

---

## 5. Completed Milestones

### Milestone 1: Production Frontend & Flow Architecture ✅
- Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui.
- 10 fixed tables (`Table 01` to `Table 10`) with normalizer.
- Customer QR ordering, table landing routes, cart, and live order tracking.
- Kitchen Display System (KDS) and Manager Admin POS (11 views).

### Milestone 2: Supabase PostgreSQL, Auth, Storage & Realtime Integration ✅
- **11 Relational Tables**: `profiles`, `cafe_settings`, `restaurant_tables`, `menu_categories`, `menu_items`, `menu_variants`, `menu_addons`, `orders`, `order_items`, `payments`, `staff_roles`.
- **Integer Paise Monetary System**: All prices, taxes, subtotals, and totals stored as `BIGINT` integer paise (e.g. ₹69 = `6900` paise).
- **Triggers & Indexes**: Automated `updated_at` triggers and performance indexes on status, QR slugs, order foreign keys, and timestamps.
- **Row Level Security (RLS)**: Public read for active menu items/categories; role-based staff access; secure server order placement.
- **Server-Side Validated Order API**: `POST /api/orders` recalculates item subtotal and 5% GST strictly in integer paise on the server before inserting to PostgreSQL.
- **Supabase Storage**: Configured `menu-images` bucket with upload helper and admin file picker integration.
- **Realtime Subscriptions**: Live bi-directional updates for orders, order items, and menu availability across customer, kitchen, and admin views.
- **Dual-Mode Hydration**: Smooth zero-config local fallback when Supabase credentials are not yet supplied.

### Milestone 3: Database-Backed Menu Management & Live Synchronization ✅
- **Category Operations**: Full CRUD, validation, custom confirmation dialogs, loading states, and live reordering (Move Up / Down & display order) synced directly to Supabase `menu_categories`.
- **Menu Item Operations**: Full CRUD with prices in INR (saved as integer paise), rich descriptions, portion sizes, preparation time, and diet markings (`veg`, `egg`, `non-veg`).
- **Sizes & Portion Variants**: Admin configuration of multiple sizes (e.g. Small / Large, Half / Full) with individual prices and default toggles, automatically rendered in customer selection modal.
- **Custom Add-Ons**: Item-specific add-ons with custom prices (e.g. Extra Cheese Layer ₹20, Schezwan Dip ₹15).
- **Food Image Uploads**: Seamless Supabase Storage integration with file validation, instant preview, and preset fallbacks.
- **Availability Toggles**: 1-click In Stock / Sold Out toggle with visual loading indicators and database sync.
- **Live Automatic Customer Updates**: Supabase Realtime replication on `menu_categories`, `menu_items`, `menu_variants`, and `menu_addons` updates customer browsing screens automatically with zero refresh.

---

## 6. Upcoming Milestones

### Milestone 4: UPIPay & PhonePe UPI Payment Integration ✅
- **UPIPay SDK Integration**: Installed and configured `upipay@1.0.0` with PhonePe adapter and zero-trust configuration.
- **Server-Side API Routes**:
  - `POST /api/payments/create`: Generates unique merchant transaction IDs (`MT_...`), enforces authoritative integer paise amount from database, and issues session tokens with dynamic NPCI QR codes and UPI intent links (PhonePe, GPay, Paytm).
  - `POST /api/payments/webhook`: S2S webhook listener with raw body extraction and SHA256 signature verification via `client.verifyWebhook()`, secondary status double-check, and idempotent settlement.
  - `POST /api/payments/verify`: Server-side status polling querying PhonePe `/pg/v1/status/{merchantId}/{merchantTransactionId}` with `expectedAmount` matching to prevent amount-tampering attacks.
  - `GET /api/payments`: Admin payments history route listing all UPI and counter transactions with paise-accurate ledger.
- **Zero-Trust Order Settle Database Trigger**: PostgreSQL stored procedure `settle_phonepe_payment` ensures atomic transitions of payment to `SUCCESS` and order to `PAID`, preventing race conditions and replay attacks.
- **Counter Payments Strict Isolation**: Counter cash/card payments are explicitly segregated from UPI gateway flows and can only be marked paid manually by authorized staff.
- **Order Tracking Live Payment Card**: Instant scan-to-pay QR code, intent buttons, and automated 5s background status polling.

### Milestone 5: Kitchen Display System (KDS) & Operational Reporting Engine ✅
- **Full-Screen Kitchen Display (`/kitchen`)**:
  - Fullscreen API toggle (`requestFullscreen`) and High-Contrast Kitchen Dark Mode for commercial kitchen monitors.
  - Live ticking digital clock with seconds (`HH:mm:ss`).
  - Web Audio API synthesized cafe chime (two-tone harmonious bell 587Hz -> 880Hz `D5 -> A5`) for incoming orders.
  - Real-time order age timer with color escalation (<10m Green, 10-20m Amber, >20m Red Delayed alert).
  - Interactive item prep checklist: cooks can tap line items to strike them through as prepared.
  - Order bump workflow: Accept (➔ ACCEPTED), Start Preparing (➔ PREPARING), Mark Ready (➔ READY), Served (➔ SERVED).
  - Server-side `PATCH /api/orders` sync updating Supabase PostgreSQL and broadcasting via Realtime to customer order tracking page (`/order/[orderId]`).
- **Database-Backed Reporting Engine (`/api/reports` & Admin Reports)**:
  - Direct PostgreSQL aggregations from Supabase `orders` and `order_items` across real date ranges.
  - Timeframe filters: Daily (Today), Weekly (Last 7 Days), Monthly (Last 30 Days), and Custom Date Range picker.
  - Financial KPIs: Gross revenue (₹), Subtotal (₹), 5% GST Output tax (₹), Total orders, Completed orders, Active orders, Average Order Value (AOV).
  - Risk & Attrition: Cancelled orders count and lost revenue; Refunded orders count and refunded value.
  - Payment Channel Reconciliation: UPI (PhonePe) vs Pay at Counter breakdown with % share and paid vs pending stats.
  - Most Popular Dishes: Ranked top 10 items by volume and revenue with FSSAI diet badges.
  - Category-Wise Sales: Visual contribution bars showing category revenue, item volume, and % share.
  - Exportable CSV Reports: Dual exports for comprehensive order transaction ledger and itemized dish sales.
  - Role-Based Access Control (RBAC): Sensitive financial reports gated exclusively to Managers/Admins with PIN authorization.

---

### Milestone 6: Production Readiness & Deployment Preparation ✅
- **Automated Verification Suite (`scratch/test-production-readiness.mjs`)**: 12/12 automated integration tests passing.
- **Strict Anchored Table Normalizer**: Regex updated to `^(?:table\s*[-_]?\s*)?(\d{1,2})$` preventing any text or script injection from matching digits.
- **Secret Hygiene**: Confirmed zero leakage of `SUPABASE_SERVICE_ROLE_KEY` or `PHONEPE_SALT_KEY` into browser bundles or `NEXT_PUBLIC_*` variables.
- **Comprehensive Runbook Artifact**: Produced `PRODUCTION_READINESS_REPORT.md` documenting Vercel settings, Supabase migrations, custom domain CNAME routing, PhonePe live onboarding, and backup recovery.

---

## 6. Upcoming Milestones

### Milestone 7: Thermal Receipt Printing
- ESC/POS printer integration for 80mm kitchen ticket and customer bill printing.
- Web Bluetooth / network IP printer integration for staff tablets.

---

## 7. Verification & Quality Checks
- [x] TypeScript validation passing (`strict: true`, `npx tsc --noEmit` $\rightarrow$ 0 errors).
- [x] Next.js production build (`npm run build`) passing with 0 warnings/errors.
- [x] ESLint validation (`npm run lint`) passing with 0 warnings/errors.
- [x] Dynamic routes verified: `/table/[tableId]`, `/order/[orderId]`.
- [x] Static routes verified: `/`, `/kitchen`, `/admin`.
- [x] API routes verified: `/api/orders`, `/api/payments/create`, `/api/payments/webhook`, `/api/payments/verify`, `/api/payments`, `/api/reports`.
- [x] PhonePe UPIPay payment session generation & webhook verification tested.
- [x] KDS live audio chime, order timers, and Realtime synchronization verified.
- [x] Automated production readiness test suite (12/12 tests passed).
- [x] Supabase DDL migration files verified (`supabase/migrations/20261117000000_initial_schema.sql`, `20261117000001_order_engine.sql`, `20261117000002_phonepe_upipay.sql`).
