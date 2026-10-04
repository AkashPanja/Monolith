import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, authInput, authPrimary } from "../components/AuthShell";
import { completeSetup, skipSetup } from "../setup/setupStore";
import { mockApi } from "../api/mock";

const label: CSSProperties = { fontSize: 12.5, color: "#b9b4d0", display: "block", margin: "0 0 6px" };
const row2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const back: CSSProperties = {
  background: "none", border: "1px solid #3d3657", borderRadius: 9,
  padding: "12px 18px", color: "#eceaf4", cursor: "pointer", fontSize: 14,
};
const skipLink: CSSProperties = {
  display: "block", margin: "16px auto 0", background: "none", border: "none",
  color: "#8f89a8", fontSize: 13, cursor: "pointer", textDecoration: "underline",
};
const steps = ["Create first user", "Email delivery", "Ready"];

function pwScore(pw: string): { label: string; color: string; width: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { label: "Weak", color: "#f87171", width: "33%" };
  if (s <= 3) return { label: "Fair", color: "#fbbf24", width: "60%" };
  return { label: "Strong", color: "#34d399", width: "100%" };
}

/** WordPress-style first-run wizard. Every step skippable; finishing or
    skipping lands on /login. Email step configures report/reset delivery. */
export function Setup() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [testOk, setTestOk] = useState("");

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [from, setFrom] = useState("");

  const skip = () => {
    skipSetup();
    nav("/login");
  };

  const finish = () => {
    completeSetup({
      username: first || "admin",
      email,
      smtp: { host, port: Number(port) || 587, user: smtpUser, from: from || email },
    });
    nav("/login");
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

  const userOk = first.trim() !== "" && /.+@.+\..+/.test(email) && password.length >= 8;
  const score = pwScore(password);

  return (
    <AuthShell
      tagline={step === 0 ? ["Let's get you", "set up"] : step === 1 ? ["Where should", "reports go?"] : ["You're all", "set"]}
      activeDot={step}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: 11.5, padding: "4px 10px", borderRadius: 999,
              background: i === step ? "rgba(108,92,231,.35)" : "transparent",
              border: `1px solid ${i === step ? "#6c5ce7" : "#3d3657"}`,
              color: i === step ? "#fff" : "#8f89a8",
            }}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <>
          <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 700 }}>Create your account</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "#8f89a8" }}>
            This creates the first (owner) user. Single-owner system — no roles to pick.
          </p>
          <div style={{ ...row2, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="su-first">First name</label>
              <input id="su-first" style={authInput} value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Ada" />
            </div>
            <div>
              <label style={label} htmlFor="su-last">Last name</label>
              <input id="su-last" style={authInput} value={last} onChange={(e) => setLast(e.target.value)} placeholder="Trader" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="su-email">Email</label>
            <input id="su-email" style={authInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={label} htmlFor="su-pw">Password</label>
            <input
              id="su-pw" style={authInput} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>
          {password && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ height: 5, borderRadius: 999, background: "#3d3657", overflow: "hidden" }}>
                <div style={{ width: score.width, height: "100%", background: score.color }} />
              </div>
              <div style={{ fontSize: 12, color: score.color, marginTop: 4 }}>{score.label}</div>
            </div>
          )}
          <button style={{ ...authPrimary, opacity: userOk ? 1 : 0.55 }} disabled={!userOk} onClick={() => setStep(1)}>
            Continue →
          </button>
          <button style={skipLink} onClick={skip}>Skip setup for now</button>
        </>
      )}

      {step === 1 && (
        <>
          <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 700 }}>Email delivery</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "#8f89a8" }}>
            Used for EOD reports, password resets, and CRITICAL alerts. Gmail App Password works fine.
          </p>
          <div style={{ ...row2, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="se-host">SMTP host</label>
              <input id="se-host" style={authInput} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label style={label} htmlFor="se-port">Port</label>
              <input id="se-port" style={authInput} value={port} inputMode="numeric" onChange={(e) => setPort(e.target.value)} placeholder="587" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="se-user">SMTP username</label>
            <input id="se-user" style={authInput} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label} htmlFor="se-pass">SMTP password</label>
            <input
              id="se-pass" style={authInput} type="password" value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)} placeholder="App password"
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label} htmlFor="se-from">From address</label>
            <input id="se-from" style={authInput} value={from} onChange={(e) => setFrom(e.target.value)} placeholder={email || "reports@example.com"} />
          </div>
          {err && <p style={{ color: "#f87171", fontSize: 13.5, margin: "0 0 12px" }}>{err}</p>}
          {testOk && <p style={{ color: "#34d399", fontSize: 13.5, margin: "0 0 12px" }}>{testOk}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={back} onClick={() => setStep(0)}>← Back</button>
            <button
              style={{ ...back, flex: 1, opacity: !host || busy ? 0.55 : 1 }}
              disabled={!host || busy} onClick={testEmail}
            >
              {busy ? "Sending…" : "Send test email"}
            </button>
            <button style={{ ...authPrimary, width: "auto", flex: 1 }} onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
          <button style={skipLink} onClick={skip}>Skip this step</button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 700 }}>Ready to trade</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "#8f89a8" }}>
            {first || "Owner"} {email ? `(${email})` : ""} · {host ? `mail via ${host}` : "email skipped — configure later in Settings"}
          </p>
          <div
            style={{
              background: "rgba(108,92,231,.14)", border: "1px solid rgba(108,92,231,.45)",
              borderRadius: 9, padding: "13px 14px", fontSize: 13.5, marginBottom: 18,
            }}
          >
            Mode starts at <b>PAPER</b>. Live trading needs step-up auth + the promotion checklist.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={back} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...authPrimary, width: "auto", flex: 1 }} onClick={finish}>
              Finish → Sign in
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: "#8f89a8", marginTop: 14, textAlign: "center" }}>
            Already have an account? <Link to="/login" style={{ color: "#a78bfa" }}>Sign in</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
