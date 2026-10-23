"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/authFetch";

export default function Nav() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    authFetch("/api/admin/me").then((res) => setIsAdmin(res.ok)).catch(() => setIsAdmin(false));
  }, []);

  async function handleLogout() {
    sessionStorage.removeItem("login_logged");
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <nav>
      <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
        <img src="/pbm-icon.png" alt="Photo Booth Mastery" style={{ height: "2rem", width: "auto" }} />
      </Link>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/events/new">Log an event</Link>
      <Link href="/profile/wedding">Wedding profile</Link>
      <Link href="/profile/corporate">Corporate profile</Link>
      {isAdmin && <Link href="/admin">Admin</Link>}
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
