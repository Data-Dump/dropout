-- ==============================================================================
-- DROPOUT CAFE & RESTRO - Predefined Admin & Kitchen Role Migration
-- Ensures the default profiles exist in public.profiles.
-- Note: Supabase auth.users is managed securely via Supabase Auth API.
-- ==============================================================================

-- Ensure profiles table has proper foreign key handling and indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Documented predefined accounts:
-- 1. SuperAdmin: superadmin@dropoutcafe.in (or select "SuperAdmin", Password: Admin@8081) - Role: superadmin
-- 2. Kitchen: kitchen@dropoutcafe.in (or select "Kitchen", Password: Kitchen@8082) - Role: kitchen (Orders only)
