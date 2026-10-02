"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main
      style={{
        maxWidth: "28rem",
        margin: "4rem auto",
        background: "white",
        border: "1px solid var(--rule)",
        borderRadius: "6px",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "3rem",
          height: "3rem",
          borderRadius: "8px",
          background: "var(--steel)",
          color: "white",
          fontWeight: 700,
          fontSize: "1.1rem",
          marginBottom: "1rem",
        }}
      >
        TM
      </span>
      <h1 style={{ marginTop: 0 }}>Target Market Finder</h1>
      <p className="muted">
        Log in with your email — we'll send you a link, no password needed.
      </p>

      {sent ? (
        <div className="card" style={{ textAlign: "left" }}>
          <strong>Check your email.</strong>
          <p className="muted">We sent a login link to {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {error && <p style={{ color: "var(--loss)" }}>{error}</p>}
          <button type="submit" style={{ width: "100%" }}>
            Send login link
          </button>
        </form>
      )}
    </main>
  );
}
