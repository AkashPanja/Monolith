import { NavLink } from "react-router-dom";
import { I, icons } from "./icons";

/* Sidebar building blocks: section titles, nav items with counts,
   collapsible document tree, inset search. */

export function Section({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="neo-section">
        <span>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function SideItem({ to, icon, label, count, end }: {
  to: string; icon: keyof typeof icons; label: string; count?: number; end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `neo-item${isActive ? " active" : ""}`}>
      <I d={icons[icon]} />
      <span>{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </NavLink>
  );
}

export interface TreeNode {
  label: string;
  count?: number;
  active?: boolean;
  children?: TreeNode[];
}

export function DocTree({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <div>
      {nodes.map((n) => (
        <div key={n.label}>
          <div className={`neo-item${n.active ? " active" : ""}`} style={{ paddingLeft: 14 + depth * 18 }}>
            <I d={icons.folder} size={15} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>
            {n.count !== undefined && <span className="count">{n.count}</span>}
          </div>
          {n.children && <DocTree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

export function SideSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="neo-search">
      <I d={icons.search} size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search" />
    </div>
  );
}
