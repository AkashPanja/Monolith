import type { CSSProperties, ReactNode } from "react";
import { ArchVisual } from "./ArchVisual";

/* Auth card matching the reference exactly: sage-grey page backdrop,
   pure-black rounded card, photographic panel left with bottom overlay
   tagline, form column right. Inter throughout. */

const backdrop: CSSProperties = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  padding: 40,
  background: "#9aa092",
  fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const card: CSSProperties = {
  width: "100%",
  maxWidth: 1080,
  background: "#000000",
  borderRadius: 18,
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "1.02fr 1fr",
  color: "#f5f5f4",
  boxShadow: "0 40px 90px -30px rgba(0,0,0,.5)",
};

const visual: CSSProperties = {
  margin: 10,
  borderRadius: 12,
  overflow: "hidden",
  position: "relative",
  minHeight: 560,
};

const overlay: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "90px 34px 30px",
  background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,.55) 60%, rgba(0,0,0,.78) 100%)",
  textAlign: "center",
};

export const authLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#d4d4d4",
  display: "block",
  margin: "0 0 7px",
};

export const authInput: CSSProperties = {
  width: "100%",
  background: "#161616",
  border: "1px solid #161616",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 13.5,
  color: "#f5f5f4",
  outline: "none",
  fontFamily: "inherit",
};

export const authPrimary: CSSProperties = {
  width: "100%",
  background: "#c9d6a3",
  border: "none",
  borderRadius: 8,
  padding: 14,
  fontSize: 13.5,
  fontWeight: 600,
  color: "#1c1c1a",
  cursor: "pointer",
  fontFamily: "inherit",
};

export const authLink: CSSProperties = { color: "#e7e7e7", fontSize: 12.5, textDecoration: "none" };
export const authMuted: CSSProperties = { color: "#8a8a8a", fontSize: 12.5 };

export function AuthShell({
  tagline,
  children,
}: {
  tagline: [string, string];
  children: ReactNode;
}) {
  return (
    <div style={backdrop}>
      <style>{`
        @media (max-width: 880px) { .auth-card { grid-template-columns: 1fr !important; } .auth-visual { display: none; } }
        .auth-card input:focus { border-color: #d6d6d6 !important; box-shadow: 0 0 0 1px #d6d6d6; }
        .auth-card input::placeholder { color: #6e6e6e; }
      `}</style>
      <div style={card} className="auth-card">
        <div style={visual} className="auth-visual">
          <div style={{ position: "absolute", inset: 0 }}>
            <ArchVisual />
          </div>
          <div style={overlay}>
            <div style={{ fontSize: 16.5, fontWeight: 500, lineHeight: 1.5 }}>{tagline[0]}</div>
            <div style={{ fontSize: 16.5, fontWeight: 500, lineHeight: 1.5 }}>{tagline[1]}</div>
          </div>
        </div>
        <div
          style={{
            padding: "64px 72px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
