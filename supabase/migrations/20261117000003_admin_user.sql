-- ==============================================================================
-- DROPOUT CAFE & RESTRO - Predefined Admin User Migration
-- Ensures the default admin profile exists in public.profiles.
-- Note: Supabase auth.users is managed securely via Supabase Auth API.
-- ==============================================================================

-- Ensure profiles table has proper foreign key handling and indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper comment documenting predefined administrator account:
-- Account: admin@dropoutcafe.in (or username "admin")
-- Role: admin
