import { createClient } from "@supabase/supabase-js";

// Service-role client: server-side ONLY, never import this into a
// "use client" file or ship it to the browser. It bypasses row-level
// security, which is exactly why it's the only thing allowed to read
// the `memberships` table.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
