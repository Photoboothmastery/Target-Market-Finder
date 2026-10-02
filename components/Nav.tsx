"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Nav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav>
      <strong>Target Market Finder</strong>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/events/new">Log an event</Link>
      <Link href="/profile/wedding">Wedding profile</Link>
      <Link href="/profile/corporate">Corporate profile</Link>
      <button
        className="secondary"
        style={{ marginTop: 0, marginLeft: "auto" }}
        onClick={handleLogout}
      >
        Log out
      </button>
    </nav>
  );
}
