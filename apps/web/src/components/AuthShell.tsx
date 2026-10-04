import type { ReactNode } from "react";
import { ArchVisual } from "./ArchVisual";
import { Stepper } from "./auth/Stepper";

/* Dark auth card: sage-grey page backdrop, black card, illustration panel
   with bottom scrim caption, form column. Decorative panel is aria-hidden;
   it hides below 900px and the brand mark moves above the form. */

export function AuthShell(p: {
  steps?: { id: string; label: string }[];
  current?: number;
  title: string;
  subtitle?: string;
  asideCaption?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-root">
      <div className="auth-card">
        <aside className="auth-aside" aria-hidden="true">
          <ArchVisual />
          {p.asideCaption && <p className="auth-caption">{p.asideCaption}</p>}
        </aside>
        <div className="auth-main">
          <div className="auth-brand" aria-hidden="true">
            ◆ MONOLITH
          </div>
          {p.steps && <Stepper steps={p.steps} current={p.current ?? 0} />}
          <h1>{p.title}</h1>
          {p.subtitle && <p className="auth-sub">{p.subtitle}</p>}
          {p.children}
          {p.footer}
        </div>
      </div>
    </main>
  );
}
