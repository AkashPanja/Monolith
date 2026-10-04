import { NavLink } from "react-router-dom";
import { I, icons } from "./icons";

/* Slim dark icon rail (reference left edge). Reusable: items + bottom slot. */

export interface RailItem {
  to: string;
  icon: string;
  label: string;
}

export const RAIL_ITEMS: RailItem[] = [
  { to: "/", icon: "home", label: "Home" },
  { to: "/plan", icon: "compass", label: "Plan" },
  { to: "/trading", icon: "spark", label: "Trading" },
  { to: "/performance", icon: "share", label: "Performance" },
  { to: "/reports", icon: "db", label: "Reports" },
  { to: "/journal", icon: "cube", label: "Journal" },
];

export function Rail({ bottom }: { bottom?: React.ReactNode }) {
  return (
    <div
      style={{
        width: 64,
        background: "var(--neo-rail)",
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 0",
        gap: 4,
        color: "#d7d7dc",
        flexShrink: 0,
      }}
    >
      <div style={{ marginBottom: 10, color: "#fff" }} title="Monolith">
        <I d={icons.logo} size={20} />
      </div>
      {RAIL_ITEMS.map((it) => (
        <NavLink
          key={it.to + it.label}
          to={it.to}
          end={it.to === "/"}
          title={it.label}
          style={({ isActive }) => ({
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            color: isActive ? "#17171a" : "#d7d7dc",
            background: isActive ? "#ececf0" : "transparent",
            textDecoration: "none",
          })}
        >
          <I d={icons[it.icon as keyof typeof icons]} size={18} />
        </NavLink>
      ))}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {bottom}
      </div>
    </div>
  );
}
