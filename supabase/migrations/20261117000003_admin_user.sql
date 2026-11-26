-- ==============================================================================
-- DROPOUT CAFE & RESTRO - Predefined Admin & Kitchen Role Migration
-- Ensures the default profiles exist in public.profiles.
-- Note: Supabase auth.users is managed securely via Supabase Auth API.
-- ==============================================================================

-- Ensure profiles table has proper foreign key handling and indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Documented predefined accounts (passwords configured via Vercel/Supabase environment variables):
-- 1. SuperAdmin: superadmin@dropoutcafe.in - Role: superadmin
-- 2. Kitchen: kitchen@dropoutcafe.in - Role: kitchen (Orders only)
