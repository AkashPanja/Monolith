import { useEffect, useState } from "react";
import { ModeBadge } from "./ModeBadge";
import { KillSwitch } from "./Kill";
import type { Mode } from "../../api/client";

export type MarketState = "open" | "closed" | "pre-open";

/** NSE equity hours in IST (Mon–Fri): pre-open 09:00–09:15, open 09:15–15:30. */
export function marketStateAt(d: Date): MarketState {
  const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
  const day = ist.getDay();
  if (day === 0 || day === 6) return "closed";
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (mins >= 540 && mins < 555) return "pre-open";
  if (mins >= 555 && mins < 930) return "open";
  return "closed";
}

export function istClock(d: Date): string {
  const ist = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
  const hh = String(ist.getHours()).padStart(2, "0");
  const mm = String(ist.getMinutes()).padStart(2, "0");
  const ss = String(ist.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} IST`;
}

export function MarketStatus({ now }: { now: Date }) {
  const state = marketStateAt(now);
  const label = state === "open" ? "Market open" : state === "pre-open" ? "Pre-open" : "Market closed";
  return (
    <span className="market-chip" data-state={state} role="status">
      <i className="mdot" aria-hidden="true" />
      {label} · <span className="tnum">{istClock(now)}</span>
    </span>
  );
}

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  return s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

export function UserMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="user-menu">
      <button
        className="user-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        {name}
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar(p: {
  title: string;
  mode: Mode;
  brokerOk: boolean;
  lastUpdated: number | null;
  onKillConfirm: () => void;
  onToggleRail: () => void;
  railOpen: boolean;
  user: { name: string };
  onLogout: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="topbar">
      <h1>{p.title}</h1>
      <div className="topbar-right">
        <MarketStatus now={now} />
        <span className="broker-chip" data-ok={p.brokerOk} role="status">
          <i className="mdot" aria-hidden="true" />
          {p.brokerOk ? "Broker connected" : "Broker offline"}
          {p.lastUpdated !== null && (
            <small> · updated {ago(p.lastUpdated, now.getTime())}</small>
          )}
        </span>
        <ModeBadge mode={p.mode} />
        <button
          className="icon-btn"
          aria-label={p.railOpen ? "Hide positions panel" : "Show positions panel"}
          aria-pressed={p.railOpen}
          onClick={p.onToggleRail}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 5h16v14H4zM9 5v14" />
          </svg>
        </button>
        <KillSwitch
          onConfirm={p.onKillConfirm}
          consequences={[
            "Set trading mode to OFF — no new orders are placed",
            "Flag the session as killed (resume needs step-up auth)",
            "Open positions are NOT auto-squared by this action",
          ]}
        />
        <UserMenu name={p.user.name} onLogout={p.onLogout} />
      </div>
    </header>
  );
}
