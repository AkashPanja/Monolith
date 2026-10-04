import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell, authInput, authPrimary } from "../components/AuthShell";
import { mockApi } from "../api/mock";

/** Forgot-password: request a reset link. Skippable by nature (link back). */
export function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await mockApi.requestPasswordReset(email);
      setSent(true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell tagline={["Locked out?", "let's fix that"]} activeDot={1}>
      <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 700 }}>Reset password</h1>
      <p style={{ margin: "0 0 26px", fontSize: 13.5, color: "#8f89a8" }}>
        Enter your account email — we'll send a reset link.
      </p>
      {sent ? (
        <>
          <div
            style={{
              background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.4)",
              borderRadius: 9, padding: "13px 14px", fontSize: 13.5, marginBottom: 18,
            }}
          >
            If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox.
          </div>
          <Link to="/login" style={{ color: "#a78bfa", fontSize: 13.5 }}>← Back to sign in</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12.5, color: "#b9b4d0", display: "block", marginBottom: 6 }} htmlFor="email">
              Email
            </label>
            <input
              id="email" style={authInput} type="email" value={email}
              placeholder="you@example.com" autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {err && <p style={{ color: "#f87171", fontSize: 13.5, margin: "0 0 12px" }}>{err}</p>}
          <button style={{ ...authPrimary, opacity: !email || busy ? 0.55 : 1 }} disabled={busy || !email}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p style={{ fontSize: 12.5, color: "#8f89a8", marginTop: 14, textAlign: "center" }}>
            <Link to="/login" style={{ color: "#a78bfa" }}>Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
