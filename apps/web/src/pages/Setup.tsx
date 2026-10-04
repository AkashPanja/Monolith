import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Stepper } from "../components/auth/Stepper";
import { PASSWORD_RULES, PasswordField, PasswordRules } from "../components/auth/password";
import { api, isLive } from "../api/mock";
import { completeSetup, skipSetup } from "../setup/setupStore";
import { mockApi } from "../api/mock";

const STEPS = [
  { id: "account", label: "Account" },
  { id: "email", label: "Email" },
  { id: "ready", label: "Ready" },
];

const SHOW_SKIP = import.meta.env.DEV === true;

/** First-run wizard. Skip is a dev-only escape hatch (hidden in production). */
export function Setup() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [testOk, setTestOk] = useState("");
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
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

  useEffect(() => {
    if (isLive()) {
      api.setupStatus().then((s) => {
        if (s.done) nav("/login");
      }).catch(() => {});
    }
  }, [nav]);

  const blur = (k: string) => setBlurred((b) => ({ ...b, [k]: true }));

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
  const rulesOk = PASSWORD_RULES.every((r) => r.test(password));
  const match = password !== "" && password === confirm;
  const userOk = name.trim() !== "" && emailOk && rulesOk && match;

  const nameErr = blurred.name && name.trim() === "" ? "Enter your full name." : "";
  const emailErr = blurred.email && !emailOk ? "Enter a valid email address." : "";
  const confirmErr =
    blurred.confirm && confirm !== "" && !match
      ? "Passwords don't match."
      : "";

  const titles = ["Create your account", "Email delivery", "Ready to trade", "Save your authenticator secret"];
  const subtitles = [
    "This creates the first (owner) user. Single-owner system — no roles to pick.",
    "Used for EOD reports, password resets and CRITICAL alerts. Gmail App Password works fine.",
    undefined,
    "Shown once. Add it to your authenticator app now — login requires a TOTP code every time.",
  ];

  return (
    <AuthShell
      steps={STEPS}
      current={Math.min(step, 2)}
      title={titles[Math.min(step, 3)]}
      subtitle={subtitles[Math.min(step, 3)]}
      asideCaption="Set up Monolith, own every trade."
      footer={
        step === 0 ? (
          <p className="auth-hint" style={{ textAlign: "center", marginTop: 26 }}>
            Already have an account? <Link to="/login" style={{ color: "#e7e7e7" }}>Sign in</Link>
          </p>
        ) : undefined
      }
    >
      <Stepper steps={STEPS} current={Math.min(step, 2)} />

      {step === 0 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setBlurred({ name: true, email: true, confirm: true });
            if (userOk) setStep(1);
          }}
        >
          <div className="field">
            <label htmlFor="su-name">Full name</label>
            <input
              id="su-name"
              value={name}
              autoComplete="name"
              aria-invalid={!!nameErr}
              aria-describedby={nameErr ? "su-name-err" : undefined}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => blur("name")}
            />
            {nameErr && (
              <p role="alert" id="su-name-err" className="field-error">
                {nameErr}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="su-email">Email address</label>
            <input
              id="su-email"
              type="email"
              value={email}
              autoComplete="email"
              aria-invalid={!!emailErr}
              aria-describedby={emailErr ? "su-email-err" : undefined}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => blur("email")}
            />
            {emailErr && (
              <p role="alert" id="su-email-err" className="field-error">
                {emailErr}
              </p>
            )}
          </div>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            reveal={reveal}
            onToggleReveal={() => setReveal((r) => !r)}
            autoComplete="new-password"
            describedBy="pw-rules"
          />
          <PasswordField
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            reveal={reveal}
            onToggleReveal={() => setReveal((r) => !r)}
            autoComplete="new-password"
            error={confirmErr || undefined}
            describedBy={confirmErr ? "su-confirm-err" : undefined}
          />
          {confirmErr && <span id="su-confirm-err" hidden />}
          <PasswordRules value={password} />
          {match && (
            <p role="status" style={{ color: "var(--auth-accent)", fontSize: 12, margin: "-14px 0 18px" }}>
              ✓ Passwords match
            </p>
          )}
          <button
            type="submit"
            className="btn-auth"
            aria-disabled={!userOk}
            onClick={(e) => {
              if (!userOk) e.preventDefault();
            }}
          >
            Continue
          </button>
          {!userOk && <p className="auth-hint">Complete all fields to continue</p>}
          {SHOW_SKIP && (
            <button type="button" className="auth-skip" onClick={skip}>
              Skip setup for now (dev only)
            </button>
          )}
        </form>
      )}

      {step === 1 && (
        <>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="se-host">SMTP host</label>
              <input
                id="se-host"
                value={host}
                autoComplete="off"
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="se-port">Port</label>
              <input
                id="se-port"
                value={port}
                inputMode="numeric"
                autoComplete="off"
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="se-user">SMTP username</label>
              <input
                id="se-user"
                value={smtpUser}
                autoComplete="off"
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="se-from">From address</label>
              <input
                id="se-from"
                value={from}
                autoComplete="off"
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
          </div>
          <PasswordField
            label="SMTP password"
            value={smtpPass}
            onChange={setSmtpPass}
            reveal={reveal}
            onToggleReveal={() => setReveal((r) => !r)}
            autoComplete="off"
          />
          {err && (
            <p role="alert" className="field-error" style={{ marginBottom: 14 }}>
              {err}
            </p>
          )}
          {testOk && (
            <p role="status" style={{ color: "var(--auth-accent)", fontSize: 12, margin: "0 0 14px" }}>
              {testOk}
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-auth-ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              type="button"
              className="btn-auth-ghost"
              aria-disabled={!host || busy}
              onClick={(e) => {
                if (!host || busy) e.preventDefault();
                else testEmail();
              }}
            >
              {busy ? "Sending…" : "Test"}
            </button>
            <button type="button" className="btn-auth" style={{ width: "auto", flex: 1.4 }} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
          {SHOW_SKIP && (
            <button type="button" className="auth-skip" onClick={skip}>
              Skip this step (dev only)
            </button>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <p className="auth-sub" style={{ marginTop: 0 }}>
            {name || "Owner"}
            {email ? ` · ${email}` : ""}
            {host ? ` · mail via ${host}` : " · email skipped, configure later in Settings"}
          </p>
          <div className="auth-note">
            Mode starts at <b>PAPER</b>. Live trading needs step-up auth + the promotion checklist.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-auth-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="btn-auth"
              style={{ width: "auto", flex: 1 }}
              aria-disabled={busy}
              onClick={finish}
            >
              {busy ? "Creating…" : "Finish"}
            </button>
          </div>
          {err && (
            <p role="alert" className="field-error" style={{ marginTop: 14 }}>
              {err}
            </p>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div className="totp-secret">{totpSecret}</div>
          <button type="button" className="btn-auth" onClick={() => nav("/login")}>
            Saved — Sign in
          </button>
        </>
      )}
    </AuthShell>
  );
}
