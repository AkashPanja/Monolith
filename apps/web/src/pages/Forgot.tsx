import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell, authInput, authLabel, authLink, authMuted, authPrimary } from "../components/AuthShell";
import { mockApi } from "../api/mock";

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
    <AuthShell tagline={["Locked out?", "Let's get you back in."]}>
      <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Reset your password</h1>
      <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
        Enter your account email and we'll send a reset link.
      </p>
      {sent ? (
        <>
          <div style={{
            background: "#12240f", border: "1px solid #2c4a22", borderRadius: 8,
            padding: "13px 14px", fontSize: 12.5, marginBottom: 22, lineHeight: 1.6,
          }}>
            If an account exists for <b>{email}</b>, a reset link is on its way.
          </div>
          <p style={{ ...authMuted, textAlign: "center", margin: 0 }}>
            <Link to="/login" style={authLink}>Back to sign in</Link>
          </p>
        </>
      ) : (
        <form onSubmit={submit}>
          <div style={{ marginBottom: 22 }}>
            <label style={authLabel} htmlFor="email">Email address *</label>
            <input id="email" style={authInput} type="email" value={email}
              placeholder="e.g. owner@example.com" autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && <p style={{ color: "#f87171", fontSize: 12.5, margin: "0 0 14px" }}>{err}</p>}
          <button style={{ ...authPrimary, opacity: !email || busy ? 0.55 : 1 }} disabled={busy || !email}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p style={{ ...authMuted, textAlign: "center", margin: "26px 0 0" }}>
            <Link to="/login" style={authLink}>Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
