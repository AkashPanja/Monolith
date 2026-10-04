import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/mock";
import type { Position, Proposal } from "../api/client";
import { PageHead } from "../shell/Shell";
import { ActivityItem, MiniChart } from "../components/efer/Blocks";
import { fmtINR } from "../utils/fmt";
import { E, eicons } from "../components/efer/eicons";

const TILE_COLORS = ["#2b2b4a", "#6c5ce7", "#e05757", "#3fa66a"];

export function Dashboard() {
  const [pnl, setPnl] = useState({ gross: 0, charges: 0, net: 0 });
  const [positions, setPositions] = useState<Position[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTile, setActiveTile] = useState("Square-off");

  useEffect(() => {
    api.getDayPnl().then(setPnl).catch(() => {});
    api.getPositions().then(setPositions).catch(() => {});
    api.getProposals().then(setProposals).catch(() => {});
  }, []);

  const curve = [4, 5, 6, 5.2, 6.4, 6.1, 7.2, 6.6, 7.8, 8.4, 7.9, 8.8, 8.2, 9.0, 8.6, 9.4];
  const tiles = [
    { label: "Square-off", icon: "check" as const, to: "/trading" },
    { label: "Approve", icon: "up" as const, to: "/plan" },
    { label: "Kill", icon: "power" as const, to: "/risk" },
    { label: "Reports", icon: "book" as const, to: "/reports" },
  ];

  return (
    <>
      <PageHead title="Quick actions" sub="Intraday controls — MIS square-off 15:10." />
      <div className="efer-tiles">
        {tiles.map((t, i) => (
          <Link key={t.label} to={t.to} style={{ textDecoration: "none" }}>
            <button className={`efer-tile${activeTile === t.label ? " active" : ""}`} onClick={() => setActiveTile(t.label)}>
              <span className="av" style={{ background: TILE_COLORS[i % TILE_COLORS.length] }}>
                <E d={eicons[t.icon]} size={20} />
              </span>
              {t.label}
            </button>
          </Link>
        ))}
      </div>

      <div className="efer-rowhead">
        <h2 className="efer-h">Balance change <span style={{ fontSize: 13, fontWeight: 400, color: "var(--efer-ink-2)" }}>today</span></h2>
        <Link to="/performance"><button className="efer-pill-btn">See my stat</button></Link>
      </div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <span style={{
          position: "absolute", left: "18%", top: -8, background: "#2b2b4a", color: "#fff",
          fontSize: 12, fontWeight: 650, borderRadius: 8, padding: "4px 10px", zIndex: 1,
        }}>
          {fmtINR(pnl.net)}
        </span>
        <div style={{ paddingTop: 26 }}>
          <MiniChart points={curve} mark={3} />
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--efer-ink-2)", marginTop: -6 }}>
          <span style={{ background: "#f4f4f7", borderRadius: 6, padding: "2px 10px" }}>09:15 - Open</span>
        </div>
      </div>

      <div className="efer-rowhead" style={{ marginTop: 24 }}>
        <h2 className="efer-h">Recent activity</h2>
        <Link to="/trading"><button className="efer-pill-btn">Show all</button></Link>
      </div>
      <div style={{ fontSize: 13, color: "var(--efer-ink)", fontWeight: 600, marginBottom: 4 }}>Today</div>
      {positions.map((p) => (
        <ActivityItem
          key={p.symbol}
          icon={p.pnl >= 0 ? "down" : "up"}
          title={`${p.symbol} × ${p.qty}`}
          sub={p.pnl >= 0 ? "Holding" : "Holding"}
          amount={`${p.pnl >= 0 ? "+" : ""}${p.pnl} INR`}
          down={p.pnl < 0}
        />
      ))}
      {proposals.map((p) => (
        <ActivityItem
          key={p.id}
          icon="send"
          title={`${p.side} ${p.symbol}`}
          sub="Proposed · awaiting gate"
          amount={`SL ${p.stopLoss}`}
        />
      ))}
      {positions.length === 0 && proposals.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--efer-ink-3)" }}>No activity yet today.</p>
      )}
    </>
  );
}
