import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, authInput, authLabel, authLink, authMuted, authPrimary } from "../components/AuthShell";
import { useAuth } from "../auth/AuthContext";

const row2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

function Eye({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Hide" : "Show"}
      style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: "#6e6e6e", fontSize: 15, padding: 0,
      }}
    >
      {show ? "◉" : "◎"}
    </button>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const formOk = user.trim() !== "" && password !== "" && totp !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <AuthShell tagline={["Trade your future, one session at a time.", "Join disciplined systematic traders."]}>
      <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Sign in to Monolith</h1>
      <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
        Paper-first NSE/BSE trading, fully audited. Sessions expire in 15 minutes.
      </p>
      <div key={shakeKey} className={err ? "shake" : undefined}>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={authLabel} htmlFor="user">User *</label>
            <input id="user" style={authInput} value={user} autoComplete="username"
              placeholder="e.g. owner" onChange={(e) => setUser(e.target.value)} />
          </div>
          <div style={{ ...row2, marginBottom: 6 }}>
            <div>
              <label style={authLabel} htmlFor="pw">Password *</label>
              <div style={{ position: "relative" }}>
                <input id="pw" style={{ ...authInput, paddingRight: 40 }}
                  type={showPw ? "text" : "password"} value={password}
                  autoComplete="current-password" placeholder="••••••••••"
                  onChange={(e) => setPassword(e.target.value)} />
                <Eye show={showPw} onToggle={() => setShowPw((s) => !s)} />
              </div>
            </div>
            <div>
              <label style={authLabel} htmlFor="totp">TOTP code *</label>
              <input id="totp" style={authInput} value={totp} inputMode="numeric"
                placeholder="6-digit" onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            </div>
          </div>
          <p style={{ ...authMuted, margin: "10px 0 22px", fontSize: 11.5 }}>
            TOTP is mandatory on every sign in. <Link to="/forgot-password" style={authLink}>Forgot password?</Link>
          </p>
          {err && <p style={{ color: "#f87171", fontSize: 12.5, margin: "0 0 14px" }}>{err}</p>}
          <button style={{ ...authPrimary, opacity: !formOk || busy ? 0.55 : 1 }} disabled={busy || !formOk}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <p style={{ ...authMuted, textAlign: "center", margin: "26px 0 0" }}>
        First time here? <Link to="/setup" style={authLink}>Run setup</Link>
      </p>
      <p style={{ color: "#6e6e6e", fontSize: 10.5, textAlign: "center", margin: "26px 0 0", lineHeight: 1.7 }}>
        Step-up auth is required for live trading, limit changes and exports.
      </p>
    </AuthShell>
  );
}
