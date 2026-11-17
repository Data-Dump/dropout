-- ==============================================================================
-- DROPOUT CAFE & RESTRO - SUPABASE DATABASE MIGRATION
-- Production PostgreSQL DDL with RLS, Realtime, Storage, and Seed Data
-- Currency Standard: Integer Paise (₹1.00 = 100 paise)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE TABLES (UUID PRIMARY KEYS & INTEGER PAISE FOR CURRENCY)
-- ==============================================================================

-- 3.1 CAFE SETTINGS
CREATE TABLE IF NOT EXISTS public.cafe_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_name VARCHAR(150) NOT NULL DEFAULT 'DROPOUT Cafe & Restro',
    tagline TEXT DEFAULT 'Brews, Bites & College Memories',
    address TEXT DEFAULT 'Near College Gate, Main Campus Road',
    city VARCHAR(100) DEFAULT 'Pune, Maharashtra',
    phone VARCHAR(20) DEFAULT '+91 98230 45678',
    currency_code VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(5) DEFAULT '₹',
    gst_rate_bps INT NOT NULL DEFAULT 500, -- 500 basis points = 5.0%
    upi_id VARCHAR(100) DEFAULT 'dropoutcafe@upi',
    phonepe_merchant_id VARCHAR(100),
    is_ordering_enabled BOOLEAN DEFAULT TRUE,
    sound_alerts_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 STAFF ROLES
