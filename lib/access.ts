import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AccessReason = "active" | "blocked" | "no_membership" | "inactive";

/** Verifies the Supabase session token sent by the browser. Never trusts a client-supplied email. */
export async function getUserFromRequest(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export async function checkAccess(email: string): Promise<{ allowed: boolean; reason: AccessReason }> {
  const lower = email.toLowerCase();

  const { data: block } = await supabaseAdmin
    .from("access_blocks")
    .select("email")
    .eq("email", lower)
    .maybeSingle();
  if (block) return { allowed: false, reason: "blocked" };

  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("status")
    .eq("email", lower)
    .maybeSingle();
  if (!membership) return { allowed: false, reason: "no_membership" };
  if (membership.status !== "active") return { allowed: false, reason: "inactive" };
  return { allowed: true, reason: "active" };
}

export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** For admin routes: returns the admin's email, or null if not an admin. */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user.email;
}
