import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const email = req.nextUrl.searchParams.get("email")?.toLowerCase();
  let q = supabaseAdmin
    .from("login_events")
    .select("id,email,allowed,reason,user_agent,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (email) q = q.eq("email", email);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
