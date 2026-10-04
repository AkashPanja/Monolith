import { useState } from "react";
import type { Mode } from "../api/client";

const MODE_LABEL: Record<Mode, string> = {
  OFF: "OFF",
  PAPER: "PAPER",
  LIVE_CONFIRM: "LIVE-CONFIRM",
  LIVE_AUTO: "LIVE-AUTO",
};

/** Typed-confirm + step-up modal for dangerous actions (KILL, live promotion, exports). */
export function ConfirmDanger({
  title,
  expectPhrase,
  onConfirm,
  onClose,
}: {
  title: string;
  expectPhrase: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = typed.trim() === expectPhrase;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,.45)",
        display: "grid", placeItems: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "var(--red)" }}>{title}</h3>
        <p className="sub">
          Step-up required. Type <b>{expectPhrase}</b> to proceed. This is audited.
        </p>
        <div className="field">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={expectPhrase} autoFocus />
        </div>
        {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger"
            disabled={!ok || busy}
            style={{ opacity: ok ? 1 : 0.5 }}
            onClick={async () => {
              setBusy(true);
              setErr("");
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span className={`mode-badge mode-${mode}`}>
      <span className="dot" />
      {MODE_LABEL[mode]}
    </span>
  );
}
