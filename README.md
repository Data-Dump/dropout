# DROPOUT Cafe & Restro - QR Ordering & POS System

A production-ready QR ordering and restaurant management platform designed for **DROPOUT Cafe & Restro**.

Built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and designed for seamless integration with **Supabase** (PostgreSQL, Auth, Storage, Realtime) and **Vercel** deployment.

---

## 🌟 Key Highlights & Requirements Met

- **10 Dining Tables**: Native support for fixed table layout (`Table 01` to `Table 10`).
- **Currency**: Indian Rupee (`₹` / INR) with 5% Restaurant GST calculation.
- **Customer QR Ordering**:
  - Direct QR landing pages (`/table/[tableId]`) for tables 01 through 10.
  - Minimal, warm modern Indian cafe aesthetic (linen/parchment surfaces, dark typography, warm terracotta/amber accents).
  - High-res photography, FSSAI-compliant diet indicators (Veg / Non-Veg / Egg), and custom chef instructions.
  - Real-time order tracking stepper (`/order/[orderId]`).
- **Kitchen Display System (KDS)**:
  - Full-screen commercial kitchen layout (`/kitchen`) with 1-click Fullscreen toggle.
  - High-contrast Kitchen Dark Mode for glare reduction and steam environments.
  - Web Audio API synthesized cafe chime bell (two-tone harmonious D5 -> A5) for live incoming orders.
  - Live ticking clock (`HH:mm:ss`) and dynamic order age timers with color escalation (<10m Green, 10-20m Amber, >20m Pulsing Red delay warning).
  - Interactive line item preparation checklist: cooks tap dishes to strike them off as cooked.
  - Bump bar workflow: Accept ➔ Start Preparing ➔ Mark Ready ➔ Served to Table, broadcasting live via Supabase Realtime to customer order tracking.
- **Financial & Operational Reporting Engine**:
  - Live PostgreSQL database aggregations (`/api/reports`) from Supabase `orders` and `order_items`.
  - Timeframe filters: Daily (Today), Weekly (7 Days), Monthly (30 Days), and Custom Date Range picker.
  - Executive financial KPIs: Gross revenue (₹), Net subtotal, 5% GST Output tax, Total orders, Completed vs Active orders, Average Order Value (AOV).
  - Cancellation & Loss Auditing: Total cancelled orders count, lost revenue, and refunded order value.
  - Payment Reconciliation: PhonePe UPI (0% MDR) vs Counter cash/card breakdown with percentage shares.
  - Product Intelligence: Top 10 dishes ranked by volume and revenue with FSSAI diet markings and category tags.
  - Dual CSV Exports: Export itemized product sales or comprehensive order transaction ledgers.
  - Role-Based Access Control (RBAC): Sensitive financial figures protected by Manager/Admin PIN clearance.
- **Manager & Admin Dashboard**:
  - Live 10-table floor grid (`/admin`) displaying active order values, table occupancy, and item counts.
  - Built-in printable Table Stand QR Code generator for Tables 01–10.
  - 1-click menu availability toggles (instant In Stock / Sold Out).
  - Order settlement & billing desk for Pay-at-Counter and UPI orders.
