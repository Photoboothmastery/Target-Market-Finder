import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  return NextResponse.json({ admin: !!admin }, { status: admin ? 200 : 403 });
}
