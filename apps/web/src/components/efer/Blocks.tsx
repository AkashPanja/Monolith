import { useRef, useState } from "react";
import { Money } from "../ui/Money";
import { fmtINR } from "../../utils/fmt";
import type { Position } from "../../api/client";
import { E, eicons } from "./eicons";

/* Rail + page blocks. No invented numbers: every figure comes from props.
   Missing backend fields are hidden with a TODO(backend) marker. */

export function PnLCard({ net, realized, unrealized, charges, gross }: {
  net: number;
  realized?: number;
  unrealized?: number;
  charges: number;
  gross?: number;
}) {
  // TODO(backend): realized/unrealized split — /api/pnl exposes gross only.
  const split = realized !== undefined && unrealized !== undefined;
  return (
    <section className="pnl" aria-label="Today's P&L">
      <div className="pnl-brand">
        <span>◈ MONOLITH</span>
      </div>
      <p className="cap">
        Net P&L today{" "}
        <span
          className="info"
          title="Net = Realized + Unrealized − Charges"
          tabIndex={0}
          aria-label="Formula: Realized plus Unrealized minus Charges"
        >
          ⓘ
        </span>
      </p>
      <Money value={net} sign colorize arrow size="hero" />
      <dl>
        {split ? (
          <>
            <div>
              <dt>Realized</dt>
              <dd>
                <Money value={realized as number} sign colorize />
              </dd>
            </div>
            <div>
              <dt>Unrealized</dt>
              <dd>
                <Money value={unrealized as number} sign colorize />
              </dd>
            </div>
          </>
        ) : (
          gross !== undefined && (
            <div>
              <dt>Gross</dt>
              <dd>
                <Money value={gross} sign colorize />
              </dd>
            </div>
          )
        )}
        <div>
          <dt>Charges</dt>
          <dd>
            <Money value={-charges} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

export interface RowPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  qty: number;
  avg: number;
  ltp: number;
  pnl: number;
}

export function toRowPosition(p: Position): RowPosition {
  return {
    symbol: p.symbol,
    side: p.qty < 0 ? "SHORT" : "LONG",
    qty: Math.abs(p.qty),
    avg: p.avgPrice,
    ltp: p.ltp,
    pnl: p.pnl,
  };
}

export function PositionRow({ position: p, onSelect }: {
  position: RowPosition;
  onSelect: () => void;
}) {
  return (
    <button
      className="pos-row"
      onClick={onSelect}
      aria-label={`${p.symbol} ${p.side}, quantity ${p.qty}, P&L ${fmtINR(p.pnl)}. Open position detail.`}
    >
      <span className="sym">
        {p.symbol} <em className={`side side-${p.side.toLowerCase()}`}>{p.side}</em>
      </span>
      <span className="num tnum">
        <small>Qty</small>
        {p.qty}
      </span>
      <span className="num tnum">
        <small>Avg</small>
        {fmtINR(p.avg, 2)}
      </span>
      <span className="num tnum">
        <small>LTP</small>
        {fmtINR(p.ltp, 2)}
      </span>
      <span className="num tnum">
        <Money value={p.pnl} sign colorize arrow />
        {/* TODO(backend): pnlPct — /api/positions exposes absolute P&L only. */}
      </span>
    </button>
  );
}

export function PositionsList({ positions, loading, error, onRetry, emptyText }: {
  positions: Position[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<RowPosition | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  if (loading) {
    return (
      <div className="pos-list" aria-label="Loading positions">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton" style={{ height: 64 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="empty" role="alert">
        <h2>Couldn't load positions</h2>
        <p>{error.message}</p>
        {onRetry && (
          <button className="act" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (positions.length === 0) {
    return (
      <div className="empty">
        <h2>No open positions</h2>
        {emptyText && <p>{emptyText}</p>}
      </div>
    );
  }
  return (
    <>
      <div className="pos-list">
        {positions.map((p) => (
          <PositionRow
            key={p.symbol}
            position={toRowPosition(p)}
            onSelect={() => {
              setSelected(toRowPosition(p));
              ref.current?.showModal();
            }}
          />
        ))}
      </div>
      <dialog ref={ref} className="kill-dialog" aria-labelledby="pos-title">
        {selected && (
          <>
            <h2 id="pos-title">
              {selected.symbol} <em className={`side side-${selected.side.toLowerCase()}`}>{selected.side}</em>
            </h2>
            <ul>
              <li>Quantity: {selected.qty}</li>
              <li>Average price: {fmtINR(selected.avg, 2)}</li>
              <li>LTP: {fmtINR(selected.ltp, 2)}</li>
              <li>
                P&L: {fmtINR(selected.pnl)}
              </li>
            </ul>
            <p style={{ fontSize: 12, color: "var(--text-2)" }}>
              Full order history for this position is not exposed yet. TODO(backend):
              position order timeline endpoint.
            </p>
            <div className="row">
              <button autoFocus className="cancel" onClick={() => ref.current?.close()}>
                Close
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function ActivityItem({ icon, title, sub, amount, down }: {
  icon: keyof typeof eicons; title: string; sub: string; amount: string; down?: boolean;
}) {
  return (
    <div className="efer-act">
      <span className="ic"><E d={eicons[icon]} size={20} /></span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--efer-ink-2)" }}>{sub}</div>
      </div>
      <span className="amt" style={{ color: down ? "var(--efer-red)" : "var(--efer-ink)" }}>{amount}</span>
    </div>
  );
}

export function MiniChart({ points, mark }: { points: number[]; mark: number }) {
  const w = 600;
  const h = 150;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const X = (i: number) => (i / (points.length - 1)) * w;
  const Y = (v: number) => h - 12 - ((v - min) / Math.max(1e-9, max - min)) * (h - 30);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const mx = X(mark);
  const my = Y(points[mark]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Balance chart">
      <path d={d} fill="none" stroke="#c9c9d4" strokeWidth="2" />
      <line x1={mx} y1={my} x2={mx} y2={h - 8} stroke="#c9c9d4" strokeWidth="1.5" />
      <circle cx={mx} cy={my} r="7" fill="#2b2b4a" />
      <ellipse cx={mx + 90} cy={my + 28} rx="46" ry="26" fill="rgba(224,87,87,.12)" stroke="#e05757" strokeWidth="1.5" />
    </svg>
  );
}
