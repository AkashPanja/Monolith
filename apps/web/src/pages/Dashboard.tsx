import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/mock";
import type { Position, Proposal } from "../api/client";
import { ContentHead } from "../shell/Shell";
import { DashSearch, Hero, SoftCard, Tabs } from "../components/neo/Dash";
import { inr } from "../components/CountUp";

type Tab = "Positions" | "Proposals" | "Orders";

export function Dashboard() {
  const [pnl, setPnl] = useState({ gross: 0, charges: 0, net: 0 });
  const [positions, setPositions] = useState<Position[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tab, setTab] = useState<Tab>("Positions");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.getDayPnl().then(setPnl).catch(() => {});
    api.getPositions().then(setPositions).catch(() => {});
    api.getProposals().then(setProposals).catch(() => {});
  }, []);

  const up = pnl.net >= 0;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (tab === "Positions") {
      return positions
        .filter((p) => !needle || p.symbol.toLowerCase().includes(needle))
        .map((p) => ({
          key: p.symbol,
          cells: [p.symbol, String(p.qty), p.avgPrice.toFixed(1), p.ltp.toFixed(1),
            `${p.pnl >= 0 ? "+" : ""}${p.pnl}`],
          tone: p.pnl >= 0,
        }));
    }
    return proposals
      .filter((p) => !needle || p.symbol.toLowerCase().includes(needle))
      .map((p) => ({
        key: p.id,
        cells: [p.symbol, p.side, String(p.entry), String(p.stopLoss), String(p.target), p.confidence.toFixed(2)],
        tone: p.side === "BUY",
      }));
  }, [tab, q, positions, proposals]);

  const head = tab === "Positions"
    ? ["Symbol", "Qty", "Avg", "LTP", "P&L"]
    : ["Symbol", "Side", "Entry", "SL", "Target", "Conf"];

  return (
    <>
      <ContentHead title="Dashboard" sub="All your plans, positions and limits — intraday, MIS, paper-first." />
      <Hero
        label="Net P&L today"
        value={inr(pnl.net)}
        delta={`${up ? "+" : ""}${pnl.gross === 0 ? 0 : Math.round((pnl.net / Math.max(1, Math.abs(pnl.gross))) * 100)}% net of charges`}
        deltaDown={!up}
        action={
          <Link to="/reports" className="neo-link">
            See Report <span aria-hidden>→</span>
          </Link>
        }
      />
      <h2 style={{ margin: "22px 2px 0", fontSize: 21, fontWeight: 650 }}>Positions</h2>
      <Tabs tabs={["Positions", "Proposals", "Orders"]} active={tab} onPick={(t) => setTab(t as Tab)} />
      <DashSearch value={q} onChange={setQ} />
      <div style={{ marginTop: 14 }}>
        <SoftCard pad={8}>
          {tab === "Orders" ? (
            <p style={{ padding: "18px 14px", color: "var(--neo-ink-2)", fontSize: 13.5, margin: 0 }}>
              No orders yet today. Approved proposals appear here with idempotency keys and fill states.
            </p>
          ) : (
            <table className="dtable">
              <thead>
                <tr>{head.map((h) => <th key={h} style={h === head[head.length - 1] ? { textAlign: "right" } : undefined}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    {r.cells.map((c, i) => (
                      <td
                        key={i}
                        className={i === 0 ? undefined : "num"}
                        style={i === r.cells.length - 1 ? { color: r.tone ? "var(--neo-green)" : "var(--neo-red)", fontWeight: 650, textAlign: "right" } : undefined}
                      >
                        {i === 0 ? <b>{c}</b> : c}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={head.length} style={{ color: "var(--neo-ink-3)", fontSize: 13 }}>Nothing matches.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </SoftCard>
      </div>
    </>
  );
}
