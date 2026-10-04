import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot, type MascotMood } from "../components/Mascot";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mood, setMood] = useState<MascotMood>("idle");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

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
      setTimeout(() => setMood("idle"), 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="login-grid">
      <style>{`@media (max-width: 860px) { .login-grid { grid-template-columns: 1fr !important; } .brand-panel { display: none; } }`}</style>
      {/* Brand / mascot panel */}
      <div
        className="brand-panel"
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #0ea5e9 100%)",
          color: "#fff", padding: 48, display: "flex", flexDirection: "column",
          justifyContent: "center", position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.16, background: "radial-gradient(600px 300px at 20% 20%, #fff, transparent), radial-gradient(500px 300px at 80% 85%, #bae6fd, transparent)" }} />
        <div style={{ position: "relative", maxWidth: 380, margin: "0 auto", width: "100%" }}>
          <div style={{ fontWeight: 800, fontSize: 26, marginBottom: 6 }}>◆ Monolith</div>
          <p style={{ opacity: 0.85, fontSize: 14, margin: "0 0 28px" }}>
            Personal NSE/BSE algo trader. Paper-first, always audited.
          </p>
          <Mascot mood={mood} />
          <p style={{ opacity: 0.75, fontSize: 12.5, marginTop: 18, textAlign: "center" }}>
            {mood === "shy" ? "Psst… I'm not looking at your password."
              : mood === "happy" ? "Welcome back, boss!"
              : mood === "error" ? "Hmm, that didn't match. Try again?"
              : "I follow your cursor. Try the password field."}
          </p>
        </div>
      </div>
      {/* Form panel */}
      <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
        <div
          key={shakeKey}
          className={`card ${shakeKey > 0 && mood === "error" ? "shake" : ""}`}
          style={{ width: "100%", maxWidth: 400, padding: 32 }}
        >
          <h2 style={{ margin: "0 0 4px" }}>Sign in</h2>
          <p className="sub">Step-up + TOTP required. Sessions expire in 15 min.</p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="user">User</label>
              <input
                id="user" value={user}
                onChange={(e) => { setUser(e.target.value); if (e.target.value && password && totp) setMood("happy"); }}
                onFocus={() => setMood("idle")} autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input
                id="pw" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setMood("shy")} onBlur={() => setMood("idle")}
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="totp">TOTP code</label>
              <input
                id="totp" value={totp} inputMode="numeric" placeholder="6-digit"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTotp(v);
                  if (user && password && v.length === 6) setMood("happy");
                }}
                onFocus={() => setMood("idle")}
              />
            </div>
            {err && <p style={{ color: "var(--red)", fontSize: 13.5 }}>{err}</p>}
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
