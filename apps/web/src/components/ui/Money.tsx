import { fmtINR, fmtSigned } from "../../utils/fmt";

function Arrow({ down }: { down?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {down ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />}
    </svg>
  );
}

/** Signed, tabular, optionally colorized money. Never color-only: pair with
 *  `arrow` when the sign alone must be perceivable. */
export function Money({ value, sign, decimals = 0, colorize, arrow, size = "md" }: {
  value: number;
  sign?: boolean;
  decimals?: 0 | 2;
  colorize?: boolean;
  arrow?: boolean;
  size?: "sm" | "md" | "hero";
}) {
  const tone = !colorize || value === 0 ? "" : value > 0 ? "pos" : "neg";
  return (
    <span className={`money ${size} ${tone}`}>
      {arrow && value !== 0 && <Arrow down={value < 0} />}
      {sign ? fmtSigned(value, decimals) : fmtINR(value, decimals)}
    </span>
  );
}
