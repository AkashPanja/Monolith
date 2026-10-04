import { Link } from "react-router-dom";

/** Linear limit bar with text state (never color-only). Whole row links
 *  to Risk & Limits. Percent-based: the API exposes usedPct only. */
export function RiskMeter({ label, pct, help, segments, usedCount, limitCount }: {
  label: string;
  pct: number; // 0-100 of limit used
  help: string;
  segments?: number;
  usedCount?: number;
  limitCount?: number;
}) {
  const tone = pct >= 100 ? "danger" : pct >= 80 ? "orange" : pct >= 50 ? "warning" : "ok";
  const top =
    segments && usedCount !== undefined && limitCount !== undefined
      ? `${usedCount} of ${limitCount} used`
      : `${pct.toFixed(pct >= 100 ? 0 : 1)}% of limit used`;
  return (
    <Link to="/risk" className={`risk risk-${tone}`} title={help} aria-label={`${label}. ${top}. ${help}`}>
      <div className="risk-top">
        <span>{label}</span>
        <span className="tnum">{top}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(pct, 100))}
        className={segments ? "bar segs" : "bar"}
      >
        {segments ? (
          Array.from({ length: segments }, (_, i) => (
            <i key={i} data-on={usedCount !== undefined && i < usedCount} />
          ))
        ) : (
          <i style={{ width: `${Math.min(pct, 100)}%` }} />
        )}
      </div>
      <div className="risk-bottom tnum">
        {help}
        {pct >= 80 && (
          <strong> · {pct >= 100 ? "Limit hit" : "Approaching limit"}</strong>
        )}
      </div>
    </Link>
  );
}
