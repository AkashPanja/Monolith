import type { Mode } from "../../api/client";

const LIVE: Mode[] = ["LIVE_CONFIRM", "LIVE_AUTO"];

/** The single mode indicator in the app (lives in TopBar). */
export function ModeBadge({ mode }: { mode: Mode }) {
  const live = LIVE.includes(mode);
  return (
    <span className={`mode mode-${live ? "live" : "paper"}`} role="status">
      {live ? "● LIVE" : mode === "OFF" ? "OFF" : "PAPER"}
    </span>
  );
}

export function isLiveMode(mode: Mode): boolean {
  return LIVE.includes(mode);
}
