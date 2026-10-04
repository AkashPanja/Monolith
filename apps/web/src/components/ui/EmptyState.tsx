import { useEffect, useState, type ReactNode } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Live countdown to a Date. Text-only, no animation concerns. */
export function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, to.getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return (
    <span className="tnum">
      {h}h {pad(m)}m
    </span>
  );
}

/** Next 16:30 IST from now (EOD report run). Pure schedule math. */
export function nextEod(from: Date = new Date()): Date {
  const ist = new Date(from.getTime() + (330 + from.getTimezoneOffset()) * 60000);
  const target = new Date(ist);
  target.setHours(16, 30, 0, 0);
  if (target.getTime() <= ist.getTime()) target.setDate(target.getDate() + 1);
  return new Date(target.getTime() - 330 * 60000 + from.getTimezoneOffset() * 60000);
}

/** Guided empty state with optional countdown, KPI skeleton preview and action. */
export function EmptyState({ title, description, nextRun, preview, action }: {
  title: string;
  description?: string;
  nextRun?: Date;
  preview?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="empty" aria-live="polite">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {nextRun && (
        <p className="tnum">
          First report in <Countdown to={nextRun} /> · 16:30 IST
        </p>
      )}
      {preview}
      {action && (
        <button className="act" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}

/** KPI strip skeleton preview (labels only — no invented values). */
export function KpiSkeleton({ labels }: { labels: string[] }) {
  return (
    <div className="kpi-skel" aria-hidden="true">
      {labels.map((l) => (
        <div key={l}>
          <small>{l}</small>
          <div className="skeleton" style={{ height: 18 }} />
        </div>
      ))}
    </div>
  );
}
