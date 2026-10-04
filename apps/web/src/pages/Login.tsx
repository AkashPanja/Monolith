import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, authInput, authPrimary } from "../components/AuthShell";
import type { MascotMood } from "../components/Mascot";
import { useAuth } from "../auth/AuthContext";

const label: CSSProperties = { fontSize: 12.5, color: "#b9b4d0", display: "block", margin: "0 0 6px" };
const link: CSSProperties = { color: "#a78bfa", fontSize: 13 };
const hint: CSSProperties = { fontSize: 12.5, color: "#8f89a8", margin: "14px 0 0", textAlign: "center" };

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mood, setMood] = useState<MascotMood>("idle");
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
      setMood("happy");
      setTimeout(() => nav("/"), 450);
    } catch (ex) {
      setMood("error");
      setErr(ex instanceof Error ? ex.message : "Login failed.");
      setShakeKey((k) => k + 1);
      setTimeout(() => setMood("idle"), 1400);
    } finally {
      setBusy(false);
    }
  };

  const maybeHappy = () => {
    if (user.trim() && password && totp.length === 6) setMood("happy");
  };

  return (
    <AuthShell tagline={["Paper-first trading,", "fully audited"]} activeDot={0} mood={mood}>
      <h1 style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 700 }}>Welcome back</h1>
      <p style={{ margin: "0 0 26px", fontSize: 13.5, color: "#8f89a8" }}>
        First time here? <Link to="/setup" style={link}>Run the setup wizard</Link>
      </p>
      <div key={shakeKey} className={mood === "error" ? "shake" : undefined}>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="user">User</label>
            <input
              id="user" style={authInput} value={user} autoComplete="username"
              onChange={(e) => { setUser(e.target.value); maybeHappy(); }}
              onFocus={() => mood === "error" || setMood("idle")}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={label} htmlFor="pw">Password</label>
              <Link to="/forgot-password" style={link}>Forgot password?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="pw" style={{ ...authInput, paddingRight: 44 }}
                type={showPw ? "text" : "password"} value={password}
                autoComplete="current-password"
                onChange={(e) => { setPassword(e.target.value); maybeHappy(); }}
                onFocus={() => setMood("shy")} onBlur={() => setMood("idle")}
              />
              <button
                type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.75,
                }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label} htmlFor="totp">TOTP code</label>
            <input
              id="totp" style={authInput} value={totp} inputMode="numeric" placeholder="6-digit code"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTotp(v);
                if (user.trim() && password && v.length === 6) setMood("happy");
              }}
              onFocus={() => mood === "error" || setMood("idle")}
            />
          </div>
          {err && <p style={{ color: "#f87171", fontSize: 13.5, margin: "0 0 12px" }}>{err}</p>}
          <button style={{ ...authPrimary, opacity: !formOk || busy ? 0.55 : 1 }} disabled={busy || !formOk}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <p style={hint}>Sessions expire in 15 min · step-up required for dangerous actions</p>
    </AuthShell>
  );
}
