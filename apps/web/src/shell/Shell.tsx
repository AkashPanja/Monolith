import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { LimitMeter, Mode, Position } from "../api/client";
import { ConfirmDanger, ModeBadge } from "../components/Chrome";
import { AcctRow, HeroCard, LimitRow, inr0 } from "../components/efer/Blocks";
import { SideNav, type NavEntry } from "../components/efer/SideNav";
import { useAuth } from "../auth/AuthContext";
import "../theme/efer.css";

const NAV: NavEntry[] = [
  { to: "/", icon: "home", label: "Overview", end: true },
  { to: "/plan", icon: "wallet", label: "Plan & Proposals" },
  { to: "/trading", icon: "send", label: "Trading" },
  { to: "/performance", icon: "chart", label: "My stat" },
  { to: "/journal", icon: "book", label: "Journal" },
  { to: "/reports", icon: "card", label: "Reports" },
];

const BOTTOM: NavEntry[] = [
  { to: "/risk", icon: "shield", label: "Risk & Limits" },
  { to: "/settings", icon: "gear", label: "Settings" },
  { to: "/audit", icon: "user", label: "Audit & Health" },
];

export function Shell() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("PAPER");
  const [pnl, setPnl] = useState({ gross: 0, charges: 0, net: 0 });
  const [positions, setPositions] = useState<Position[]>([]);
  const [limits, setLimits] = useState<LimitMeter[]>([]);
  const [pending, setPending] = useState(0);
  const [killOpen, setKillOpen] = useState(false);

  useEffect(() => {
    api.getMode().then(setMode).catch(() => {});
    api.getDayPnl().then(setPnl).catch(() => {});
    api.getPositions().then(setPositions).catch(() => {});
    api.getLimits().then(setLimits).catch(() => {});
    api.getProposals().then((r) => setPending(r.length)).catch(() => {});
  }, []);

  const live = mode === "LIVE_CONFIRM" || mode === "LIVE_AUTO";
  const navEntries = NAV.map((e) => (e.to === "/plan" ? { ...e, count: pending } : e));
  const dayLoss = limits.find((l) => l.name === "Daily loss");
  const posCap = limits.find((l) => l.name === "Positions");

  return (
    <div className="efer">
      {live && (
        <div className="live-banner">
          LIVE TRADING — real money. Every order needs approval{mode === "LIVE_AUTO" ? " (AUTO)" : ""}.
        </div>
      )}
      <div className="efer-shell">
        <SideNav entries={navEntries} bottom={BOTTOM} brand="monolith" />

        <div className="efer-mid">
          <div className="efer-rowhead">
            <h2 className="efer-h">Your positions</h2>
          </div>
          <HeroCard
            label="Net P&L today"
            amount={inr0(pnl.net)}
            mode={mode.replace("_", "-")}
            sub={`Gross ${inr0(pnl.gross)} · charges ${inr0(pnl.charges)}`}
          />
          {positions.map((p) => (
            <AcctRow
              key={p.symbol}
              amount={`${p.symbol} ${p.qty}`}
              ccy={`₹${p.ltp.toFixed(1)}`}
              tail={`${p.pnl >= 0 ? "+" : ""}${p.pnl}`}
            />
          ))}
          <hr style={{ border: "none", borderTop: "1px solid var(--efer-line)", margin: "18px 0 8px" }} />
          <LimitRow
            title="Daily loss used"
            used={`${Math.round(dayLoss?.usedPct ?? 0)}%`}
            total="2% cap"
            dark={mode !== "PAPER"}
          />
          <LimitRow
            title="Positions used"
            used={`${positions.length}`}
            total={`${posCap ? Math.round((posCap.usedPct / 100) * 5) + positions.length : 5} max`}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setKillOpen(true)}
              style={{
                flex: 1, border: "none", borderRadius: 10, padding: "11px 0",
                background: "#2b2b4a", color: "#fff", fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", fontSize: 13.5,
              }}
            >
              ⏻ KILL
            </button>
            <button
              onClick={() => { logout(); nav("/login"); }}
              className="efer-pill-btn"
              style={{ flex: 1, padding: "11px 0" }}
            >
              Logout
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <ModeBadge mode={mode} />
          </div>
        </div>

        <main className="efer-main">
          <div className="page" key={window.location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {killOpen && (
        <ConfirmDanger
          title="KILL — halt everything"
          expectPhrase="HALT ALL"
          onClose={() => setKillOpen(false)}
          onConfirm={async () => {
            await api.kill("dashboard kill", "HALT ALL");
            setMode("OFF");
          }}
        />
      )}
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

