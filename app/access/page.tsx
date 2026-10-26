"use client";

import { FormEvent, useState } from "react";

export default function AccessPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/site-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 503 ? "Access is not configured yet. Please try again later." : "That password isn’t correct.");
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Could not verify access. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="ynot-access-page">
      <section className="ynot-access-card">
        <div className="ynot-access-mark" aria-hidden="true">Y</div>
        <p className="ynot-access-eyebrow">A WORLD OF DISCOVERY</p>
        <h1>YNOT World</h1>
        <p className="ynot-access-copy">Enter your access password to continue.</p>
        <form onSubmit={submit}>
          <label htmlFor="access-password">Access password</label>
          <input id="access-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          {error ? <p className="ynot-access-error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy || !password}>{busy ? "Checking…" : "Enter YNOT"}</button>
        </form>
        <p className="ynot-access-footnote">Private access · YNOT World</p>
      </section>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #08090b; }
        .ynot-access-page { min-height: 100svh; display: grid; place-items: center; padding: 24px; color: #f5f5f5; background: radial-gradient(ellipse at 50% 20%, #24262b 0%, #101114 38%, #08090b 75%); font-family: Arial, Helvetica, sans-serif; }
        .ynot-access-card { width: min(100%, 410px); padding: 38px 30px 28px; border: 1px solid rgba(255,255,255,.12); border-radius: 26px; background: rgba(24,25,29,.78); box-shadow: 0 24px 90px rgba(0,0,0,.45); backdrop-filter: blur(22px); }
        .ynot-access-mark { display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto 22px; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; font-size: 26px; font-weight: 700; background: radial-gradient(circle at 35% 25%, #777 0%, #303136 45%, #111 100%); }
        .ynot-access-eyebrow { margin: 0 0 9px; color: #a9abb2; font-size: 10px; letter-spacing: .24em; text-align: center; }
        .ynot-access-card h1 { margin: 0; font-size: 31px; font-weight: 600; letter-spacing: -.04em; text-align: center; }
        .ynot-access-copy { margin: 12px 0 28px; color: #b8bac1; font-size: 14px; text-align: center; }
        .ynot-access-card label { display: block; margin-bottom: 9px; color: #d7d8dc; font-size: 12px; }
        .ynot-access-card input { width: 100%; height: 49px; border: 1px solid #41434a; border-radius: 12px; outline: none; padding: 0 14px; color: #fff; background: #101115; font-size: 16px; }
        .ynot-access-card input:focus { border-color: #a9abb2; box-shadow: 0 0 0 3px rgba(255,255,255,.07); }
        .ynot-access-card button { width: 100%; height: 49px; margin-top: 14px; border: 0; border-radius: 12px; color: #101114; background: #f3f3f3; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ynot-access-card button:disabled { opacity: .55; cursor: wait; }
        .ynot-access-error { margin: 10px 0 0; color: #ff9e9e; font-size: 12px; }
        .ynot-access-footnote { margin: 26px 0 0; color: #72747c; font-size: 11px; text-align: center; }
      `}</style>
    </main>
  );
}
