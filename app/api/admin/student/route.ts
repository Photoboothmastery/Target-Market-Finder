import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Read-only view of one student's data, so support sees what they see.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const email = req.nextUrl.searchParams.get("email")?.toLowerCase();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  let userId: string | null = null;
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) userId = hit.id;
    if (!data || data.users.length < 200) break;
  }
  if (!userId) return NextResponse.json({ events: [], profiles: [], note: "No account yet." });

  const [{ data: events }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("events").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("target_market_profiles").select("*").eq("user_id", userId),
  ]);
  return NextResponse.json({ events: events ?? [], profiles: profiles ?? [] });
}