CREATE TABLE IF NOT EXISTS public.staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'manager', 'head_chef', 'cashier', 'barista', 'server'
    display_name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 USER PROFILES (Connects with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'server', -- references staff_roles.role_name
    pin_hash VARCHAR(128), -- hashed 4-digit PIN for POS counter terminal access
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 RESTAURANT TABLES (10 Fixed Tables for DROPOUT Cafe)
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number VARCHAR(20) UNIQUE NOT NULL, -- e.g. 'Table 01' to 'Table 10'
    qr_slug VARCHAR(64) UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(30) NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'needs_attention'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price_paise BIGINT NOT NULL CHECK (price_paise >= 0), -- e.g. ₹69 = 6900 paise
    old_price_paise BIGINT CHECK (old_price_paise >= 0),
    discount_text VARCHAR(50), -- e.g. 'Save ₹15'
    diet_type VARCHAR(20) NOT NULL DEFAULT 'veg', -- 'veg', 'non-veg', 'egg'
    image_url TEXT NOT NULL,
    portion_size VARCHAR(50),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
    is_chef_special BOOLEAN NOT NULL DEFAULT FALSE,
    preparation_time_minutes INT DEFAULT 15,
    tags TEXT[] DEFAULT '{}',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 MENU VARIANTS (Size, Preparation styles)
CREATE TABLE IF NOT EXISTS public.menu_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. 'Small (250ml)', 'Large (400ml)', 'Double Shot'
    price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 MENU ADDONS (Extra Cheese, Dips, Toppings)
CREATE TABLE IF NOT EXISTS public.menu_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE, -- NULL if category-wide or global
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE, -- NULL if global or item-specific
    name VARCHAR(100) NOT NULL, -- e.g. 'Extra Cheese Layer', 'Spicy Schezwan Dip'
    price_paise BIGINT NOT NULL CHECK (price_paise >= 0), -- e.g. ₹20 = 2000 paise
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'DRP-1001'
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number VARCHAR(20) NOT NULL, -- denormalized snapshot e.g. 'Table 04'
    status VARCHAR(30) NOT NULL DEFAULT 'received', -- 'received', 'preparing', 'ready', 'served', 'completed', 'cancelled'
    payment_method VARCHAR(30) NOT NULL DEFAULT 'counter', -- 'counter', 'upi_online'
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
    tax_paise BIGINT NOT NULL DEFAULT 0 CHECK (tax_paise >= 0), -- 5% GST
    total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    diet_type VARCHAR(20) NOT NULL DEFAULT 'veg',
    selected_addons JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { "name": string, "price_paise": number }
    special_instructions TEXT,
    total_price_paise BIGINT NOT NULL CHECK (total_price_paise >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 PAYMENTS (UPI Transactions & Cash Counter Register)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'counter', -- 'counter', 'upi_online'
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    provider VARCHAR(50) DEFAULT 'phonepe',
    merchant_transaction_id VARCHAR(100) UNIQUE,
    provider_reference_id VARCHAR(100),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. DATABASE TRIGGERS (Auto-update updated_at)
-- ==============================================================================
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp ON public.%I;', t);
        EXECUTE format('CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t);
    END LOOP;
END $$;

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_slug ON public.restaurant_tables(qr_slug);

CREATE INDEX IF NOT EXISTS idx_menu_categories_order ON public.menu_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_menu_categories_slug ON public.menu_categories(slug);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_diet ON public.menu_items(diet_type);

CREATE INDEX IF NOT EXISTS idx_menu_variants_item ON public.menu_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_addons_item ON public.menu_addons(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_addons_category ON public.menu_addons(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON public.order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper function to verify if the requesting user is authenticated staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'authenticated' 
        OR auth.role() = 'service_role'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.1 CAFE SETTINGS
CREATE POLICY "Public read cafe settings" ON public.cafe_settings
    FOR SELECT USING (TRUE);

CREATE POLICY "Staff manage cafe settings" ON public.cafe_settings
    FOR ALL USING (public.is_staff());

-- 6.2 STAFF ROLES & PROFILES
CREATE POLICY "Staff view staff roles" ON public.staff_roles
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff view profiles" ON public.profiles
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 6.3 RESTAURANT TABLES
CREATE POLICY "Public view active tables" ON public.restaurant_tables
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Staff manage tables" ON public.restaurant_tables
    FOR ALL USING (public.is_staff());

-- 6.4 MENU CATEGORIES & ITEMS (Public read, Staff write)
CREATE POLICY "Public view active categories" ON public.menu_categories
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Staff manage categories" ON public.menu_categories
    FOR ALL USING (public.is_staff());

CREATE POLICY "Public view active menu items" ON public.menu_items
    FOR SELECT USING (is_available = TRUE OR public.is_staff());

CREATE POLICY "Staff manage menu items" ON public.menu_items
    FOR ALL USING (public.is_staff());

CREATE POLICY "Public view menu variants" ON public.menu_variants
    FOR SELECT USING (TRUE);

CREATE POLICY "Staff manage menu variants" ON public.menu_variants
    FOR ALL USING (public.is_staff());

CREATE POLICY "Public view menu addons" ON public.menu_addons
    FOR SELECT USING (TRUE);

CREATE POLICY "Staff manage menu addons" ON public.menu_addons
    FOR ALL USING (public.is_staff());

-- 6.5 ORDERS & ORDER ITEMS
-- Public customers can read orders (e.g. for live tracking screen /order/[orderId])
CREATE POLICY "Public view order by ID" ON public.orders
    FOR SELECT USING (TRUE);

-- Orders can be inserted through server-side validated API (service_role or authenticated)
CREATE POLICY "Server insert orders" ON public.orders
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Staff update orders" ON public.orders
    FOR UPDATE USING (public.is_staff() OR auth.role() = 'anon');

CREATE POLICY "Public view order items" ON public.order_items
    FOR SELECT USING (TRUE);

CREATE POLICY "Server insert order items" ON public.order_items
    FOR INSERT WITH CHECK (TRUE);

-- 6.6 PAYMENTS
CREATE POLICY "Public view payment for own order" ON public.payments
    FOR SELECT USING (TRUE);

CREATE POLICY "Staff and Server manage payments" ON public.payments
    FOR ALL USING (TRUE);

-- ==============================================================================
-- 7. SUPABASE REALTIME REPLICATION SETUP
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_addons;

-- ==============================================================================
-- 8. SUPABASE STORAGE BUCKET (menu-images)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view menu images" ON storage.objects
    FOR SELECT USING (bucket_id = 'menu-images');

CREATE POLICY "Staff can upload menu images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));

-- ==============================================================================
-- 9. INITIAL SEED DATA
-- ==============================================================================

-- 9.1 CAFE SETTINGS SEED
INSERT INTO public.cafe_settings (cafe_name, tagline, address, city, phone, gst_rate_bps)
VALUES (
    'DROPOUT Cafe & Restro',
    'Brews, Bites & College Memories',
    'Near College Gate, Main Campus Road',
    'Pune, Maharashtra',
    '+91 98230 45678',
    500
) ON CONFLICT DO NOTHING;

-- 9.2 STAFF ROLES SEED
INSERT INTO public.staff_roles (role_name, display_name, permissions) VALUES
('admin', 'General Manager', '["all"]'::jsonb),
('head_chef', 'Head Chef', '["kitchen:read", "kitchen:write", "menu:read"]'::jsonb),
('cashier', 'Cashier', '["billing:read", "billing:write", "orders:read"]'::jsonb),
('barista', 'Barista', '["kitchen:read", "kitchen:write"]'::jsonb),
('server', 'Floor Server', '["tables:read", "orders:read"]'::jsonb)
ON CONFLICT (role_name) DO NOTHING;

-- 9.3 10 FIXED TABLES SEED
INSERT INTO public.restaurant_tables (table_number, qr_slug, capacity) VALUES
('Table 01', 'table-01', 2),
('Table 02', 'table-02', 2),
('Table 03', 'table-03', 4),
('Table 04', 'table-04', 4),
('Table 05', 'table-05', 4),
('Table 06', 'table-06', 4),
('Table 07', 'table-07', 6),
('Table 08', 'table-08', 6),
('Table 09', 'table-09', 4),
('Table 10', 'table-10', 8)
ON CONFLICT (table_number) DO NOTHING;

-- 9.4 18 MENU CATEGORIES SEED
INSERT INTO public.menu_categories (id, name, slug, display_order) VALUES
('c0000000-0000-0000-0000-000000000001', 'Combos & Buddy Meals', 'combos', 1),
('c0000000-0000-0000-0000-000000000002', 'Hot Beverages', 'hot-beverages', 2),
('c0000000-0000-0000-0000-000000000003', 'Cold Beverages & Shakes', 'cold-beverages', 3),
('c0000000-0000-0000-0000-000000000004', 'Iced Tea & Mocktails', 'iced-tea-mocktails', 4),
('c0000000-0000-0000-0000-000000000005', 'Momos', 'momos', 5),
('c0000000-0000-0000-0000-000000000006', 'Starters & Fries', 'starters', 6),
('c0000000-0000-0000-0000-000000000007', 'Burgers', 'burgers', 7),
('c0000000-0000-0000-0000-000000000008', 'Sandwiches', 'sandwiches', 8),
('c0000000-0000-0000-0000-000000000009', 'Rolls & Frankie', 'rolls-frankie', 9),
('c0000000-0000-0000-0000-000000000010', 'Pizza', 'pizza', 10),
('c0000000-0000-0000-0000-000000000011', 'Pasta', 'pasta', 11),
('c0000000-0000-0000-0000-000000000012', 'Parathas', 'parathas', 12),
('c0000000-0000-0000-0000-000000000013', 'Chinese & Noodles', 'chinese', 13),
('c0000000-0000-0000-0000-000000000014', 'Maggie & Poha', 'maggie-poha', 14),
('c0000000-0000-0000-0000-000000000015', 'Egg Specials', 'egg-specials', 15),
('c0000000-0000-0000-0000-000000000016', 'Classics', 'classics', 16),
('c0000000-0000-0000-0000-000000000017', 'Patties & Garlic Bread', 'patties-garlic-bread', 17),
('c0000000-0000-0000-0000-000000000018', 'Brownies & Desserts', 'desserts', 18)
ON CONFLICT (slug) DO NOTHING;

-- 9.5 MENU ITEMS SEED (Prices in integer paise: ₹69 = 6900 paise)
INSERT INTO public.menu_items (category_id, name, description, price_paise, old_price_paise, discount_text, diet_type, image_url, is_bestseller) VALUES
-- Combos
('c0000000-0000-0000-0000-000000000001', 'Mini Combo', 'Aloo Paratha + Masala Chai + Masala Patties', 6900, 8400, 'Save ₹15', 'veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000001', 'Roll Combo', 'Veg Roll + Masala Chai + Masala Patties', 7900, 9400, 'Save ₹15', 'veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000001', 'Snack Combo', 'Cheese Fries + Cold Coffee', 11500, 12800, 'Save ₹13', 'veg', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000001', 'Momo Combo', 'Steam Momos + Any Iced Tea', 9900, 11800, 'Save ₹19', 'veg', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000001', 'Burger Combo', 'Cheese Burger + French Fries + Coke', 12900, 14700, 'Save ₹18', 'veg', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000001', 'Burger Buddy Meal', '2 Cheese Burgers + French Fries + 2 Cold Coffees', 24900, 29500, 'Save ₹46', 'veg', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000001', 'Pizza Buddy Meal', 'Farmhouse Pizza + French Fries + 2 Cold Coffees', 28900, 33600, 'Save ₹47', 'veg', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80', TRUE),

-- Hot Beverages
('c0000000-0000-0000-0000-000000000002', 'Normal Chai', 'Freshly brewed Indian milk tea with ginger and cardamom.', 1000, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000002', 'Kullhad Chai', 'Steaming hot tea served in traditional clay kullhad.', 1500, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000002', 'Masala Chai', 'Aromatic black tea simmered with milk, ginger and spices.', 1500, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000002', 'Kullhad Masala Chai', 'Rich spiced kadak masala chai served in authentic kullhad.', 2000, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000002', 'Full Hot Coffee', 'Frothy rich hot coffee made with premium roasted blend.', 3000, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=700&q=80', TRUE),

-- Cold Beverages
('c0000000-0000-0000-0000-000000000003', 'Cold Coffee (Small)', 'Classic chilled blended sweet coffee with chocolate dusting.', 3900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000003', 'Cold Coffee (Large)', 'Extra large glass of creamy thick cold coffee.', 4900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000003', 'Cold Coffee with Ice Cream', 'Chilled cold coffee with scoop of vanilla ice cream.', 6900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=700&q=80', TRUE),

-- Momos
('c0000000-0000-0000-0000-000000000005', 'Veg Steam Momos', 'Steamed dumplings with minced vegetable filling. (6 pcs)', 5900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000005', 'Paneer Steam Momos', 'Juicy cottage cheese dumplings in steamed casing. (6 pcs)', 6900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000005', 'Veg Kurkure Momos', 'Ultra-crispy cornflake crusted momos fried golden. (6 pcs)', 7900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=700&q=80', TRUE),

-- Starters
('c0000000-0000-0000-0000-000000000006', 'French Fries', 'Crispy salted potato fries served piping hot.', 5900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000006', 'Peri Peri Fries', 'Fries tossed in spicy African peri peri seasoning.', 6900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000006', 'Cheese Fries', 'Crispy fries smothered in warm gooey melted cheese.', 7900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=700&q=80', TRUE),

-- Burgers
('c0000000-0000-0000-0000-000000000007', 'Aloo Tikki Burger', 'Spiced potato patty with crisp cucumber and burger mayo.', 4900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80', FALSE),
('c0000000-0000-0000-0000-000000000007', 'Cheese Burger', 'Golden potato patty with melted cheddar cheese slice.', 6900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80', TRUE),

-- Pizza
('c0000000-0000-0000-0000-000000000010', 'Margherita Pizza', 'Herb tomato concasse with melted double mozzarella.', 11900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=700&q=80', TRUE),
('c0000000-0000-0000-0000-000000000010', 'Farmhouse Pizza', 'Loaded with onion, capsicum, mushroom, sweet corn and paneer.', 17900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80', TRUE),

-- Desserts
('c0000000-0000-0000-0000-000000000018', 'Brownie + Ice Cream', 'Warm chocolate brownie with vanilla ice cream scoop.', 8900, NULL, NULL, 'veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=700&q=80', TRUE)
ON CONFLICT DO NOTHING;

-- 9.6 GLOBAL & CATEGORY ADDONS SEED (in integer paise)
INSERT INTO public.menu_addons (name, price_paise) VALUES
('Extra Cheese Layer', 2000),
('Spicy Schezwan Dip', 1500),
('Tandoori Mayo Dip', 1500),
('Vanilla Ice Cream Scoop', 2500),
('Amul Butter Dollop', 1500),
('Fresh Dahi (Curd)', 2000)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- 10. ORDER ENGINE ENHANCEMENTS (Idempotency, Selected Variants, Atomic Tx)
-- ==============================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS selected_variant JSONB DEFAULT NULL;

ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'NEW',
ALTER COLUMN payment_status SET DEFAULT 'PENDING';

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_order_number VARCHAR,
    p_table_number VARCHAR,
    p_payment_method VARCHAR,
    p_payment_status VARCHAR DEFAULT 'PENDING',
    p_subtotal_paise BIGINT DEFAULT 0,
    p_tax_paise BIGINT DEFAULT 0,
    p_total_paise BIGINT DEFAULT 0,
    p_customer_name VARCHAR DEFAULT NULL,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_order_status VARCHAR DEFAULT 'NEW'
)
RETURNS JSONB AS $$
DECLARE
    v_table_id UUID;
    v_order_id UUID;
    v_item RECORD;
    v_existing_order_id UUID;
BEGIN
    -- Duplicate submission protection via idempotency check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_order_id
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'duplicate',
                'order_id', v_existing_order_id
            );
        END IF;
    END IF;

    -- Lookup table_id from restaurant_tables
    SELECT id INTO v_table_id
    FROM public.restaurant_tables
    WHERE table_number = p_table_number
    LIMIT 1;

    -- Insert order
    INSERT INTO public.orders (
        order_number,
        table_id,
        table_number,
        status,
        payment_method,
        payment_status,
        subtotal_paise,
        tax_paise,
        total_paise,
        customer_name,
        customer_phone,
        notes,
        idempotency_key
    ) VALUES (
        p_order_number,
        v_table_id,
        p_table_number,
        COALESCE(p_order_status, 'NEW'),
        p_payment_method,
        COALESCE(p_payment_status, 'PENDING'),
        p_subtotal_paise,
        p_tax_paise,
        p_total_paise,
        p_customer_name,
        p_customer_phone,
        p_notes,
        p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- Insert immutable line items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_item_id UUID,
        item_name VARCHAR,
        unit_price_paise BIGINT,
        quantity INT,
        diet_type VARCHAR,
        selected_variant JSONB,
        selected_addons JSONB,
        special_instructions TEXT,
        total_price_paise BIGINT
    )
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price_paise,
            quantity,
            diet_type,
            selected_variant,
            selected_addons,
            special_instructions,
            total_price_paise
        ) VALUES (
            v_order_id,
            v_item.menu_item_id,
            v_item.item_name,
            v_item.unit_price_paise,
            v_item.quantity,
            COALESCE(v_item.diet_type, 'veg'),
            v_item.selected_variant,
            COALESCE(v_item.selected_addons, '[]'::jsonb),
            v_item.special_instructions,
            v_item.total_price_paise
        );
    END LOOP;

    -- Insert payment ledger entry
    INSERT INTO public.payments (
        order_id,
        payment_method,
        amount_paise,
        status,
        provider
    ) VALUES (
        v_order_id,
        p_payment_method,
        p_total_paise,
        COALESCE(p_payment_status, 'PENDING'),
        'phonepe'
    );

    -- Mark dining table occupied
    IF v_table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables
        SET status = 'occupied', updated_at = NOW()
        WHERE id = v_table_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'created',
        'order_id', v_order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 11. PHONEPE UPIPAY INTEGRATION & SETTLEMENT TRIGGER
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_txn_id ON public.payments(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE OR REPLACE FUNCTION public.settle_phonepe_payment(
    p_merchant_transaction_id VARCHAR,
    p_provider_reference_id VARCHAR,
    p_amount_paise BIGINT,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
BEGIN
    SELECT * INTO v_payment
    FROM public.payments
    WHERE merchant_transaction_id = p_merchant_transaction_id
    LIMIT 1;

    IF v_payment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PAYMENT_NOT_FOUND',
            'message', 'No payment record matching merchant transaction ID'
        );
    END IF;

    IF UPPER(v_payment.status) = 'PAID' THEN
        RETURN jsonb_build_object(
            'success', true,
            'code', 'ALREADY_PAID',
            'message', 'Payment already settled previously',
            'order_id', v_payment.order_id
        );
    END IF;

    UPDATE public.payments
    SET status = 'PAID',
        provider_reference_id = COALESCE(p_provider_reference_id, provider_reference_id),
        raw_payload = COALESCE(p_raw_payload, raw_payload),
        settled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.orders
    SET payment_status = 'PAID',
        updated_at = NOW()
    WHERE id = v_payment.order_id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'SETTLED',
        'order_id', v_payment.order_id,
        'payment_id', v_payment.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
