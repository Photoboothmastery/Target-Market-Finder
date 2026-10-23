"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/authFetch";
import Nav from "@/components/Nav";

type Member = {
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

type LoginRow = {
  id: string;
  email: string;
  allowed: boolean;
  reason: string;
  user_agent: string | null;
  created_at: string;
};

type Detail = {
  events: Record<string, unknown>[];
  profiles: Record<string, unknown>[];
  note?: string;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

function device(ua: string | null) {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Other";
  const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  return `${br} · ${os}`;
}

const REASON_LABEL: Record<string, string> = {
  active: "Let in",
  blocked: "Turned away: blocked",
  no_membership: "Turned away: not a member",
  inactive: "Turned away: membership ended",
};

function statusLabel(m: Member) {
  if (m.blocked) return "Blocked";
  if (m.has_access) return "Has access";
  return "No access";
}

const th: React.CSSProperties = { textAlign: "left", padding: "0.5rem", fontSize: "0.8rem", color: "var(--muted)", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "0.5rem", fontSize: "0.9rem", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const small: React.CSSProperties = { marginTop: 0, padding: "0.3rem 0.7rem", fontSize: "0.8rem" };

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"members" | "logins">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [sync, setSync] = useState<{ last_synced_at: string | null; active_count: number } | null>(null);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const res = await authFetch("/api/admin/members");
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Could not load members");
    setMembers(body.rows);
    setSync(body.sync);
  }, []);

  const loadLogins = useCallback(async () => {
    const res = await authFetch("/api/admin/logins");
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Could not load logins");
    setLogins(body.rows);
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      const res = await authFetch("/api/admin/me");
      if (!res.ok) return setAuthorized(false);
      setAuthorized(true);
      loadMembers();
      loadLogins();
    }
    init();
  }, [router, loadMembers, loadLogins]);

  async function toggleBlock(m: Member) {
    if (m.blocked) {
      if (!confirm(`Restore access for ${m.email}? They'll get back in as long as Kajabi shows an active membership.`)) return;
      await authFetch("/api/admin/unblock", { method: "POST", body: JSON.stringify({ email: m.email }) });
    } else {
      const reason = prompt(
        `Block ${m.email} from this app?\n\nThis only affects this app. Their Kajabi membership isn't changed, and the Kajabi sync won't undo it.\n\nReason (optional, for your team's notes):`
      );
      if (reason === null) return; // cancelled
      await authFetch("/api/admin/block", { method: "POST", body: JSON.stringify({ email: m.email, reason }) });
    }
    loadMembers();
  }

  async function openDetail(email: string) {
    if (detailFor === email) return setDetailFor(null);
    setDetailFor(email);
    setDetail(null);
    const res = await authFetch(`/api/admin/student?email=${encodeURIComponent(email)}`);
    setDetail(await res.json());
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !q || m.email.includes(q))
      .filter((m) => {
        if (filter === "access") return m.has_access;
        if (filter === "blocked") return m.blocked;
        if (filter === "noaccess") return !m.has_access && !m.blocked;
        if (filter === "never") return m.has_access && !m.last_app_visit;
        return true;
      })
      .sort((a, b) => (b.last_app_visit ?? "").localeCompare(a.last_app_visit ?? "") || a.email.localeCompare(b.email));
  }, [members, filter, search]);

  if (authorized === null) {
    return (
      <>
        <Nav />
        <main>
          <p className="muted">Checking…</p>
        </main>
      </>
    );
  }
  if (!authorized) {
    return (
      <>
        <Nav />
        <main>
          <h1>Not available</h1>
          <p className="muted">This page is for the PBM team.</p>
        </main>
      </>
    );
  }

  return (
    <>
    <Nav />
    <main style={{ maxWidth: 1000 }}>
      <h1>Admin</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <p className="muted">
        Kajabi sync last ran: {fmt(sync?.last_synced_at ?? null)} · {sync?.active_count ?? 0} active members found
      </p>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className={tab === "members" ? "" : "secondary"} style={small} onClick={() => setTab("members")}>
          Who has access
        </button>
        <button
          className={tab === "logins" ? "" : "secondary"}
          style={small}
          onClick={() => {
            setTab("logins");
            loadLogins();
          }}
        >
          Login log
        </button>
      </div>

      {tab === "members" && (
        <>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <input placeholder="Search email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 260 }}>
              <option value="all">Everyone ({members.length})</option>
              <option value="access">Has access</option>
              <option value="blocked">Blocked</option>
              <option value="noaccess">Has an account but no access</option>
              <option value="never">Has access but never opened the app</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Email</th>
                  <th style={th}>Access</th>
                  <th style={th}>Kajabi</th>
                  <th style={th}>Last opened app</th>
                  <th style={th}>Events</th>
                  <th style={th}>Wedding</th>
                  <th style={th}>Corporate</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <Fragment key={m.email}>
                    <tr>
                      <td style={td}>
                        {m.email}
                        {m.blocked && m.blocked_reason && <div className="muted">{m.blocked_reason}</div>}
                      </td>
                      <td style={td}>{statusLabel(m)}</td>
                      <td style={td}>{m.kajabi_status === "none" ? "Not found" : m.kajabi_status === "active" ? "Active" : "Ended"}</td>
                      <td style={td}>{fmt(m.last_app_visit)}</td>
                      <td style={td}>{m.events_count}</td>
                      <td style={td}>{m.wedding_profile}</td>
                      <td style={td}>{m.corporate_profile}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <button className="secondary" style={small} onClick={() => openDetail(m.email)}>
                          {detailFor === m.email ? "Hide" : "View"}
                        </button>{" "}
                        <button className="secondary" style={small} onClick={() => toggleBlock(m)}>
                          {m.blocked ? "Restore" : "Block"}
                        </button>
                      </td>
                    </tr>
                    {detailFor === m.email && (
                      <tr>
                        <td style={{ ...td, background: "var(--bg)" }} colSpan={8}>
                          {!detail && <span className="muted">Loading…</span>}
                          {detail?.note && <span className="muted">{detail.note}</span>}
                          {detail && !detail.note && (
                            <>
                              <strong>Profiles</strong>
                              {detail.profiles.length === 0 && <div className="muted">None started.</div>}
                              {detail.profiles.map((p) => (
                                <div key={String(p.segment)} style={{ marginTop: "0.5rem" }}>
                                  <em>{String(p.segment)}</em> ({p.is_finalized ? "final" : "draft"}) — Top: {String(p.top_categories ?? "—")} · Clients: {String(p.client_type ?? "—")} · Found via: {String(p.lead_sources ?? "—")} · Looks for vendors at: {String(p.vendor_search_habit ?? "—")}
                                </div>
                              ))}
                              <div style={{ marginTop: "1rem" }}>
                                <strong>Events ({detail.events.length})</strong>
                              </div>
                              {detail.events.map((e) => (
                                <div key={String(e.id)} className="muted">
                                  {String(e.segment)} · {String(e.category)} · price {String(e.price ?? "—")} · profit {String(e.profit ?? "—")} · booked by {String(e.decision_maker ?? "—")} · found via {String(e.lead_source ?? "—")}
                                </div>
                              ))}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td style={td} colSpan={8} className="muted">
                      Nobody matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "logins" && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>When</th>
                <th style={th}>Email</th>
                <th style={th}>Result</th>
                <th style={th}>Device</th>
              </tr>
            </thead>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id}>
                  <td style={td}>{fmt(l.created_at)}</td>
                  <td style={td}>{l.email}</td>
                  <td style={td}>{REASON_LABEL[l.reason] ?? l.reason}</td>
                  <td style={td}>{device(l.user_agent)}</td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr>
                  <td style={td} colSpan={4} className="muted">
                    No logins recorded yet. Newest 300 show here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </>
  );
}
