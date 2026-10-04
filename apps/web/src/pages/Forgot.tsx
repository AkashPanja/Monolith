import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { mockApi } from "../api/mock";

export function Forgot() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const emailErr =
    touched && !/.+@.+\..+/.test(email) ? "Enter a valid email address." : "";
  const formOk = /.+@.+\..+/.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formOk || busy) return;
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
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send a reset link."
      asideCaption="Locked out? Let's get you back in."
      footer={
        <p className="auth-hint" style={{ textAlign: "center", marginTop: 26 }}>
          <Link to="/login" style={{ color: "#e7e7e7" }}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div
          role="status"
          style={{
            background: "#12240f",
            border: "1px solid #2c4a22",
            borderRadius: 8,
            padding: "13px 14px",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          If an account exists for <b>{email}</b>, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              autoComplete="email"
              aria-invalid={!!emailErr}
              aria-describedby={emailErr ? "forgot-email-err" : undefined}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {emailErr && (
              <p role="alert" id="forgot-email-err" className="field-error">
                {emailErr}
              </p>
            )}
          </div>
          {err && (
            <p role="alert" className="field-error" style={{ marginBottom: 14 }}>
              {err}
            </p>
          )}
          <button
            type="submit"
            className="btn-auth"
            aria-disabled={!formOk || busy}
            onClick={(e) => {
              if (!formOk) e.preventDefault();
            }}
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
          {!formOk && <p className="auth-hint">Enter your account email to continue</p>}
        </form>
      )}
    </AuthShell>
  );
}
