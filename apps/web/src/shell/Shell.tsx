import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { LimitMeter, Mode } from "../api/client";
import { isLiveMode } from "../components/ui/ModeBadge";
import { RiskMeter } from "../components/ui/RiskMeter";
import { TopBar } from "../components/ui/TopBar";
import { PnLCard, PositionsList } from "../components/efer/Blocks";
import { SideNav, type NavEntry } from "../components/efer/SideNav";
import { useAuth } from "../auth/AuthContext";
import "../theme/efer.css";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/plan": "Proposals",
  "/trading": "Trading",
  "/journal": "Journal",
  "/performance": "My Stats",
  "/reports": "Reports",
  "/risk": "Risk & Limits",
  "/settings": "Settings",
  "/audit": "Audit & Health",
};

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
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, retry };
}

function setupUsername(): string {
  try {
    const raw = localStorage.getItem("monolith_setup_data");
    if (!raw) return "Owner";
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username || "Owner";
  } catch {
    return "Owner";
  }
}

const RAIL_KEY = "monolith.rail.open";

export function Shell() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [railOpen, setRailOpen] = useState(() => localStorage.getItem(RAIL_KEY) !== "0");
  const [healthAt, setHealthAt] = useState<number | null>(null);

  const modeQ = useAsync(() => api.getMode());
  const healthQ = useAsync(() => api.getHealth());
  const pnlQ = useAsync(() => api.getDayPnl());
  const posQ = useAsync(() => api.getPositions());
  const limQ = useAsync(() => api.getLimits());
  const propQ = useAsync(() => api.getProposals());

  useEffect(() => {
    if (!healthQ.loading) setHealthAt(Date.now());
  }, [healthQ.loading]);

  useEffect(() => {
    localStorage.setItem(RAIL_KEY, railOpen ? "1" : "0");
  }, [railOpen]);

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

  const kill = async () => {
    await api.kill("dashboard kill", "HALT ALL");
    modeQ.retry();
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

        <aside
          className={`efer-mid right-rail${railOpen ? " open" : " closed"}`}
          aria-label="Positions and risk"
          aria-hidden={!railOpen}
        >
          {railOpen && (
            <>
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
            </>
          )}
        </aside>

        <main className="efer-main">
          <TopBar
            title={TITLES[location.pathname] ?? "Overview"}
            mode={mode}
            brokerOk={healthQ.data?.broker === "ok"}
            lastUpdated={healthAt}
            onKillConfirm={kill}
            onToggleRail={() => setRailOpen((o) => !o)}
            railOpen={railOpen}
            user={{ name: setupUsername() }}
            onLogout={() => {
              logout();
              nav("/login");
            }}
          />
          <div className="page" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
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

// PageHead stays here so page modules keep a single shell import site.
