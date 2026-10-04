import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { Health, HealthStatus, LimitMeter, Mode } from "../api/client";
import { ConfirmDanger, ModeBadge } from "../components/Chrome";
import { I, icons } from "../components/neo/icons";
import { Rail } from "../components/neo/Rail";
import { DocTree, Section, SideItem, SideSearch, type TreeNode } from "../components/neo/Sidebar";
import { useAuth } from "../auth/AuthContext";
import "../theme/neo.css";

const DOCS: TreeNode[] = [
  {
    label: "EOD Reports", count: 12, children: [
      { label: "This week", count: 2 },
      { label: "Trade ledger", count: 4 },
      { label: "Charges split", count: 3 },
      { label: "Fundamentals", count: 4, active: true },
      { label: "Audit log", count: 5 },
    ],
  },
];

function dot(h: Health) {
  return <span className={`hdot ${h}`} title={h} />;
}

export function Shell() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("PAPER");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [limits, setLimits] = useState<LimitMeter[]>([]);
  const [pending, setPending] = useState(0);
  const [q, setQ] = useState("");
  const [killOpen, setKillOpen] = useState(false);

  useEffect(() => {
    api.getMode().then(setMode).catch(() => {});
    api.getHealth().then(setHealth).catch(() => {});
    api.getLimits().then(setLimits).catch(() => {});
    api.getProposals().then((r) => setPending(r.length)).catch(() => {});
  }, []);

  const live = mode === "LIVE_CONFIRM" || mode === "LIVE_AUTO";
  const email = localStorage.getItem("monolith_setup_data") || "";

  return (
    <div className="neo-bg" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {live && (
        <div className="live-banner">
          LIVE TRADING — real money. Every order needs approval{mode === "LIVE_AUTO" ? " (AUTO)" : ""}.
        </div>
      )}
      <div style={{ flex: 1, display: "flex", gap: 14, padding: 18, minHeight: 0 }}>
        {/* icon rail + settings strip */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ flex: 1, display: "flex" }}>
            <Rail
              bottom={
                <button
                  onClick={() => setKillOpen(true)}
                  title="KILL — halt everything"
                  style={{
                    width: 40, height: 40, display: "grid", placeItems: "center",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: "rgba(220,38,38,.18)", color: "#ff8a8a",
                  }}
                >
                  <I d={icons.power} size={18} />
                </button>
              }
            />
          </div>
          <div
            style={{
              background: "var(--neo-rail)", borderRadius: 18, padding: "12px 0",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 8.5, letterSpacing: ".18em", color: "#71717a", writingMode: "vertical-rl" }}>
              RISK SETTINGS
            </span>
            <NavLink
              to="/settings"
              title="Settings"
              style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, background: "#ececf0", color: "#17171a" }}
            >
              <I d={icons.gear} size={18} />
            </NavLink>
          </div>
        </div>

        {/* sidebar */}
        <aside className="neo-panel" style={{ width: 300, flexShrink: 0, padding: "16px 10px 14px", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 7, padding: "2px 14px 12px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px 4px" }}>
            <span
              style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#3a3a40,#17171a)", color: "#fff",
                display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15,
              }}
            >
              O
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 650 }}>
                Owner <span style={{ color: "var(--neo-ink-3)" }}>⌄</span>
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--neo-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(() => { try { return JSON.parse(email).email; } catch { return "owner · paper"; } })()}
              </span>
            </span>
          </div>

          <Section title="Projects">
            <SideItem to="/" end icon="list" label="Dashboard" count={pending} />
            <SideItem to="/plan" icon="card" label="Plan & Proposals" />
            <SideItem to="/trading" icon="share" label="Trading" />
            <SideItem to="/performance" icon="spark" label="Performance" />
          </Section>

          <Section title="Status">
            <SideItem to="/trading" icon="target" label="Pending approval" count={pending} />
            <SideItem to="/journal" icon="bell" label="Movers" count={0} />
            <SideItem to="/audit" icon="users" label="Audit & Health" />
          </Section>

          <Section title="History">
            <SideItem to="/journal" icon="clock" label="Journal" />
            <SideItem to="/reports" icon="box" label="Reports" />
          </Section>

          <Section title="Documents" action={<I d={icons.plus} size={14} />}>
            <SideSearch value={q} onChange={setQ} />
            <DocTree nodes={q ? DOCS.filter((d) => d.label.toLowerCase().includes(q.toLowerCase())) : DOCS} />
          </Section>

          <div style={{ margin: "18px 14px 0", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ModeBadge mode={mode} />
              <span style={{ fontSize: 11.5, color: "var(--neo-ink-2)" }}>
                {health ? (
                  <>B {dot(health.broker)} F {dot(health.feed)} L {dot(health.llm)} W {dot(health.whatsapp)}</>
                ) : "…"}
              </span>
            </div>
            {limits.slice(0, 2).map((l) => (
              <div key={l.name} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--neo-ink-2)" }}>
                  <span>{l.name}</span><span>{Math.round(l.usedPct)}%</span>
                </div>
                <div className={`meter${l.usedPct >= 90 ? " crit" : l.usedPct >= 80 ? " hot" : ""}`}>
                  <span style={{ width: `${Math.min(100, l.usedPct)}%` }} />
                </div>
              </div>
            ))}
            <button
              className="neo-item"
              onClick={() => { logout(); nav("/login"); }}
              style={{ marginTop: 6 }}
            >
              <I d={icons.power} /> <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* content */}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "6px 6px 6px 2px" }}>
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

export function ContentHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "2px 2px 16px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 650, letterSpacing: "-0.01em" }}>{title}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--neo-ink-2)" }}>{sub}</p>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        {right}
        <Link to="/risk" style={{ textDecoration: "none" }}>
          <span className="neo-link" style={{ marginTop: 0 }}>Risk & Limits →</span>
        </Link>
      </div>
    </div>
  );
}
