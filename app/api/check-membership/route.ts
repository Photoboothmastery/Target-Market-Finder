import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkAccess, getUserFromRequest } from "@/lib/access";

// Called by MembershipGate on every protected page. Identity comes from the
// verified session token, not from anything the browser claims.
// ?log=1 (sent once per browser session) also records a row in login_events.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ active: false, reason: "signed_out" }, { status: 401 });
  }

  const { allowed, reason } = await checkAccess(user.email);

  if (req.nextUrl.searchParams.get("log") === "1") {
    await supabaseAdmin.from("login_events").insert({
      user_id: user.id,
      email: user.email,
      allowed,
      reason,
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
  }

  return NextResponse.json({ active: allowed, reason });
}
