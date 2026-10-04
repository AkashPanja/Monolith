import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

/** Single nav row: filled accent active state, 3px indicator,
 *  aria-current, optional explained badge. */
export function NavItem({ to, label, icon, badge, end }: {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: { count: number; tooltip: string };
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className="nav-item">
      {({ isActive }) => (
        <span data-active={isActive} aria-current={isActive ? "page" : undefined}>
          {icon}
          <span className="nav-label">{label}</span>
          {badge && badge.count > 0 && (
            <span className="nav-badge" title={badge.tooltip} aria-label={badge.tooltip}>
              {badge.count}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}
