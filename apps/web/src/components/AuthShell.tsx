import type { CSSProperties, ReactNode } from "react";
import { MarketVisual } from "./MarketVisual";

/* Dark auth card: muted mauve backdrop, deep-navy card, market-visual
   panel left (brand + live chart + tagline + dots), form panel right. */

const backdrop: CSSProperties = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "radial-gradient(1200px 700px at 50% 120%, #57506f 0%, #6f6a86 55%, #7b7590 100%)",
};

const card: CSSProperties = {
  width: "100%",
  maxWidth: 1020,
  background: "#201c30",
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 20,
  boxShadow: "0 30px 80px -20px rgba(0,0,0,.55)",
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr",
  overflow: "hidden",
  color: "#eceaf4",
};

const visual: CSSProperties = {
  margin: 12,
  borderRadius: 14,
  padding: "26px 26px 22px",
  display: "flex",
  flexDirection: "column",
  background:
    "radial-gradient(120% 90% at 80% 0%, rgba(124,93,250,.5) 0%, transparent 55%)," +
    "radial-gradient(90% 70% at 15% 90%, rgba(16,185,129,.14) 0%, transparent 60%)," +
    "linear-gradient(180deg, #342a5e 0%, #241d44 45%, #171222 100%)",
  position: "relative",
  overflow: "hidden",
};

export const authInput: CSSProperties = {
  width: "100%",
  background: "#2c2742",
  border: "1px solid #3d3657",
  borderRadius: 9,
  padding: "12px 13px",
  fontSize: 14,
  color: "#eceaf4",
  outline: "none",
};

export const authPrimary: CSSProperties = {
  width: "100%",
  background: "linear-gradient(180deg, #7c6cf5 0%, #6c5ce7 100%)",
  border: "none",
  borderRadius: 9,
  padding: 13,
  fontSize: 14.5,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 10px 24px -10px rgba(108,92,231,.7)",
};

export function AuthShell({
  tagline,
  activeDot = 0,
  children,
}: {
  tagline: [string, string];
  activeDot?: number;
  children: ReactNode;
}) {
  return (
    <div style={backdrop}>
      <style>{`@media (max-width: 880px) { .auth-card { grid-template-columns: 1fr !important; } .auth-visual { display: none; } }`}</style>
      <div style={card} className="auth-card">
        <div style={visual} className="auth-visual">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontWeight: 800, letterSpacing: ".14em", fontSize: 17 }}>◆ MONOLITH</span>
            <span
              style={{
                fontSize: 12, border: "1px solid rgba(255,255,255,.35)",
                borderRadius: 999, padding: "5px 12px", opacity: 0.9,
              }}
            >
              Paper-first trading →
            </span>
          </div>
          <MarketVisual />
          <div style={{ textAlign: "center", fontSize: 21, fontWeight: 650, lineHeight: 1.35, marginTop: 18 }}>
            {tagline[0]},<br />{tagline[1]}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: i === activeDot ? 34 : 22, height: 5, borderRadius: 999,
                  background: i === activeDot ? "#fff" : "rgba(255,255,255,.3)",
                  transition: "width .25s",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ padding: "48px 52px" }}>{children}</div>
      </div>
    </div>
  );
}
