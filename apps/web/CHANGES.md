# UI Fix Pass — CHANGES.md

## Follow-up: layout revert (eferbarn 3-column restored)

The spec's TopBar + collapsible-rail apparatus clashed with the 3-column
shell (duplicate headings, mixed radii, cramped bar), so the *layout* part
was reverted to the plain eferbarn 3-column: nav | positions column | main.
`ui/TopBar.tsx` and `ui/Kill.tsx` were deleted. Kept from the spec pass
because they are strictly better and theme-consistent: `Money`/`fmt`,
single `ModeBadge` (+ LIVE root frame), linear `RiskMeter`, `PnLCard`,
`PositionRow`/`PositionsList`, explained nav badges, unique icons,
accessible `Tabs`, `EmptyState` family, and all auth improvements
(`Stepper`, `PasswordField`/`PasswordRules`, contrast, DEV-only skip).
KILL is a native dialog with the true consequences plus the typed
"HALT ALL" phrase the API already requires; Logout sits well away from it.

Spec: Claude UI design review (`muse-monolith-ui-spec.md`). Presentation layer
only: no route, API, risk-engine or state-management changes. All figures come
from existing endpoints; nothing was invented.

## Per-issue changes

- **P0-1 (KILL + Logout in rail):** removed both buttons from the rail.
  KILL is now `KillSwitch` in `TopBar` (red outline, Power icon) opening a
  native `<dialog>` (free focus trap + Esc) that lists the real consequences
  and requires a 1s `HoldButton` (pointer + Space/Enter, release cancels).
  Logout moved into `UserMenu` in `TopBar`. The typed-phrase step-up and the
  `api.kill("dashboard kill", "HALT ALL")` call are unchanged.
- **P0-2 (Daily-loss ring):** donut `LimitRow` replaced by linear `RiskMeter`
  with `role="progressbar"` + `aria-valuenow`, text state
  ("22.0% of limit used", "Approaching limit"/"Limit hit" badges at ≥80%),
  tone scale ok → warning → orange → danger, and a help tooltip. Whole row
  links to Risk & Limits.
- **P0-3 (mode shown twice, nowhere persistent):** deleted the `PAPER` badge
  on the hero card and the floating pill. Exactly one `ModeBadge` remains, in
  `TopBar`; LIVE renders a red chip plus a 2px red inset frame on the app root
  (`[data-mode="live"]`).
- **P0-4 (Trading "quiet" vs open positions):** Trading page now renders
  `PositionsList` and a scoped "No orders today" empty state that names the
  carried-over open positions. Never claims quiet while positions/P&L exist.
- **P0-A1 (skip-setup link):** hidden in production builds; visible in dev
  only (`import.meta.env.DEV`). Default per spec — no confirm-dialog variant
  built since product did not require the link.
- **P1-5 (PnL hero):** `PnLCard` with 28px tabular Net (sign + arrow, white on
  a darkened gradient ≥4.5:1) and labelled Gross / Charges / Net rows plus a
  Net-formula tooltip. Realized/unrealized split hidden — see backend gaps.
  Decorative diamond removed.
- **P1-6 (position rows):** `PositionRow` button with LONG/SHORT side chip
  (derived from qty sign), Qty, Avg, LTP (always 2 decimals, tabular,
  right-aligned), signed arrowed P&L. Opens a detail dialog with known fields.
  `PositionsList` adds loading skeletons, error + Retry, and a
  "No open positions" empty state.
- **P1-7 (Export CSV):** disabled with `aria-disabled` + "Nothing to export
  yet" tooltip. Split menu deferred — see backend gaps.
- **P1-8 (Reports empty state):** `EmptyState` with live "First report in
  {h}h {m}m · 16:30 IST" countdown (next-16:30 schedule math), KPI-strip
  skeleton preview (labels only, no values), EOD | Weekly | Monthly tabs and
  an always-visible date-range picker that scopes the empty-state copy.
  "Generate preview now" omitted — see backend gaps. All data regions
  (positions, limits, P&L, proposals) got loading + error + Retry states.
- **P1-9 (Trading copy/tabs):** real Paper | Live `Tabs`; Live tab is locked
  with a hint and links to the promotion checklist on Risk & Limits. Jargon
  ("idempotency keys", "worker") removed from user-facing copy.
- **P1-A2 (Continue contrast):** solid `#b7e36b` fill with near-black text;
  invalid state is outlined + `aria-disabled` with a reason line
  ("Complete all fields to continue"). Applied to setup, login and forgot.
- **P1-A3 (password fields):** shared `PasswordField` with a real eye/eye-off
  SVG toggle (`aria-pressed`), one shared reveal state for
  password + confirm, empty placeholder, live `PasswordRules` checklist
  (`aria-live="polite"`) and an inline "✓ Passwords match" status.
