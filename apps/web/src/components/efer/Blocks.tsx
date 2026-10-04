import { E, eicons } from "./eicons";

/* Middle-column blocks: gradient hero card, account rows, limit rows
   with donut gauges. Currency formatting is en-IN. */

export const inr0 = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function HeroCard({ label, amount, mode, sub }: {
  label: string; amount: string; mode: string; sub: string;
}) {
  return (
    <div className="efer-hero">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, letterSpacing: ".1em", fontSize: 13 }}>◈ MONOLITH</span>
        <span style={{ fontSize: 11.5, background: "rgba(255,255,255,.2)", borderRadius: 7, padding: "3px 9px" }}>
          {mode}
        </span>
      </div>
      <div style={{ marginTop: 34, fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
        <span className="amt">{amount}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10, fontSize: 12.5, opacity: 0.9 }}>
        <span>{sub}</span>
        <span style={{ marginLeft: "auto", fontSize: 15 }}>◈</span>
      </div>
    </div>
  );
}

export function AcctRow({ amount, ccy, tail, badge }: {
  amount: string; ccy: string; tail: string; badge?: number;
}) {
  return (
    <div className="efer-acct" style={{ position: "relative" }}>
      <b style={{ fontVariantNumeric: "tabular-nums" }}>{amount}</b>
      <span className="ccy">{ccy}</span>
      <span className="tail">{tail}</span>
      {badge !== undefined && badge > 0 && (
        <span className="efer-dot-badge" style={{ position: "absolute", top: -8, right: -4 }}>{badge}</span>
      )}
    </div>
  );
}

function Gauge({ pct, dark }: { pct: number; dark?: boolean }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <svg width="44" height="44" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke={dark ? "#3a3a56" : "#e4e4ea"} strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={dark ? "#fff" : "#2b2b4a"} strokeWidth="4"
        strokeDasharray={c.toFixed(1)} strokeDashoffset={off.toFixed(1)}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
      <circle cx="18" cy="18" r="4.5" fill={dark ? "#fff" : "#2b2b4a"} />
    </svg>
  );
}

export function LimitRow({ title, used, total, dark }: {
  title: string; used: string; total: string; dark?: boolean;
}) {
  const pct = parseFloat(used.replace(/[^0-9.]/g, "")) / Math.max(1, parseFloat(total.replace(/[^0-9.]/g, "")));
  return (
    <div className="efer-limit">
      <Gauge pct={Number.isFinite(pct) ? pct : 0} dark={dark} />
      <div>
        <div className="t">{title}</div>
        <div className="v">{used} / {total}</div>
      </div>
      <span className="chev">›</span>
    </div>
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
        <div style={{ fontSize: 12.5, color: "var(--efer-ink-2)" }}>{sub}</div>
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
