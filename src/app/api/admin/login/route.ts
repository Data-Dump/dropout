import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PREDEFINED_ADMIN_EMAIL = (process.env.ADMIN_DEFAULT_EMAIL || "admin@dropoutcafe.in").toLowerCase().trim();
const PREDEFINED_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "Dropout@2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawAccount = (body?.account || "").trim();
    const rawPassword = (body?.password || "").trim();

    if (!rawAccount || !rawPassword) {
      return NextResponse.json(
        { error: "Account and password are required." },
        { status: 400 }
      );
    }

    // Normalize username to full email if no domain is provided
    const email = rawAccount.includes("@")
      ? rawAccount.toLowerCase()
      : `${rawAccount.toLowerCase()}@dropoutcafe.in`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let authenticatedUser: { id: string; email: string; role: string; name: string } | null = null;
    let authSession: unknown = null;

    if (supabaseUrl && anonKey) {
      const publicClient = createClient(supabaseUrl, anonKey);

      // 1. Attempt login with Supabase Auth
      const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
        email,
        password: rawPassword,
      });

      if (!signInError && signInData?.user) {
        authenticatedUser = {
          id: signInData.user.id,
          email: signInData.user.email || email,
          role: (signInData.user.user_metadata?.role as string) || "admin",
          name: (signInData.user.user_metadata?.name as string) || "DROPOUT Administrator",
        };
        authSession = signInData.session;
      } else {
        // 2. If user does not exist in Supabase yet, check against predefined credentials
        const matchesPredefinedEmail = email === PREDEFINED_ADMIN_EMAIL || rawAccount.toLowerCase() === "admin";
        const matchesPredefinedPassword = rawPassword === PREDEFINED_ADMIN_PASSWORD;

        if (matchesPredefinedEmail && matchesPredefinedPassword) {
          const adminClient = getSupabaseAdminClient();
          if (adminClient) {
            try {
              // Auto-seed predefined admin account in Supabase Auth
              const { data: created, error: createError } = await adminClient.auth.admin.createUser({
                email: PREDEFINED_ADMIN_EMAIL,
                password: PREDEFINED_ADMIN_PASSWORD,
                email_confirm: true,
                user_metadata: { role: "admin", name: "DROPOUT Administrator" },
              });

              if (!createError && created?.user) {
                // Also ensure profile row exists
                await adminClient.from("profiles").upsert({
                  id: created.user.id,
                  email: PREDEFINED_ADMIN_EMAIL,
                  full_name: "DROPOUT Administrator",
                  phone: "+91 96446 79988",
                  role: "admin",
                  is_active: true,
                });

                authenticatedUser = {
                  id: created.user.id,
                  email: PREDEFINED_ADMIN_EMAIL,
                  role: "admin",
                  name: "DROPOUT Administrator",
                };
              }
            } catch (seedErr) {
              console.warn("Could not auto-seed admin in Supabase:", seedErr);
            }
          }

          // Authorize as predefined administrator
          if (!authenticatedUser) {
            authenticatedUser = {
              id: "admin-predefined",
              email: PREDEFINED_ADMIN_EMAIL,
              role: "admin",
              name: "DROPOUT Administrator",
            };
          }
        }
      }
    } else {
      // Local / Offline fallback when Supabase keys are not set
      const matchesPredefinedEmail = email === PREDEFINED_ADMIN_EMAIL || rawAccount.toLowerCase() === "admin";
      const matchesPredefinedPassword = rawPassword === PREDEFINED_ADMIN_PASSWORD;

      if (matchesPredefinedEmail && matchesPredefinedPassword) {
        authenticatedUser = {
          id: "admin-local",
          email: PREDEFINED_ADMIN_EMAIL,
          role: "admin",
          name: "DROPOUT Administrator",
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid account or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
      session: authSession,
      message: "Admin authorization successful",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    console.error("Admin Login API Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
