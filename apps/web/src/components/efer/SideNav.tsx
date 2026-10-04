import { NavLink } from "react-router-dom";
import { E, eicons } from "./eicons";

/* Left nav: logo, links with red count badges, bottom account block. */

export interface NavEntry {
  to: string;
  icon: keyof typeof eicons;
  label: string;
  count?: number;
  end?: boolean;
}

export function SideNav({ entries, bottom, brand }: {
  entries: NavEntry[];
  bottom: NavEntry[];
  brand: string;
}) {
  return (
    <nav className="efer-nav">
      <div className="efer-logo">
        <span className="mark">◈</span>
        {brand}
      </div>
      <div style={{ flex: 1 }}>
        {entries.map((e) => (
          <NavLink key={e.to + e.label} to={e.to} end={e.end}
            className={({ isActive }) => `efer-link${isActive ? " active" : ""}`}>
            <E d={eicons[e.icon]} />
            <span>{e.label}</span>
            {e.count !== undefined && e.count > 0 && <span className="efer-badge">{e.count}</span>}
          </NavLink>
        ))}
      </div>
      <div>
        {bottom.map((e) => (
          <NavLink key={e.to + e.label} to={e.to}
            className={({ isActive }) => `efer-link${isActive ? " active" : ""}`}>
            <E d={eicons[e.icon]} />
            <span>{e.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
