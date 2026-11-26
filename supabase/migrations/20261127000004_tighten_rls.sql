-- ==============================================================================
-- DROPOUT CAFE & RESTRO - Strict RLS Hardening Migration
-- Removes overly permissive `USING (TRUE)` and `anon` write policies on
-- orders, order_items, payments, and storage.objects.
-- Server-side API routes use SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
-- ==============================================================================

-- 1. ORDERS: Staff only via client; customers access single orders via /api/orders?orderId=...
DROP POLICY IF EXISTS "Public view order by ID" ON public.orders;
DROP POLICY IF EXISTS "Server insert orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;

CREATE POLICY "Staff select orders" ON public.orders
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff insert orders" ON public.orders
    FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff update orders" ON public.orders
    FOR UPDATE USING (public.is_staff());

CREATE POLICY "Staff delete orders" ON public.orders
    FOR DELETE USING (public.is_staff());

-- 2. ORDER ITEMS: Staff only via client; server API handles customer reads/inserts
DROP POLICY IF EXISTS "Public view order items" ON public.order_items;
DROP POLICY IF EXISTS "Server insert order items" ON public.order_items;

CREATE POLICY "Staff select order items" ON public.order_items
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff manage order items" ON public.order_items
    FOR ALL USING (public.is_staff());

-- 3. PAYMENTS: Staff only via client; server API & webhook handle payments
DROP POLICY IF EXISTS "Public view payment for own order" ON public.payments;
DROP POLICY IF EXISTS "Staff and Server manage payments" ON public.payments;

CREATE POLICY "Staff manage payments" ON public.payments
    FOR ALL USING (public.is_staff());

-- 4. STORAGE (menu-images): Authenticated staff only for uploads (no anon uploads)
DROP POLICY IF EXISTS "Staff can upload menu images" ON storage.objects;

CREATE POLICY "Staff can upload menu images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
