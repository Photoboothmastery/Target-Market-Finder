import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/fetchAll";

type Row = {
  email: string;
  kajabi_status: "active" | "inactive" | "none";
  blocked: boolean;
  blocked_reason: string | null;
  has_access: boolean;
  has_account: boolean;
  last_sign_in_at: string | null;
  last_app_visit: string | null;
  events_count: number;
  wedding_profile: "none" | "draft" | "final";
  corporate_profile: "none" | "draft" | "final";
};

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // All sign-up accounts (paged).
    const users: { id: string; email: string; last_sign_in_at: string | null }[] = [];
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        if (u.email) users.push({ id: u.id, email: u.email.toLowerCase(), last_sign_in_at: u.last_sign_in_at ?? null });
      }
      if (data.users.length < 200) break;
    }

    const [memberships, blocks, events, profiles, logins] = await Promise.all([
      fetchAll<{ email: string; status: string; synced_at: string }>("memberships", "email,status,synced_at"),
      fetchAll<{ email: string; reason: string | null }>("access_blocks", "email,reason"),
      fetchAll<{ user_id: string }>("events", "user_id"),
      fetchAll<{ user_id: string; segment: string; is_finalized: boolean }>(
        "target_market_profiles",
        "user_id,segment,is_finalized"
      ),
      fetchAll<{ email: string; created_at: string }>("login_events", "email,created_at", {
        column: "created_at",
        ascending: false,
      }),
    ]);

    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const eventCount = new Map<string, number>();
    for (const e of events) {
      const em = emailById.get(e.user_id);
      if (em) eventCount.set(em, (eventCount.get(em) ?? 0) + 1);
    }
    const profileState = new Map<string, "draft" | "final">();
    for (const p of profiles) {
      const em = emailById.get(p.user_id);
      if (em) profileState.set(`${em}:${p.segment}`, p.is_finalized ? "final" : "draft");
    }
    const lastVisit = new Map<string, string>();
    for (const l of logins) if (!lastVisit.has(l.email)) lastVisit.set(l.email, l.created_at); // newest first

    const memByEmail = new Map(memberships.map((m) => [m.email, m]));
    const blockByEmail = new Map(blocks.map((b) => [b.email, b]));
    const userByEmail = new Map(users.map((u) => [u.email, u]));

    const allEmails = new Set<string>([...memByEmail.keys(), ...blockByEmail.keys(), ...userByEmail.keys()]);

    const rows: Row[] = [...allEmails].map((email) => {
      const m = memByEmail.get(email);
      const b = blockByEmail.get(email);
      const u = userByEmail.get(email);
      const kajabi_status: Row["kajabi_status"] = m ? (m.status === "active" ? "active" : "inactive") : "none";
      return {
        email,
        kajabi_status,
        blocked: !!b,
        blocked_reason: b?.reason ?? null,
        has_access: kajabi_status === "active" && !b,
        has_account: !!u,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        last_app_visit: lastVisit.get(email) ?? null,
        events_count: eventCount.get(email) ?? 0,
        wedding_profile: profileState.get(`${email}:wedding`) ?? "none",
        corporate_profile: profileState.get(`${email}:corporate`) ?? "none",
      };
    });

    const lastSynced = memberships.reduce<string | null>(
      (max, m) => (!max || m.synced_at > max ? m.synced_at : max),
      null
    );

    return NextResponse.json({
      rows,
      sync: {
        last_synced_at: lastSynced,
        active_count: memberships.filter((m) => m.status === "active").length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
