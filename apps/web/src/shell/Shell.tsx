import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { LimitMeter, Mode } from "../api/client";
import { ModeBadge, isLiveMode } from "../components/ui/ModeBadge";
import { RiskMeter } from "../components/ui/RiskMeter";
import { PnLCard, PositionsList } from "../components/efer/Blocks";
import { SideNav, type NavEntry } from "../components/efer/SideNav";
import { useAuth } from "../auth/AuthContext";
import "../theme/efer.css";

const NAV: NavEntry[] = [
  { to: "/", icon: "home", label: "Overview", end: true },
  { to: "/plan", icon: "clipboardCheck", label: "Proposals" },
  { to: "/trading", icon: "send", label: "Trading" },
  { to: "/performance", icon: "chart", label: "My Stats" },
  { to: "/journal", icon: "book", label: "Journal" },
  { to: "/reports", icon: "fileChart", label: "Reports" },
];

const BOTTOM: NavEntry[] = [
  { to: "/risk", icon: "shield", label: "Risk & Limits" },
  { to: "/settings", icon: "gear", label: "Settings" },
  { to: "/audit", icon: "activity", label: "Audit & Health" },
];

const RISK_HELP: Record<string, string> = {
  "Daily loss": "Cap: 2% of capital",
  Positions: "Share of the position cap in use",
  "Orders / day": "Share of the daily order cap in use",
  "Symbol exposure": "Largest single-symbol share of capital in use",
};

function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e instanceof Error ? e : new Error("Failed to load."));
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  const retry = () => setNonce((n) => n + 1);
  return { data, loading, error, retry };
}

export function Shell() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const killRef = useRef<HTMLDialogElement>(null);
  const [phrase, setPhrase] = useState("");
  const [killErr, setKillErr] = useState("");
  const [killBusy, setKillBusy] = useState(false);

  const modeQ = useAsync(() => api.getMode());
  const pnlQ = useAsync(() => api.getDayPnl());
  const posQ = useAsync(() => api.getPositions());
  const limQ = useAsync(() => api.getLimits());
  const propQ = useAsync(() => api.getProposals());

  const mode: Mode = modeQ.data ?? "PAPER";
  const live = isLiveMode(mode);
  const pending = propQ.data?.length ?? 0;
  const navEntries = NAV.map((e) =>
    e.to === "/plan"
      ? {
          ...e,
          count: pending,
          badgeTooltip: `${pending} proposal${pending === 1 ? "" : "s"} awaiting review`,
        }
      : e
  );

  const openKill = () => {
    setPhrase("");
    setKillErr("");
    killRef.current?.showModal();
  };
  const confirmKill = async () => {
    if (phrase.trim() !== "HALT ALL" || killBusy) return;
    setKillBusy(true);
    setKillErr("");
    try {
      await api.kill("dashboard kill", "HALT ALL");
      killRef.current?.close();
      modeQ.retry();
    } catch (e) {
      setKillErr(e instanceof Error ? e.message : "Kill failed.");
    } finally {
      setKillBusy(false);
    }
  };

  return (
    <div className="efer" data-mode={live ? "live" : "paper"}>
      {live && (
        <div className="live-banner">
          LIVE TRADING — real money. Every order needs approval
          {mode === "LIVE_AUTO" ? " (AUTO)" : ""}.
        </div>
      )}
      <div className="efer-shell">
        <SideNav entries={navEntries} bottom={BOTTOM} brand="monolith" />

        <aside className="efer-mid" aria-label="Positions and risk">
          <div className="efer-rowhead">
            <h2 className="efer-h">Your positions</h2>
          </div>
          {pnlQ.data && (
            <PnLCard
              net={pnlQ.data.net}
              gross={pnlQ.data.gross}
              charges={pnlQ.data.charges}
            />
          )}
          <PositionsList
            positions={posQ.data ?? []}
            loading={posQ.loading}
            error={posQ.error}
            onRetry={posQ.retry}
            emptyText="Approved proposals appear here once the worker runs."
          />
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--efer-line)",
              margin: "18px 0 8px",
            }}
          />
          {(limQ.data ?? []).map((l: LimitMeter) => (
            <RiskMeter
              key={l.name}
              label={l.name}
              pct={l.usedPct}
              help={RISK_HELP[l.name] ?? "Share of this limit in use"}
            />
          ))}
          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            <button onClick={openKill} className="efer-kill">
              ⏻ KILL — halt everything
            </button>
            <button
              onClick={() => {
                logout();
                nav("/login");
              }}
              className="efer-pill-btn"
              style={{ padding: "11px 0" }}
            >
              Logout
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <ModeBadge mode={mode} />
          </div>
        </aside>

        <main className="efer-main">
          <div className="page" key={window.location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      <dialog ref={killRef} className="kill-dialog" aria-labelledby="kill-title">
        <h2 id="kill-title">Activate kill switch?</h2>
        <ul>
          <li>Set trading mode to OFF — no new orders are placed</li>
          <li>Flag the session as killed (resume needs step-up auth)</li>
          <li>Open positions are NOT auto-squared by this action</li>
        </ul>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="kill-phrase">Type HALT ALL to confirm</label>
          <input
            id="kill-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="HALT ALL"
            autoComplete="off"
            style={{
              width: "100%",
              border: "1px solid var(--efer-line)",
              borderRadius: 10,
              padding: "11px 12px",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
        </div>
        {killErr && (
          <p role="alert" style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 6px" }}>
            {killErr}
          </p>
        )}
        <div className="row">
          <button className="cancel" onClick={() => killRef.current?.close()}>
            Cancel
          </button>
          <button
            className="hold"
            disabled={phrase.trim() !== "HALT ALL" || killBusy}
            style={{ opacity: phrase.trim() !== "HALT ALL" || killBusy ? 0.5 : 1 }}
            onClick={confirmKill}
          >
            {killBusy ? "Halting…" : "Confirm KILL"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="efer-rowhead">
      <div>
        <h1 className="efer-h">{title}</h1>
        {sub && <div className="efer-sub" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>{right}</div>
    </div>
  );
}