- **Payments Ready**:
  - **Pay at Counter** (Cash / Card / Counter UPI) with bill settlement workflow.
  - **UPI Online (PhonePe)** architecture ready for integration with [UPIPay](https://github.com/iamrobinsharaya/upipay).
- **Zero-Config Demo Mode**: Works immediately out of the box with reactive in-memory and local storage caching, transitioning smoothly to Supabase once credentials are provided.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + `tailwindcss-animate` |
| **Component System** | shadcn/ui + Radix UI primitives |
| **Database & Realtime** | Supabase (PostgreSQL + Realtime + RLS) |
| **Icons** | Lucide React |
| **Notifications** | Sonner |
| **QR Code Engine** | `qrcode.react` (SVG / Print-ready) |
| **Hosting & CI/CD** | Vercel |

---

## 📁 Project Directory Structure

```text
dropout-pos/
├── src/
│   ├── app/
│   │   ├── admin/                # Manager POS & floor management
│   │   ├── kitchen/              # Kitchen Display System (KDS)
│   │   ├── order/[orderId]/      # Customer live order tracking screen
│   │   ├── table/[tableId]/      # Direct table QR code landing routes
│   │   ├── globals.css           # Custom DROPOUT Cafe theme tokens
│   │   ├── layout.tsx            # Global providers & typography
│   │   └── page.tsx              # Customer-facing menu homepage
│   ├── components/
│   │   ├── admin/                # TableGrid, QRGeneratorDialog
│   │   ├── checkout/             # CheckoutModal (PhonePe / Pay-at-counter)
│   │   ├── common/               # Navbar, TableSelectorModal
│   │   ├── kitchen/              # OrderTicketCard (KDS)
│   │   ├── menu/                 # MenuItemCard, MenuItemModal, CartDrawer
│   │   └── ui/                   # Button, Card, Dialog, Badge, DietBadge, etc.
│   ├── lib/
│   │   ├── data/                 # Mock menu & cafe details
│   │   ├── store/                # RestaurantContext & local reactive store
│   │   ├── supabase/             # Client, Server, and schema.sql
│   │   └── utils.ts              # Currency formatter (₹), table normalizer
│   └── types/
│       └── index.ts              # TypeScript domain interfaces
├── .env.example                  # Environment configuration template
├── components.json               # shadcn/ui configuration
├── PROJECT_PLAN.md               # Architecture, decisions, and milestones
└── README.md                     # Documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm or pnpm

### 2. Installation

Clone and install dependencies:
```bash
git clone <repository-url>
cd dropout-pos
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Supabase credentials when ready:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database & Storage Setup (Supabase)

The project includes an enterprise-grade Supabase architecture with 11 relational tables, Row Level Security (RLS), Realtime publications, and Supabase Storage.

#### 11 Core Database Tables:
1. `profiles`: Staff profiles linked to Supabase Auth (`uuid`, role-based).
2. `cafe_settings`: Global cafe configuration, GST rate (5%), currency, and UPI settings.
3. `restaurant_tables`: Fixed 10 tables (`Table 01` to `Table 10`) with QR slugs and status tracking (`available`, `occupied`, `needs_attention`).
4. `menu_categories`: 18 menu categories with slugs and display ordering.
5. `menu_items`: Food items with `price_paise` (integer paise, e.g. ₹69 = `6900` paise), diet indicators (`veg`, `non-veg`, `egg`), image URLs, and stock availability.
6. `menu_variants`: Portion and size variations (e.g. Small / Large, Single / Double Shot).
7. `menu_addons`: Item or category-specific add-ons (Extra Cheese, Dips).
8. `orders`: High-integrity orders with `subtotal_paise`, `tax_paise`, and `total_paise`.
9. `order_items`: Line items with chosen add-ons and special chef instructions.
10. `payments`: UPI transaction logging and counter register receipts with paise precision.
11. `staff_roles`: Fine-grained permission assignments (`admin`, `manager`, `chef`, `waiter`, `cashier`).

#### Migration Execution:
Run the SQL migration using either the Supabase CLI or the Supabase Web Dashboard:

**Option A: Supabase Web Dashboard**
1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Copy and run the entire contents of [`supabase/migrations/20261117000000_initial_schema.sql`](supabase/migrations/20261117000000_initial_schema.sql) (or [`src/lib/supabase/schema.sql`](src/lib/supabase/schema.sql)).
4. This will:
   - Create all 11 tables with foreign keys and cascade rules.
   - Attach automatic `updated_at` timestamp triggers.
   - Create performance indexes on order status, table numbers, and payment references.
   - Enforce Row Level Security (RLS) on every table.
   - Create the `menu-images` Storage bucket for food photography uploads.
   - Enable Supabase Realtime for `orders`, `order_items`, `restaurant_tables`, and `menu_items`.
   - Seed the initial 10 tables, cafe settings, 18 categories, and full menu items in integer paise.

**Option B: Supabase CLI**
```bash
npx supabase db push
```

#### Storage Configuration:
The `menu-images` bucket is pre-configured by the migration for public read access and staff uploads (max 5MB, JPEG/PNG/WebP/AVIF). Admin menu management includes direct image upload to this bucket.

#### Security & Server-Side Order API:
- `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side code (`src/lib/supabase/admin.ts`, API routes) and is **never** bundled or exposed to frontend code.
- Orders can **only** be placed via the server-side validated API route (`POST /api/orders`), which validates table numbers against `Table 01`–`Table 10`, re-fetches canonical prices in integer paise from the database, and calculates 5% GST on the server to prevent client-side tampering.

### 5. Running Locally

Start the local development server:
```bash
npm run dev
```

Open your browser to:
- **Customer Menu**: [http://localhost:3000](http://localhost:3000)
- **Table 04 QR View**: [http://localhost:3000/table/04](http://localhost:3000/table/04)
- **Kitchen Display System**: [http://localhost:3000/kitchen](http://localhost:3000/kitchen)
- **Manager Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 6. Production Build Verification

```bash
npm run build
npm run start
```

---

## 💳 PhonePe UPI Payment Integration (via UPIPay)

DROPOUT Cafe & Restro features an enterprise-grade, server-side PhonePe UPI integration powered by the [`upipay`](https://github.com/iamrobinsharaya/upipay) SDK.

### 1. Architecture & Security
- **Strict Server-Side Isolation**: All PhonePe API calls, checksum hashing, and merchant secrets (`PHONEPE_SALT_KEY`) are kept exclusively on the server. Zero exposure in client-side code or `NEXT_PUBLIC_*` variables.
- **Integer Paise Precision**: All transactions, subtotals, GST calculations, and payment gateway payloads are strictly represented as 64-bit integer paise (e.g. ₹125.00 = `12500` paise). Float arithmetic is forbidden.
- **Unique Collision-Free Transaction IDs**: Every payment attempt generates an atomic ID: `MT_<timestamp>_<randomHex>` (e.g., `MT_1763371900000_A1B2C3D4`).
- **Cryptographic Signature Verification**:
  - Outbound Pay request: `SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex`
  - S2S Webhook callback: Raw request buffer verified against PhonePe's `x-verify` header using `client.verifyWebhook(rawBody, signature)`.
  - Independent Secondary Status Check: When a webhook or manual verification fires, the server calls PhonePe's `/pg/v1/status/{merchantId}/{merchantTransactionId}` and validates `expectedAmount` in paise to prevent amount-substitution attacks.
- **Idempotency & Replay Protection**:
  - `settle_phonepe_payment` PostgreSQL stored procedure guarantees that duplicate webhook deliveries or race conditions are no-ops.
  - If a transaction was already settled as `PAID`, subsequent webhook notifications are safely acknowledged without duplicate credits.
- **Strict Separation of Counter Payments**: "Pay at Counter" orders are never touched or auto-marked paid by the payment gateway. They can only be marked paid by authorized staff at the counter register (`/admin/payments`).

### 2. Customer Payment Flows
When an order is placed with UPI:
1. **Dynamic NPCI QR Code**: Instant scan-to-pay QR displayed directly on the customer's phone or tablet screen (generated with fixed amount and order note via `generateUPIQR`).
2. **UPI App Deep Links**: 1-click direct app launch buttons for **PhonePe**, **Google Pay**, and **Paytm** via `buildIntentLinks`.
3. **PhonePe Hosted Gateway**: One-click fallback button redirecting to PhonePe's official hosted checkout page.
4. **Live Status Polling**: The order confirmation page automatically queries `/api/payments/verify` every 5 seconds until confirmed, updating the order to `PAID` and transitioning the UI to live kitchen preparation tracking.

### 3. Merchant Onboarding & Zero-Commission Setup

To switch from the default sandbox (`PGTESTPAYUAT`) to live cafe operations:

1. **Sign Up on PhonePe Business**:
   - Register at [https://business.phonepe.com](https://business.phonepe.com).
   - Complete KYC with PAN, Aadhaar, Cafe FSSAI License, and GST Certificate (if applicable).
   - Link the cafe's Current Bank Account for daily T+1 automated settlement.
2. **Apply for PhonePe Payment Gateway (PG)**:
   - Request integration keys for "Web / Mobile Web PG (Standard Checkout)".
   - You will receive:
     - `PHONEPE_MERCHANT_ID` (Live Merchant ID, e.g., `M22XXXXXXXXX`)
     - `PHONEPE_SALT_KEY` (Live Secret Key)
     - `PHONEPE_SALT_INDEX` (Key Index, typically `1`)
3. **Zero MDR (0% Commission)**:
   - In accordance with Government of India regulations (Finance Act), **0% Merchant Discount Rate (MDR)** applies to all standard UPI person-to-merchant (P2M) payments.
   - DROPOUT Cafe receives 100% of customer order amounts directly into its bank account with zero platform fees on standard UPI transactions.
4. **Configure Webhook in PhonePe Dashboard**:
   - Set the S2S Webhook URL to: `https://your-domain.com/api/payments/webhook`
   - Method: `POST`

---

## 📜 License
Private and confidential. Built for **DROPOUT Cafe & Restro**.
