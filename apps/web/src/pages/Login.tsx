import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/auth/password";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const userErr = touched && user.trim() === "" ? "Enter your username." : "";
  const pwErr = touched && password === "" ? "Enter your password." : "";
  const totpErr =
    touched && (totp === "" || !/^\d{6}$/.test(totp)) ? "Enter the 6-digit code." : "";
  const formOk = user.trim() !== "" && password !== "" && /^\d{6}$/.test(totp);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formOk || busy) return;
    setBusy(true);
    setErr("");
    try {
      await login(user, password, totp);
      nav("/");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed.");
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to Monolith"
      subtitle="Paper-first NSE/BSE trading, fully audited. Sessions expire in 15 minutes."
      asideCaption="Trade your future, one session at a time."
      footer={
        <p className="auth-hint" style={{ textAlign: "center", marginTop: 26 }}>
          First time here? <Link to="/setup" style={{ color: "#e7e7e7" }}>Run setup</Link>
        </p>
      }
    >
      <div key={shakeKey} className={err ? "shake" : undefined}>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="login-user">Username</label>
            <input
              id="login-user"
              value={user}
              autoComplete="username"
              aria-invalid={!!userErr}
              aria-describedby={userErr ? "login-user-err" : undefined}
              onChange={(e) => setUser(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {userErr && (
              <p role="alert" id="login-user-err" className="field-error">
                {userErr}
              </p>
            )}
          </div>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            reveal={reveal}
            onToggleReveal={() => setReveal((r) => !r)}
            autoComplete="current-password"
            error={pwErr || undefined}
          />
          <div className="field">
            <label htmlFor="login-totp">Authenticator code</label>
            <input
              id="login-totp"
              value={totp}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder=""
              aria-invalid={!!totpErr}
              aria-describedby={totpErr ? "login-totp-err" : "login-totp-hint"}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onBlur={() => setTouched(true)}
            />
            {totpErr ? (
              <p role="alert" id="login-totp-err" className="field-error">
                {totpErr}
              </p>
            ) : (
              <p id="login-totp-hint" className="auth-hint">
                6-digit code. TOTP is mandatory on every sign in.{" "}
                <Link to="/forgot-password" style={{ color: "#e7e7e7" }}>
                  Forgot password?
                </Link>
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
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {!formOk && <p className="auth-hint">Complete all fields to continue</p>}
        </form>
      </div>
    </AuthShell>
  );
}
