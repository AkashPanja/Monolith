# Monolith (Atlas)

Personal NSE/BSE cash-equity algo trader. Self-hosted, single owner, paper-first.
Stack: **FastAPI + React + Postgres 16** via Docker Compose. Full spec: `docs/atlas-requirements.md`.

## Layout

- `apps/web/` — React dashboard. Built first: login + mascot + shell.
- `services/api/` — FastAPI (auth, config, plans, approvals).
- `services/worker/` — agents + scheduler (signal pipeline, plans, EOD jobs).
- `services/watchdog/` — separate process; owns square-off + kill. Never merge into worker.
- `services/notifier/` — outbox sender (WhatsApp OpenWA → Telegram/Gmail fallbacks).
- `services/execution/` — ONLY place that may call broker order methods, only with an `ApprovedOrder` from `risk/gate.py`.
- `libs/risk/` — deterministic gate + sizer. No LLM, no network I/O, no ML imports. Fail-closed.
- `libs/ledger/` — event-sourced double-entry ledger + `charges_schedule`.
- `infra/` — `compose.yml`, migrations, seed, `charges_schedule.v0.json`.

## Commands

- `docker compose -f infra/compose.yml up --build` — full stack.
- `docker compose -f infra/compose.yml exec api pytest` / `... exec web npm test` — scoped tests.
- Single test: `docker compose -f infra/compose.yml exec api pytest <path>::<test> -q`.
- Order: `lint -> mypy --strict (risk/, execution/) -> test -> compose smoke`.
- Postgres 16 only (no SQLite). Migrations in `infra/migrations/`.

## Hard safety rules (CI enforces via grep/AST)

- Only `services/execution/` calls broker orders, with `ApprovedOrder` minted by `risk/gate.py`.
- Gate has no LLM/network; fails closed on any error. No numeric level flows from LLM output into `ApprovedOrder` — levels are computed in code; LLM gives direction + rationale + evidence only.
- LLM never sees keys, account IDs, balances. Never log secrets. No config/secret tools for the LLM.
- Default mode `PAPER`. `OFF → PAPER → LIVE_CONFIRM → LIVE_AUTO` (step-up auth + typed phrase + promotion checklist).
- Square-off: 15:10 POV schedule (≤5% rolling volume, limit-ladder); 15:25 CRITICAL on all channels if any MIS open.
- Proposals require code-computed `stop_loss`; qty from sizer, never LLM. LLM nullish floats (`"15%"`, `"150-160"`) coerce to `None` → reject. Unparseable output → `REVIEW`, never `Hold`.
- One live broker (`fyers`) by config allow-list; >1 live adapter refuses to boot. Paper adapter always present.
- `backtest/` imports no ledger: decision-grid scoring only (forward alpha, independent cells). Sequential ledger lives in paper soak.
- Mark unverified broker facts `# VERIFY`. Stop and ask on ambiguity — never guess around risk, orders, or limits.

## Trading filters (evidence-backed, see docs/execution-patches.md)

- ORB break eligible only if: range ≥ 0.5× ATR(14), spread ≤ 3 ticks, projected costs ≤ 30% of stop distance, volume ≥ session-median pace.
- Entries threshold-gated: Strategist signal `s ∈ [0,1]`, admit only `s ≥ 0.6` (calibrate 0.4–0.8 in paper).
- 1-min Fyers bars minimum for ORB/threshold work; missing bars → skip day + alert.

## Dashboard (login + mascot + shell first)

- Merge: Neka health-cards (status + limit meters) + Bryzos data-density (Plan/Trading tables) + Lerno clarity (rounded cards, whitespace, guided empty states).
- Login: split screen, brand/mascot panel left, form right; soft gradient, glass card.
- Motion: route transitions + card hover lift + P&L count-up + skeleton shimmer. Respect `prefers-reduced-motion`.
- Auth visual panel: animated market visual (candlesticks, drawing equity curve, ticker tape, PAPER/P&L chips) — SVG + CSS only, deterministic, reduced-motion safe. No mascot/character.
- Shell: top bar (mode badge grey/blue/amber/red, auto-trade switch, KILL, health dots, P&L, limit meters) + pages: Home, Plan & Proposals, Trading (Paper/Live tabs), Journal, Performance, Reports, Risk & Limits, Settings, Audit & Health. Live = red banner; dangerous actions = typed confirm + step-up.

## Conventions

- UTC internally, IST display. NSE-calendar aware scheduler. U-shaped day: active open/close, quiet midday.
- Tests first for `risk/`, `execution/`, charges. Coverage ≥85%, 100% branch on `risk/`.
- Outbox pattern for orders/notifications; idempotency keys + check-status-before-retry.
- Hash-chained audit log; DB role without UPDATE/DELETE.
