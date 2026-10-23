import { supabaseAdmin } from "@/lib/supabase/admin";

/** Supabase returns at most 1000 rows per request; this pages through all of them. */
export async function fetchAll<T = Record<string, unknown>>(
  table: string,
  columns: string,
  orderBy?: { column: string; ascending: boolean }
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = supabaseAdmin.from(table).select(columns).range(from, from + size - 1);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending });
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}
