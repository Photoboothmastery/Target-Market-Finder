import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, reason } = await req.json();
  if (!email || typeof email !== "string") return NextResponse.json({ error: "email required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("access_blocks").upsert({
    email: email.toLowerCase(),
    reason: typeof reason === "string" ? reason.slice(0, 300) : null,
    blocked_by: admin,
    blocked_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
