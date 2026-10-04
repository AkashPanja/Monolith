import { E, eicons } from "./eicons";
import { NavItem } from "../ui/NavItem";

/* Left nav: logo, links with explained count badges, bottom account block.
   Active state is a filled accent row (never a weak pill). */

export interface NavEntry {
  to: string;
  icon: keyof typeof eicons;
  label: string;
  count?: number;
  badgeTooltip?: string;
  end?: boolean;
}

function Row({ e }: { e: NavEntry }) {
  return (
    <NavItem
      to={e.to}
      label={e.label}
      end={e.end}
      icon={<E d={eicons[e.icon]} />}
      badge={
        e.count !== undefined && e.count > 0
          ? { count: e.count, tooltip: e.badgeTooltip ?? `${e.count} pending` }
          : undefined
      }
    />
  );
}

export function SideNav({ entries, bottom, brand }: {
  entries: NavEntry[];
  bottom: NavEntry[];
  brand: string;
}) {
  return (
    <nav className="efer-nav" aria-label="Primary">
      <div className="efer-logo">
        <span className="mark">◈</span>
        {brand}
      </div>
      <div style={{ flex: 1 }}>
        {entries.map((e) => (
          <Row key={e.to + e.label} e={e} />
        ))}
      </div>
      <div>
        {bottom.map((e) => (
          <Row key={e.to + e.label} e={e} />
        ))}
      </div>
    </nav>
  );
}
