import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/mock";
import type { Position, Proposal } from "../api/client";
import { PageHead } from "../shell/Shell";
import { Tabs } from "../components/ui/Tabs";
import { EmptyState, KpiSkeleton, nextEod } from "../components/ui/EmptyState";
import { PositionsList } from "../components/efer/Blocks";
import { fmtINR } from "../utils/fmt";

export function Empty({ what, next }: { glyph?: string; what: string; next: string }) {
  return <EmptyState title={what} description={next} />;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode }) {
  return (
    <table className="efer-table">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "var(--efer-ink-3)", margin: "10px 2px 0" }}>{children}</p>;
}

export function Plan() {
  const [rows, setRows] = useState<Proposal[]>([]);
  useEffect(() => { api.getProposals().then(setRows).catch(() => {}); }, []);
  return (
    <>
      <PageHead title="Plan & Proposals" sub="08:30 plan · gate decisions with reasons." />
      <Table
        head={["Symbol", "Side", "Entry", "SL", "Target", "Conf", "Rationale"]}
        rows={rows.map((r) => (
          <tr key={r.id}>
            <td><b>{r.symbol}</b></td>
            <td style={{ color: r.side === "BUY" ? "var(--efer-green)" : "var(--efer-red)", fontWeight: 650 }}>{r.side}</td>
            <td className="tnum">{fmtINR(r.entry, 2)}</td>
            <td className="tnum">{fmtINR(r.stopLoss, 2)}</td>
            <td className="tnum">{fmtINR(r.target, 2)}</td>
            <td className="tnum">{r.confidence.toFixed(2)}</td>
            <td>{r.reason}</td>
          </tr>
        ))}
      />
      <Note>Qty from sizer · SL mandatory · cost-filtered (P1) · threshold-gated (P2).</Note>
    </>
  );
}

export function Trading() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("paper");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getPositions()
      .then((p) => {
        setPositions(p);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error("Failed to load."));
        setLoading(false);
      });
  };
  useEffect(load, []);
  return (
    <>
      <PageHead
        title="Trading"
        sub="Orders placed from approved proposals."
        right={<Link to="/plan"><button className="efer-pill-btn">Review proposals</button></Link>}
      />
      <Tabs
        label="Trading mode"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "paper", label: "Paper" },
          {
            id: "live",
            label: "Live",
            locked: true,
            hint: "Live unlocks after the promotion checklist — see Risk & Limits",
          },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {tab === "live" ? (
          <EmptyState
            title="Live trading is locked"
            description="Complete the promotion checklist to unlock live orders."
            action={{ label: "View promotion checklist", onClick: () => navigate("/risk") }}
          />
        ) : (
          <>
            <h2 style={{ fontSize: 16, margin: "4px 0 12px" }}>Open positions</h2>
            <PositionsList
              positions={positions}
              loading={loading}
              error={error}
              onRetry={load}
              emptyText="No open positions right now."
            />
            <h2 style={{ fontSize: 16, margin: "20px 0 12px" }}>Today&apos;s orders</h2>
            {/* TODO(backend): today's orders endpoint — scoped empty state only. */}
            <EmptyState
              title="No orders today"
              description={
                positions.length > 0
                  ? `${positions.length} open position${positions.length === 1 ? "" : "s"} carried over. Approved proposals appear here as orders.`
                  : "Approved proposals appear here as orders."
              }
            />
          </>
        )}
      </div>
    </>
  );
}

export function Journal() {
  return (
    <>
      <PageHead title="Journal" sub="Mover flags + T+1/T+3 follow-ups." />
      <Empty what="Journal is empty" next="Mover marking runs at 16:00 after close. Flags appear here with cause, levels, and what to watch." />
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
      <PageHead title="My stat" sub="Expectancy, drawdown, cost waterfall." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {stats.map(([label, v, sub]) => (
          <div key={label} style={{ background: "var(--efer-soft)", borderRadius: 14, padding: "16px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 300, marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 12, color: "var(--efer-ink-2)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Empty what="Not enough trades yet" next="Expectancy is reported with 95% CI once the sample is meaningful." />
      </div>
    </>
  );
}

export function Reports() {
  const [tab, setTab] = useState("eod");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = from || to ? `${from || "…"} → ${to || "…"}` : "all dates";
  return (
    <>
      <PageHead
        title="Reports"
        sub="EOD / weekly / monthly snapshots + trades CSV."
        right={
          <button
            className="efer-pill-btn"
            disabled
            title="Nothing to export yet"
            aria-disabled="true"
          >
            Export CSV
          </button>
        }
      />
      <Tabs
        label="Report type"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "eod", label: "EOD" },
          { id: "weekly", label: "Weekly" },
          { id: "monthly", label: "Monthly" },
        ]}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--text-2)" }}>
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: 13 }}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--text-2)" }}>
          To{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: 13 }}
          />
        </label>
      </div>
      <div style={{ marginTop: 14 }}>
        <EmptyState
          title={tab === "eod" ? "No reports yet" : `No ${tab} reports in range`}
          description={
            tab === "eod"
              ? `The 16:30 IST job produces the first report: gross/charges/net, trades, limit use, movers. Showing ${range}.`
              : `Nothing filed for ${range}. Weekly and monthly reports start after the first EOD run.`
          }
          nextRun={tab === "eod" ? nextEod() : undefined}
          preview={
            <KpiSkeleton
              labels={["Gross", "Charges", "Net", "Trades", "Win rate", "Limit use"]}
            />
          }
        />
      </div>
    </>
  );
}

export function Risk() {
  return (
    <>
      <PageHead title="Risk & Limits" sub="Caps, P&L guards, gap-risk disclaimer." />
      <div style={{ background: "var(--efer-soft)", borderRadius: 14, padding: "18px" }}>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Gap-risk disclaimer</div>
        <p style={{ fontSize: 13, color: "var(--efer-ink-2)", margin: 0, lineHeight: 1.65 }}>
          Stops can gap through. Worst-case order loss is bounded by qty × (entry − SL) plus a 1% gap
          buffer — never assume the printed SL is the maximum loss.
        </p>
      </div>
      <div style={{ background: "var(--efer-soft)", borderRadius: 14, padding: "18px", marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 6 }}>Default caps</div>
        <p style={{ fontSize: 13, color: "var(--efer-ink-2)", margin: 0, lineHeight: 1.65 }}>
          10% notional · 0.5% risk-to-stop · 2%/4%/8% daily/weekly/drawdown · 5 positions ·
          30 orders/day · 15%/40% symbol/sector · ≤1% ADV · entry window 09:30–15:00 IST.
        </p>
      </div>
    </>
  );
}

export function Settings() {
  return (
    <>
      <PageHead title="Settings" sub="Limits decrease immediately, increases next trading day + step-up." />
      <Empty what="Config versions live here" next="Versioned config lands with services/api. Every limit change is audited." />
    </>
  );
}

export function Audit() {
  return (
    <>
      <PageHead title="Audit & Health" sub="Hash-chained log · job SLOs · heartbeat." />
      <Empty what="No audit stream yet" next="Pre-flight, reconciliation and the dead-man's-switch stream here once the watchdog is online." />
    </>
  );
}
