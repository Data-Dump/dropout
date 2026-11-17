import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Supabase Admin Client powered by SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL SECURITY NOTICE:
 * This client bypasses Row Level Security (RLS) and possesses full administrative privileges.
 * It MUST NEVER be imported into or executed within client components or browser code.
 * Only call this inside Server Actions, Route Handlers (app/api/...), or Node-only server files.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ALERT: Attempted to initialize Supabase Admin Client in a browser/client context! " +
        "SUPABASE_SERVICE_ROLE_KEY must remain strictly server-side."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
