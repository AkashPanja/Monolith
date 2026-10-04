import { useEffect, useState } from "react";
import { api } from "../api/mock";
import type { Proposal } from "../api/client";
import { ContentHead } from "../shell/Shell";
import { DashSearch, SoftCard, Tabs } from "../components/neo/Dash";

export function Empty({ glyph, what, next }: { glyph: string; what: string; next: string }) {
  return (
    <SoftCard>
      <div style={{ textAlign: "center", padding: "30px 18px", color: "var(--neo-ink-2)" }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>{glyph}</div>
        <b style={{ color: "var(--neo-ink)" }}>{what}</b>
        <p style={{ fontSize: 13, margin: "8px 0 0" }}>{next}</p>
      </div>
    </SoftCard>
  );
}

export function Plan() {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { api.getProposals().then(setRows).catch(() => {}); }, []);
  const filtered = rows.filter((r) => !q.trim() || r.symbol.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <ContentHead title="Plan & Proposals" sub="08:30 plan · gate decisions with reasons." />
      <DashSearch value={q} onChange={setQ} />
      <div style={{ marginTop: 14 }}>
        <SoftCard pad={8}>
          <table className="dtable">
            <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>SL</th><th>Target</th><th>Conf</th><th>Rationale</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.symbol}</b></td>
                  <td style={{ color: r.side === "BUY" ? "var(--neo-green)" : "var(--neo-red)", fontWeight: 650 }}>{r.side}</td>
                  <td className="num">{r.entry}</td><td className="num">{r.stopLoss}</td>
                  <td className="num">{r.target}</td><td className="num">{r.confidence.toFixed(2)}</td>
                  <td style={{ whiteSpace: "normal", minWidth: 220 }}>{r.reason}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ color: "var(--neo-ink-3)", fontSize: 13 }}>No proposals match.</td></tr>
              )}
            </tbody>
          </table>
        </SoftCard>
        <p style={{ fontSize: 12, color: "var(--neo-ink-3)", margin: "10px 4px 0" }}>
          Qty from sizer · SL mandatory · cost-filtered (P1) · threshold-gated (P2)
        </p>
      </div>
    </>
  );
}

export function Trading() {
  const [tab, setTab] = useState("Paper");
  return (
    <>
      <ContentHead title="Trading" sub="Paper / Live tabs · approvals · order events." />
      <Tabs tabs={["Paper", "Live"]} active={tab} onPick={setTab} />
      <div style={{ marginTop: 14 }}>
        {tab === "Paper" ? (
          <Empty glyph="📊" what="Paper session quiet" next="Approved proposals flow here with idempotency keys and fill states once the worker runs." />
        ) : (
          <Empty glyph="🔒" what="Live is locked" next="Live unlocks after the promotion checklist passes: 20 days, 50 trades, positive expectancy, zero breaches." />
        )}
      </div>
    </>
  );
}

export function Journal() {
  return (
    <>
      <ContentHead title="Journal" sub="Mover flags + T+1/T+3 follow-ups." />
      <Empty glyph="📓" what="Journal is empty" next="Mover marking runs at 16:00 after close. Flags appear here with cause, levels, and what to watch." />
    </>
  );
}

export function Performance() {
  const stats: Array<[string, string, string]> = [
    ["Expectancy / trade", "—", "Needs ≥50 trades"],
    ["Win rate", "—", "Paper soak running"],
    ["Max intraday DD", "—", "Guard: 2% daily"],
    ["Profit factor", "—", "Gross vs charges tracked"],
  ];
  return (
    <>
      <ContentHead title="Performance" sub="Expectancy, drawdown, cost waterfall." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {stats.map(([label, v, sub]) => (
          <SoftCard key={label}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 30, fontWeight: 300, marginTop: 6 }}>{v}</div>
            <div style={{ fontSize: 12, color: "var(--neo-ink-2)", marginTop: 4 }}>{sub}</div>
          </SoftCard>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Empty glyph="📈" what="Not enough trades yet" next="Expectancy is reported with 95% CI once the sample is meaningful. Backtest cells are indicative, not proof." />
      </div>
    </>
  );
}

export function Reports() {
  return (
    <>
      <ContentHead title="Reports" sub="EOD / weekly / monthly snapshots + trades CSV." />
      <Empty glyph="🧾" what="No reports yet" next="The 16:30 EOD job produces the first report: gross/charges/net, trades, limit use, movers." />
    </>
  );
}

export function Risk() {
  return (
    <>
      <ContentHead title="Risk & Limits" sub="Caps, P&L guards, gap-risk disclaimer." />
      <SoftCard>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Gap-risk disclaimer</div>
        <p style={{ fontSize: 13, color: "var(--neo-ink-2)", margin: 0, lineHeight: 1.65 }}>
          Stops can gap through. Worst-case order loss is bounded by qty × (entry − SL) plus a 1% gap
          buffer — never assume the printed SL is the maximum loss. The gate counts this worst case
          against daily, weekly and drawdown guards before approving.
        </p>
      </SoftCard>
      <div style={{ marginTop: 14 }}>
        <SoftCard>
          <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Default caps</div>
          <p style={{ fontSize: 13, color: "var(--neo-ink-2)", margin: 0, lineHeight: 1.65 }}>
            10% notional · 0.5% risk-to-stop · 2%/4%/8% daily/weekly/drawdown · 5 positions ·
            30 orders/day · 15%/40% symbol/sector · ≤1% ADV · entry window 09:30–15:00 IST.
          </p>
        </SoftCard>
      </div>
    </>
  );
}

export function Settings() {
  return (
    <>
      <ContentHead title="Settings" sub="Limits decrease immediately, increases next trading day + step-up." />
      <SoftCard>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Config versions</div>
        <p style={{ fontSize: 13, color: "var(--neo-ink-2)", margin: 0, lineHeight: 1.65 }}>
          Versioned config lands with services/api. Every limit change is audited with actor,
          timestamp and previous value. Email/SMTP delivery is configured in the setup wizard.
        </p>
      </SoftCard>
    </>
  );
}

export function Audit() {
  return (
    <>
      <ContentHead title="Audit & Health" sub="Hash-chained log · job SLOs · heartbeat." />
      <SoftCard>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Health</div>
        <p style={{ fontSize: 13, color: "var(--neo-ink-2)", margin: 0, lineHeight: 1.65 }}>
          Pre-flight, reconciliation and the external dead-man's-switch stream here once the
          watchdog and scheduler are online.
        </p>
      </SoftCard>
    </>
  );
}
