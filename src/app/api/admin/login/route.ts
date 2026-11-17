import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface PredefinedRoleAccount {
  account: string;
  email: string;
  passwordDefault: string;
  role: "superadmin" | "kitchen";
  name: string;
}

const PREDEFINED_ACCOUNTS: PredefinedRoleAccount[] = [
  {
    account: "superadmin",
    email: "superadmin@dropoutcafe.in",
    passwordDefault: process.env.SUPERADMIN_PASSWORD || "Admin@8081",
    role: "superadmin",
    name: "SuperAdmin",
  },
  {
    account: "kitchen",
    email: "kitchen@dropoutcafe.in",
    passwordDefault: process.env.KITCHEN_PASSWORD || "Kitchen@8082",
    role: "kitchen",
    name: "Kitchen Display",
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawAccount = (body?.account || body?.role || body?.username || "").trim().toLowerCase();
    const rawPassword = (body?.password || "").trim();

    if (!rawAccount || !rawPassword) {
      return NextResponse.json(
        { error: "Username/Account and password are required." },
        { status: 400 }
      );
    }

    // Match predefined account definition
    const matchedPredefined = PREDEFINED_ACCOUNTS.find(
      (a) =>
        a.account === rawAccount ||
        a.email === rawAccount ||
        (rawAccount === "admin" && a.role === "superadmin")
    );

    const email = matchedPredefined
      ? matchedPredefined.email
      : rawAccount.includes("@")
      ? rawAccount
      : `${rawAccount}@dropoutcafe.in`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let authenticatedUser: { id: string; email: string; role: "superadmin" | "kitchen"; name: string } | null = null;
    let authSession: unknown = null;

    if (supabaseUrl && anonKey) {
      const publicClient = createClient(supabaseUrl, anonKey);

      // 1. Attempt login with Supabase Auth
      const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
        email,
        password: rawPassword,
      });

      if (!signInError && signInData?.user) {
        const metaRole = (signInData.user.user_metadata?.role as string) || "";
        const resolvedRole: "superadmin" | "kitchen" =
          metaRole === "kitchen" || email.includes("kitchen") ? "kitchen" : "superadmin";

        authenticatedUser = {
          id: signInData.user.id,
          email: signInData.user.email || email,
          role: resolvedRole,
          name: (signInData.user.user_metadata?.name as string) || (resolvedRole === "kitchen" ? "Kitchen Staff" : "SuperAdmin"),
        };
        authSession = signInData.session;
      } else if (matchedPredefined && rawPassword === matchedPredefined.passwordDefault) {
        // 2. Predefined fallback: if user doesn't exist yet in Supabase Auth, auto-provision
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
          try {
            const { data: created } = await adminClient.auth.admin.createUser({
              email: matchedPredefined.email,
              password: matchedPredefined.passwordDefault,
              email_confirm: true,
              user_metadata: { role: matchedPredefined.role, name: matchedPredefined.name },
            });

            if (created?.user) {
              await adminClient.from("profiles").upsert({
                id: created.user.id,
                email: matchedPredefined.email,
                full_name: matchedPredefined.name,
                role: matchedPredefined.role,
                is_active: true,
              });

              authenticatedUser = {
                id: created.user.id,
                email: matchedPredefined.email,
                role: matchedPredefined.role,
                name: matchedPredefined.name,
              };
            }
          } catch (seedErr) {
            console.warn("Could not auto-seed role in Supabase:", seedErr);
          }
        }

        if (!authenticatedUser) {
          authenticatedUser = {
            id: `role-${matchedPredefined.role}`,
            email: matchedPredefined.email,
            role: matchedPredefined.role,
            name: matchedPredefined.name,
          };
        }
      }
    } else if (matchedPredefined && rawPassword === matchedPredefined.passwordDefault) {
      // Local/Offline fallback
      authenticatedUser = {
        id: `local-${matchedPredefined.role}`,
        email: matchedPredefined.email,
        role: matchedPredefined.role,
        name: matchedPredefined.name,
      };
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid username or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
      session: authSession,
      message: `Authenticated as ${authenticatedUser.name}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    console.error("Admin Login API Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
