import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { Health, HealthStatus, LimitMeter, Mode } from "../api/client";
import { ConfirmDanger, ModeBadge } from "../components/Chrome";
import { CountUp, inr } from "../components/CountUp";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  ["", "Home"],
  ["plan", "Plan & Proposals"],
  ["trading", "Trading"],
  ["journal", "Journal"],
  ["performance", "Performance"],
  ["reports", "Reports"],
  ["risk", "Risk & Limits"],
  ["settings", "Settings"],
  ["audit", "Audit & Health"],
] as const;

function dot(h: Health) {
  return <span className={`hdot ${h}`} title={h} />;
}

export function Shell() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("PAPER");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [pnl, setPnl] = useState({ gross: 0, charges: 0, net: 0 });
  const [limits, setLimits] = useState<LimitMeter[]>([]);
  const [auto, setAuto] = useState(true);
  const [killOpen, setKillOpen] = useState(false);

  useEffect(() => {
    api.getMode().then(setMode);
    api.getHealth().then(setHealth);
    api.getDayPnl().then(setPnl);
    api.getLimits().then(setLimits);
  }, []);

  const live = mode === "LIVE_CONFIRM" || mode === "LIVE_AUTO";

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {live && (
        <div className="live-banner">
          LIVE TRADING — real money. Every order needs approval{mode === "LIVE_AUTO" ? " (AUTO)" : ""}.
        </div>
      )}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(255,255,255,.86)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", flexWrap: "wrap" }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: 17, textDecoration: "none", color: "var(--ink)" }}>
            ◆ Monolith
          </Link>
          <ModeBadge mode={mode} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-2)" }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-trade
          </label>
          <button className="btn btn-danger" style={{ padding: "7px 14px" }} onClick={() => setKillOpen(true)}>
            KILL
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, color: "var(--ink-2)" }}>
            {health ? (
              <>
                <span>Broker {dot(health.broker)}</span>
                <span>Feed {dot(health.feed)}</span>
                <span>LLM {dot(health.llm)}</span>
                <span>WA {dot(health.whatsapp)}</span>
              </>
            ) : (
              <span className="skeleton" style={{ width: 180, height: 12 }} />
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>
              P&L <b className={pnl.net >= 0 ? "pos" : "neg"}>
                <CountUp value={pnl.net} format={inr} />
              </b>
            </span>
            <button
              className="btn btn-ghost" style={{ padding: "7px 12px" }}
              onClick={() => { logout(); nav("/login"); }}
            >
              Logout
            </button>
          </div>
        </div>
        {limits.length > 0 && (
          <div style={{ display: "flex", gap: 18, padding: "0 18px 10px", flexWrap: "wrap" }}>
            {limits.map((l) => (
              <div key={l.name} style={{ minWidth: 130, flex: "1 1 130px", maxWidth: 220 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-2)" }}>
                  <span>{l.name}</span><span className="num">{Math.round(l.usedPct)}%</span>
                </div>
                <div className={`meter ${l.usedPct >= 90 ? "crit" : l.usedPct >= 80 ? "hot" : ""}`}>
                  <span style={{ width: `${Math.min(100, l.usedPct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav
          style={{
            width: 208, flexShrink: 0, padding: "14px 10px",
            borderRight: "1px solid var(--line)", background: "rgba(255,255,255,.6)",
            display: "flex", flexDirection: "column", gap: 2,
          }}
        >
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === ""}
              style={({ isActive }) => ({
                padding: "9px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--blue)" : "var(--ink-2)", textDecoration: "none",
                background: isActive ? "rgba(37,99,235,.1)" : "transparent",
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, padding: 20, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
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
