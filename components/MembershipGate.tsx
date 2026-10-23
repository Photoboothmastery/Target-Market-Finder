"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/authFetch";

type GateState = "checking" | "allowed" | "denied" | "blocked";

export default function MembershipGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      // Log once per browser session, not on every page view.
      const alreadyLogged = sessionStorage.getItem("login_logged") === "1";
      const res = await authFetch(`/api/check-membership${alreadyLogged ? "" : "?log=1"}`);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!alreadyLogged) sessionStorage.setItem("login_logged", "1");

      const { active, reason } = await res.json();
      setState(active ? "allowed" : reason === "blocked" ? "blocked" : "denied");
    }
    check();
  }, [router]);

  async function handleLogout() {
    sessionStorage.removeItem("login_logged");
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (state === "checking") {
    return (
      <main>
        <p className="muted">Checking access…</p>
      </main>
    );
  }

  if (state === "denied" || state === "blocked") {
    return (
      <main>
        <h1>
          {state === "blocked"
            ? "Your access to this tool has been paused"
            : "This tool is for New Thrive and SCALE members"}
        </h1>
        <p className="muted">
          {state === "blocked"
            ? "Please reach out to the team and we'll sort it out."
            : "It looks like your account doesn't currently have access. If you believe this is a mistake, reach out to the team."}{" "}
          hello@photoboothmastery.com
        </p>
        <button className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
