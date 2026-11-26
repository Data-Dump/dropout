import { NextResponse } from "next/server";
import { clearStaffSessionCookie } from "@/lib/auth/staff-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearStaffSessionCookie(res);
  return res;
}
