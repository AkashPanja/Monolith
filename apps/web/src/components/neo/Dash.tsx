import { I, icons } from "./icons";

/* Dashboard blocks: hero stat, tab bar, inset search, soft card. */

export function Hero({ label, value, delta, deltaDown, action }: {
  label: string;
  value: string;
  delta: string;
  deltaDown?: boolean;
  action: React.ReactNode;
}) {
  return (
    <div className="neo-panel" style={{ padding: "22px 24px" }}>
      <div style={{ fontSize: 15, fontWeight: 550 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <span className="neo-hero-num">{value}</span>
        <span className={`neo-chip${deltaDown ? " down" : ""}`} style={{ marginBottom: 10 }}>
          {deltaDown ? "↓" : "↑"} {delta}
        </span>
      </div>
      {action}
    </div>
  );
}

export function Tabs({ tabs, active, onPick }: {
  tabs: string[]; active: string; onPick: (t: string) => void;
}) {
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,.08)", marginTop: 4 }}>
      {tabs.map((t) => (
        <button key={t} className={`neo-tab${t === active ? " active" : ""}`} onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function DashSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="neo-search" style={{ margin: "14px 0 0" }}>
      <I d={icons.search} size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search" />
    </div>
  );
}

export function SoftCard({ children, pad = 20 }: { children: React.ReactNode; pad?: number }) {
  return <div className="neo-panel" style={{ padding: pad }}>{children}</div>;
}
