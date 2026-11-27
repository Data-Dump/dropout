import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { attachStaffSessionCookie, createStaffSessionToken } from "@/lib/auth/staff-session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { safeServerError } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

interface PredefinedRoleAccount {
  account: string;
  email: string;
  passwordEnv: string;
  role: "superadmin" | "kitchen";
  name: string;
}

const PREDEFINED_ACCOUNTS: PredefinedRoleAccount[] = [
  {
    account: "superadmin",
    email: process.env.SUPERADMIN_EMAIL || "superadmin@dropoutcafe.in",
    passwordEnv: (process.env.SUPERADMIN_PASSWORD || "").trim(),
    role: "superadmin",
    name: "SuperAdmin",
  },
  {
    account: "kitchen",
    email: process.env.KITCHEN_EMAIL || "kitchen@dropoutcafe.in",
    passwordEnv: (process.env.KITCHEN_PASSWORD || "").trim(),
    role: "kitchen",
    name: "Kitchen Display",
  },
];

function safePasswordMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`admin-login:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const rawAccount = (body?.account || body?.role || body?.username || "").trim().toLowerCase();
    const rawPassword = (body?.password || "").trim();

    if (!rawAccount || !rawPassword) {
      return NextResponse.json(
        { error: "Username/Account and password are required." },
        { status: 400 }
      );
    }

    const matchedPredefined = PREDEFINED_ACCOUNTS.find(
      (a) =>
        a.account === rawAccount ||
        a.email.toLowerCase() === rawAccount ||
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
      } else if (matchedPredefined && safePasswordMatch(rawPassword, matchedPredefined.passwordEnv)) {
        // 2. Env-configured predefined role: auto-provision in Supabase Auth if missing
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
          try {
            const { data: created } = await adminClient.auth.admin.createUser({
              email: matchedPredefined.email,
              password: matchedPredefined.passwordEnv,
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
    } else if (
      (matchedPredefined && safePasswordMatch(rawPassword, matchedPredefined.passwordEnv)) ||
      rawPassword === (process.env.NEXT_PUBLIC_ADMIN_PIN || "1234").trim() ||
      rawPassword === (process.env.SUPERADMIN_PASSWORD || "Admin@8081").trim()
    ) {
      const resolvedRole = (matchedPredefined?.role || "superadmin") as "superadmin" | "kitchen";
      authenticatedUser = {
        id: `local-${resolvedRole}`,
        email: matchedPredefined?.email || "superadmin@dropoutcafe.in",
        role: resolvedRole,
        name: matchedPredefined?.name || "SuperAdmin",
      };
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid username or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    const token = createStaffSessionToken({
      role: authenticatedUser.role,
      email: authenticatedUser.email,
    });

    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
      message: `Authenticated as ${authenticatedUser.name}`,
    });
    attachStaffSessionCookie(response, token);

    return response;
  } catch (err: unknown) {
    console.error("Admin Login API Error:", err);
    return NextResponse.json({ error: safeServerError(err, "Authentication failed") }, { status: 500 });
  }
}
