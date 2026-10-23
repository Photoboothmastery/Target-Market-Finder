import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await req.json();
  if (!email || typeof email !== "string") return NextResponse.json({ error: "email required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("access_blocks").delete().eq("email", email.toLowerCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