- **P1-A4 (form semantics):** all account fields marked required via the
  reason line; `autoComplete` name/email/new-password/current-password/
  one-time-code; `aria-invalid` + `aria-describedby`; errors appear on blur
  (not keystroke) plus a submit-time pass.
- **P2-10 (TopBar):** 56px bar with route title, `MarketStatus` chip
  (NSE 09:00–09:15 pre-open / 09:15–15:30 open, Mon–Fri, live IST clock),
  broker dot + "updated {n}s ago" (time since our last health fetch),
  `ModeBadge`, rail toggle, `KillSwitch`, `UserMenu`.
- **P2-11 (Proposals label/badge):** single-line "Proposals" with an explained
  badge (`aria-label` + tooltip, e.g. "1 proposal awaiting review").
- **P2-12 (icons/labels):** unique icons — Proposals clipboard-check, Reports
  file-bar-chart, Audit & Health activity pulse. "My stat" → "My Stats".
- **P2-13 (active item):** filled `#2b2f5b` row, 3px light inset indicator,
  `aria-current="page"`, white-on-navy text.
- **P2-14 (fixed positions column):** middle column is now a 320px collapsible
  `RightRail` with a TopBar toggle, `localStorage` persistence, `aria-hidden`
  when closed, and a bottom-sheet layout under 1024px.
- **P2-15 (meters vs Risk page):** rail meters are `RiskMeter` summary links
  to /risk (whole row clickable, 18px chevron via link affordance).
- **P2-A5 (step pills):** semantic `<ol aria-label="Setup progress">` with
  `aria-current="step"`, done-step checks, 12px labels.
- **P2-A6 (auth aside):** caption sits on a bottom scrim gradient; inner
  radius (4px) = outer (16px) − padding (12px); panel hides below 900px with
  the brand mark moving above the form; decorative aside is `aria-hidden`.
- **P3-16 (radius/type):** one radius scale (8/12/16) on every panel;
  28px shell radii normalized to 16px; no stray gradient strip existed —
  hero gradient darkened instead for contrast (see P1-5). Dead legacy CSS
  (old nav pill, hero, donut, account-row rules) removed.
- **P3-17 (type/contrast):** captions 12px minimum, body 14px, secondary text
  `#4b5060`/`#5f6372` (≥4.5:1 on white), all figures `tabular-nums`.

## New reusable components

`utils/fmt` · `ui/Money` · `ui/ModeBadge` · `ui/RiskMeter` · `ui/Kill`
(`HoldButton`, `KillSwitch`) · `ui/TopBar` (`TopBar`, `MarketStatus`,
`UserMenu`) · `ui/Tabs` · `ui/EmptyState` (`EmptyState`, `Countdown`,
`nextEod`, `KpiSkeleton`) · `ui/NavItem` · `auth/Stepper` ·
`auth/password` (`PasswordField`, `PasswordRules`, `PASSWORD_RULES`) ·
`efer/Blocks` (`PnLCard`, `PositionRow`, `PositionsList`). `AuthShell` now
takes `steps/current/title/subtitle/asideCaption/footer`.

## Skipped — needs backend support (no UI built)

1. Realized/unrealized P&L split (`/api/pnl` exposes gross only) — hero
   shows Gross / Charges / Net with a `TODO(backend)` marker.
2. Position `pnlPct` (`/api/positions` exposes absolute P&L only) — hidden.
3. Position order-timeline detail — dialog shows known fields + a backend
   note instead of full history.
4. Today's orders endpoint — Trading shows a scoped empty state.
5. "Generate preview now" on Reports — omitted; countdown + skeleton only.
6. Export CSV split menu (Trades / Summary) — button stays disabled until
   rows exist.
7. Kill-side effects beyond mode OFF + killed flag (order cancel,
   square-off) — dialog lists only what `/api/kill` performs.
8. Positions cap count for the segmented meter (`/api/limits` exposes
   percent only) — percent variant used.

## QA (spec section E)

1. `tsc --noEmit` clean; `vite build` clean (no warnings); Python suite
   44 passed (untouched backend, regression check).
2. Widths: rail bottom-sheet <1024px, single column <760px, auth panel
   hidden <900px — CSS-verified (no screenshot harness in this environment;
   recommend a visual pass at 1440/1024/768/390).
3. Keyboard: native `<dialog>` traps focus + Esc; HoldButton handles
   Space/Enter; global `:focus-visible` ring; tabs are real buttons with
   `aria-selected`.
4. Exactly one `.mode` element in the app shell (TopBar); `[data-mode]`
   frame on the root.
5. No text below 12px; P&L pairs color with sign + arrow + text state.
6. Global `prefers-reduced-motion` kill-switch in CSS; countdown/clock are
   text updates only.
