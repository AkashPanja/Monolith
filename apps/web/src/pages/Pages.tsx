import { useEffect, useState } from "react";
import { api } from "../api/mock";
import type { Proposal } from "../api/client";

/** Shared guided-empty + section header for stub pages. */
export function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 4px" }}>{title}</h2>
      <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13.5 }}>{sub}</p>
    </div>
  );
}

export function Empty({ glyph, what, next }: { glyph: string; what: string; next: string }) {
  return (
    <div className="card empty">
      <div className="glyph">{glyph}</div>
      <b>{what}</b>
      <p style={{ fontSize: 13 }}>{next}</p>
    </div>
  );
}

export function Plan() {
  const [rows, setRows] = useState<Proposal[]>([]);
  useEffect(() => { api.getProposals().then(setRows).catch(() => {}); }, []);
  return (
    <>
      <PageHead title="Plan & Proposals" sub="08:30 plan · gate decisions with reasons." />
      <div className="card">
        <h3>Today's proposals</h3>
        <p className="sub">Qty from sizer · SL mandatory · cost-filtered (P1)</p>
        <table className="dtable">
          <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>SL</th><th>Target</th><th>Conf</th><th>Rationale</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.symbol}</b></td>
                <td className={r.side === "BUY" ? "pos" : "neg"}>{r.side}</td>
                <td className="num">{r.entry}</td><td className="num">{r.stopLoss}</td>
                <td className="num">{r.target}</td><td className="num">{r.confidence.toFixed(2)}</td>
                <td style={{ whiteSpace: "normal", minWidth: 220 }}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Trading() {
  return (
    <>
      <PageHead title="Trading" sub="Paper / Live tabs · approvals · order events." />
      <Empty glyph="📊" what="No live session yet" next="Paper trade first — the Live tab unlocks after the promotion checklist passes." />
    </>
  );
}
export function Journal() {
  return (
    <>
      <PageHead title="Journal" sub="Mover flags + T+1/T+3 follow-ups." />
      <Empty glyph="📓" what="Journal is empty" next="Mover marking runs at 16:00 after close. Flags appear here with cause, levels, and what to watch." />
    </>
  );
}
export function Performance() {
  return (
    <>
      <PageHead title="Performance" sub="Expectancy, drawdown, cost waterfall." />
      <Empty glyph="📈" what="Not enough trades yet" next="Needs ≥50 trades before expectancy is statistically meaningful. Paper soak in progress." />
    </>
  );
}
export function Reports() {
  return (
    <>
      <PageHead title="Reports" sub="EOD / weekly / monthly snapshots + trades CSV." />
      <Empty glyph="🧾" what="No reports yet" next="The 16:30 EOD job produces the first report: gross/charges/net, trades, limit use, movers." />
    </>
  );
}
export function Risk() {
  return (
    <>
      <PageHead title="Risk & Limits" sub="Caps, P&L guards, gap-risk disclaimer." />
      <div className="card">
        <h3>Gap-risk disclaimer</h3>
        <p className="sub">Stops can gap through. Worst-case order loss is bounded by qty × (entry − SL) plus a gap buffer — never assume the printed SL is the max loss.</p>
      </div>
    </>
  );
}
export function Settings() {
  return (
    <>
      <PageHead title="Settings" sub="Limits decrease immediately, increases next trading day + step-up." />
      <div className="card"><h3>Config versions</h3><p className="sub">Versioned config lands with services/api. Limit changes are audited.</p></div>
    </>
  );
}
export function Audit() {
  return (
    <>
      <PageHead title="Audit & Health" sub="Hash-chained log · job SLOs · heartbeat." />
      <div className="card"><h3>Health</h3><p className="sub">Pre-flight, reconciliation, and dead-man's-switch status will stream here.</p></div>
    </>
  );
}
