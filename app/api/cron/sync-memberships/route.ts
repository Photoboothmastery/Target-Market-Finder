import { NextRequest, NextResponse } from "next/server";
import { getEmailsWithOffer } from "@/lib/kajabi";
import { supabaseAdmin } from "@/lib/supabase/admin";

// New Thrive + SCALE offer IDs on the Photo Booth Mastery Kajabi site
// (pulled directly from Kajabi as of this build -- confirm periodically,
// since offers get added or retired over time).
const ALLOWED_OFFER_IDS = [
  "2151111655", // Photo Booth Mastery - The New Thrive
  "2151314626", // Hub - The New Thrive 2026 - Signature
  "2151332113", // Photo Booth Mastery - Thrive - Founding Members Rate
  "2150660407", // SCALE Monthly Payment Plan
  "2151009853", // SCALE - Pay in Full
];

export async function GET(req: NextRequest) {
  // Vercel automatically sends this header on cron-triggered requests when
  // CRON_SECRET is set as an env var -- this rejects any other caller.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Pull every email currently granted any allowed offer.
    const activeEmailSets = await Promise.all(
      ALLOWED_OFFER_IDS.map((offerId) => getEmailsWithOffer(offerId))
    );
    const activeEmails = new Set<string>();
    for (const set of activeEmailSets) {
      for (const email of set) activeEmails.add(email);
    }

    // 2. Mark everyone currently active in our table who is NOT in that set
    //    as inactive (covers cancellations/refunds/expirations).
    const { data: currentlyActive } = await supabaseAdmin
      .from("memberships")
      .select("email")
      .eq("status", "active");

    const toDeactivate = (currentlyActive ?? [])
      .map((row) => row.email)
      .filter((email) => !activeEmails.has(email));

    if (toDeactivate.length > 0) {
      await supabaseAdmin
        .from("memberships")
        .update({ status: "inactive", synced_at: new Date().toISOString() })
        .in("email", toDeactivate);
    }

    // 3. Upsert everyone currently active.
    const rows = [...activeEmails].map((email) => ({
      email,
      status: "active" as const,
      synced_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      await supabaseAdmin.from("memberships").upsert(rows, { onConflict: "email" });
    }

    return NextResponse.json({
      synced_at: new Date().toISOString(),
      active_count: activeEmails.size,
      deactivated_count: toDeactivate.length,
    });
  } catch (err) {
    console.error("Membership sync failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
