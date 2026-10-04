import { useMemo } from "react";

/* Market visual for the auth panel: animated candlesticks, a drawing
   equity curve, live-feel stat chips and a ticker tape. Pure SVG + CSS,
   respects prefers-reduced-motion. */

interface Candle {
  x: number;
  o: number;
  c: number;
  h: number;
  l: number;
}

const W = 400;
const H = 190;

const TAPE = [
  ["NIFTY 50", "25,104.25", "+0.42%", true],
  ["SENSEX", "82,410.30", "+0.38%", true],
  ["RELIANCE", "2,997.50", "+0.45%", true],
  ["HDFCBANK", "1,638.10", "−0.24%", false],
  ["INFY", "1,872.40", "+0.71%", true],
  ["TCS", "4,205.00", "−0.11%", false],
] as const;

export function MarketVisual() {
  const { candles, curve } = useMemo(() => {
    // Deterministic pseudo-random walk so SSR/first paint is stable.
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let px = 100;
    const cs: Candle[] = [];
    const pts: string[] = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      const o = px;
      const drift = 1.6;
      const c = o + (rnd() - 0.42) * 9 + drift * 0.35;
      const h = Math.max(o, c) + rnd() * 3.4;
      const l = Math.min(o, c) - rnd() * 3.4;
      cs.push({ x: 14 + i * ((W - 28) / n), o, c, h, l });
      px = c;
      pts.push(`${(14 + i * ((W - 28) / n)).toFixed(1)},${(H - 12 - ((c - 80) / 70) * (H - 40)).toFixed(1)}`);
    }
    return { candles: cs, curve: `M${pts.join(" L")}` };
  }, []);

  const y = (v: number) => H - 12 - ((v - 80) / 70) * (H - 40);

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        .eq-curve { stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 2.4s ease-out forwards; }
        @keyframes draw { to { stroke-dashoffset: 0; } }
        .candle { animation: rise .7s cubic-bezier(.22,1,.36,1) backwards; }
        .pulse-dot { animation: pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .tape-track { display: flex; gap: 26px; animation: tape 22s linear infinite; width: max-content; }
        @keyframes tape { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .float-a { animation: floaty 5s ease-in-out infinite; }
        .float-b { animation: floaty 6.5s ease-in-out infinite reverse; }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .eq-curve, .candle, .pulse-dot, .tape-track, .float-a, .float-b { animation: none; }
          .eq-curve { stroke-dashoffset: 0; }
        }
      `}</style>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <span className="float-a" style={chip}>
          <span className="pulse-dot" style={liveDot} /> PAPER
        </span>
        <span className="float-b" style={chip}>
          Net P&L <b style={{ color: "#34d399" }}>+₹11,168</b>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Market chart illustration">
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="curveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        ))}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const col = up ? "#34d399" : "#f87171";
          return (
            <g key={i} className="candle" style={{ animationDelay: `${i * 45}ms` }} opacity={i < 20 ? 0.45 : 1}>
              <line x1={c.x} y1={y(c.h)} x2={c.x} y2={y(c.l)} stroke={col} strokeWidth="1.4" />
              <rect
                x={c.x - 4} y={y(Math.max(c.o, c.c))} width="8"
                height={Math.max(2, Math.abs(y(c.o) - y(c.c)))}
                rx="1.5" fill={col}
              />
            </g>
          );
        })}
        <path d={`${curve} L${W - 14},${H} L14,${H} Z`} fill="url(#curveFill)" />
        <path className="eq-curve" d={curve} fill="none" stroke="url(#curveStroke)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={W - 14} cy={y(candles[candles.length - 1].c)} r="4" fill="#34d399" className="pulse-dot" />
      </svg>

      <div style={{ overflow: "hidden", marginTop: 12, opacity: 0.9 }}>
        <div className="tape-track">
          {[...TAPE, ...TAPE].map(([s, p, chg, up], i) => (
            <span key={i} style={{ fontSize: 11.5, whiteSpace: "nowrap", color: "#cfc9e8" }}>
              <b>{s}</b> {p} <span style={{ color: up ? "#34d399" : "#f87171" }}>{chg}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const chip: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  background: "rgba(255,255,255,.09)",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 999,
  padding: "5px 12px",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const liveDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#34d399",
  display: "inline-block",
};
