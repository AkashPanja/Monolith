import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, authInput, authLabel, authLink, authMuted, authPrimary } from "../components/AuthShell";
import { api, isLive } from "../api/mock";
import { completeSetup, skipSetup } from "../setup/setupStore";
import { mockApi } from "../api/mock";

const row2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const back: CSSProperties = {
  background: "none", border: "1px solid #2e2e2e", borderRadius: 8,
  padding: "13px 18px", color: "#f5f5f4", cursor: "pointer", fontSize: 13.5, fontFamily: "inherit",
};
const skipBtn: CSSProperties = {
  display: "block", margin: "22px auto 0", background: "none", border: "none",
  color: "#8a8a8a", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
};
const steps = ["Account", "Email", "Ready"];

function Eye({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button" onClick={onToggle} aria-label={show ? "Hide" : "Show"}
      style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: "#6e6e6e", fontSize: 15, padding: 0,
      }}
    >
      {show ? "◉" : "◎"}
    </button>
  );
}

/** First-run wizard in the reference style. Every step skippable. */
export function Setup() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [testOk, setTestOk] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [from, setFrom] = useState("");
  const [totpSecret, setTotpSecret] = useState("");

  useEffect(() => {
    if (isLive()) {
      api.setupStatus().then((s) => {
        if (s.done) nav("/login");
      }).catch(() => {});
    }
  }, [nav]);

  const skip = () => {
    skipSetup();
    nav("/login");
  };
  const finish = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await api.createFirstUser({
        username: name || "admin",
        email,
        password,
        smtp: { host, port: Number(port) || 587, user: smtpUser, from: from || email },
      });
      completeSetup({
        username: name || "admin",
        email,
        smtp: { host, port: Number(port) || 587, user: smtpUser, from: from || email },
      });
      if (isLive()) {
        // Server enrolled the authenticator secret: show it ONCE, then login.
        setTotpSecret(r.totpSecret);
        setStep(3);
      } else {
        nav("/login");
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  };
  const testEmail = async () => {
    setBusy(true);
    setTestOk("");
    setErr("");
    try {
      await mockApi.sendTestEmail({ host, port: Number(port), from: from || email, to: email });
      setTestOk("Test email sent — check the inbox.");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  };

  const emailOk = /.+@.+\..+/.test(email);
  const pwOk = password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  const userOk = name.trim() !== "" && emailOk && pwOk && password === confirm;

  return (
    <AuthShell tagline={["Set up Monolith,", "own every trade."]}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <span key={s} style={{
            fontSize: 11, padding: "4px 11px", borderRadius: 999,
            background: i === step ? "#2a2a2a" : "transparent",
            border: `1px solid ${i === step ? "#c9d6a3" : "#2e2e2e"}`,
            color: i === step ? "#e7e7e7" : "#8a8a8a",
          }}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <>
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Create your account</h1>
          <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
            This creates the first (owner) user. Single-owner system — no roles to pick.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={authLabel} htmlFor="su-name">Full name *</label>
            <input id="su-name" style={authInput} value={name} placeholder="Andrew Thomas"
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={authLabel} htmlFor="su-email">Email address *</label>
            <input id="su-email" style={authInput} type="email" value={email}
              placeholder="e.g. andrew@example.com" onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ ...row2, marginBottom: 6 }}>
            <div>
              <label style={authLabel} htmlFor="su-pw">Password</label>
              <div style={{ position: "relative" }}>
                <input id="su-pw" style={{ ...authInput, paddingRight: 40 }} type={showPw ? "text" : "password"}
                  value={password} placeholder="••••••••••" onChange={(e) => setPassword(e.target.value)} />
                <Eye show={showPw} onToggle={() => setShowPw((s) => !s)} />
              </div>
            </div>
            <div>
              <label style={authLabel} htmlFor="su-confirm">Confirm password</label>
              <input id="su-confirm" style={authInput} type="password" value={confirm}
                placeholder="••••••••••" onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <p style={{ color: "#6e6e6e", fontSize: 11, margin: "10px 0 22px", lineHeight: 1.6 }}>
            Password must be at least 8 characters, including a number and a special character.
            {confirm && password !== confirm && <span style={{ color: "#f87171" }}> Passwords don't match.</span>}
          </p>
          <button style={{ ...authPrimary, opacity: userOk ? 1 : 0.55 }} disabled={!userOk} onClick={() => setStep(1)}>
            Continue
          </button>
          <button style={skipBtn} onClick={skip}>Skip setup for now</button>
        </>
      )}

      {step === 1 && (
        <>
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Email delivery</h1>
          <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
            Used for EOD reports, password resets and CRITICAL alerts. Gmail App Password works fine.
          </p>
          <div style={{ ...row2, marginBottom: 16 }}>
            <div>
              <label style={authLabel} htmlFor="se-host">SMTP host *</label>
              <input id="se-host" style={authInput} value={host} placeholder="smtp.gmail.com"
                onChange={(e) => setHost(e.target.value)} />
            </div>
            <div>
              <label style={authLabel} htmlFor="se-port">Port</label>
              <input id="se-port" style={authInput} value={port} inputMode="numeric"
                onChange={(e) => setPort(e.target.value)} />
            </div>
          </div>
          <div style={{ ...row2, marginBottom: 16 }}>
            <div>
              <label style={authLabel} htmlFor="se-user">SMTP username</label>
              <input id="se-user" style={authInput} value={smtpUser} placeholder="you@example.com"
                onChange={(e) => setSmtpUser(e.target.value)} />
            </div>
            <div>
              <label style={authLabel} htmlFor="se-from">From address</label>
              <input id="se-from" style={authInput} value={from} placeholder={email || "reports@example.com"}
                onChange={(e) => setFrom(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={authLabel} htmlFor="se-pass">SMTP password</label>
            <input id="se-pass" style={authInput} type="password" value={smtpPass}
              placeholder="App password" onChange={(e) => setSmtpPass(e.target.value)} />
          </div>
          {err && <p style={{ color: "#f87171", fontSize: 12.5, margin: "0 0 14px" }}>{err}</p>}
          {testOk && <p style={{ color: "#a3c585", fontSize: 12.5, margin: "0 0 14px" }}>{testOk}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={back} onClick={() => setStep(0)}>Back</button>
            <button style={{ ...back, flex: 1, opacity: !host || busy ? 0.55 : 1 }}
              disabled={!host || busy} onClick={testEmail}>
              {busy ? "Sending…" : "Test"}
            </button>
            <button style={{ ...authPrimary, width: "auto", flex: 1.4 }} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
          <button style={skipBtn} onClick={skip}>Skip this step</button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Ready to trade</h1>
          <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
            {name || "Owner"}{email ? ` · ${email}` : ""}{host ? ` · mail via ${host}` : " · email skipped, configure later in Settings"}
          </p>
          <div style={{
            background: "#141414", border: "1px solid #2e2e2e", borderRadius: 8,
            padding: "14px", fontSize: 12.5, marginBottom: 22, lineHeight: 1.6, color: "#d4d4d4",
          }}>
            Mode starts at <b>PAPER</b>. Live trading needs step-up auth + the promotion checklist.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={back} onClick={() => setStep(1)}>Back</button>
            <button style={{ ...authPrimary, width: "auto", flex: 1 }} onClick={finish} disabled={busy}>
              {busy ? "Creating…" : "Finish"}
            </button>
          </div>
          {err && step === 2 && <p style={{ color: "#f87171", fontSize: 12.5, margin: "14px 0 0" }}>{err}</p>}
          <p style={{ ...authMuted, textAlign: "center", margin: "26px 0 0" }}>
            Already have an account? <Link to="/login" style={authLink}>Sign in</Link>
          </p>
        </>
      )}

      {step === 3 && (
        <>
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 500 }}>Save your authenticator secret</h1>
          <p style={{ margin: "0 0 28px", fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.6 }}>
            Shown once. Add it to your authenticator app now — login requires a TOTP code every time.
          </p>
          <div style={{
            background: "#141414", border: "1px dashed #c9d6a3", borderRadius: 8,
            padding: "16px", fontSize: 17, letterSpacing: "0.12em", textAlign: "center",
            marginBottom: 22, userSelect: "all",
          }}>
            {totpSecret}
          </div>
          <button style={authPrimary} onClick={() => nav("/login")}>
            Saved — Sign in
          </button>
        </>
      )}
    </AuthShell>
  );
}
