# Monolith — Session Handoff (4 Oct 2026)

Read this first in a new session. Everything below is current as of commit `0649033` on
`master` at `https://github.com/AkashPanja/Monolith`.

## 1. What this is

**Monolith** (engine name: Atlas) — personal NSE/BSE cash-equity algo trader. Self-hosted,
single owner, paper-first. Stack: **FastAPI + React (Vite+TS) + Postgres 16** via Docker Compose.
Full requirements: `docs/REQUIREMENTS.md` (v2.1, non-UI). UI guidance: `AGENTS.md`.
Companion docs: `docs/execution-patches.md` (P1–P6), `docs/risk-appendix.md` (R1–R5),
`apps/web/CHANGES.md` (UI fix log).

## 2. Repo map (what exists, what works)

| Path | State |
| --- | --- |
| `apps/web/` (Vite+React+TS) | Working. Dark auth (login/setup/forgot per black/sage reference), eferbarn 3-col shell (nav \| positions \| content), dashboard with tiles/chart/activity, all 9 pages routed. `npm run build` green. Dev server normally on **http://localhost:3000** (mock mode default; `VITE_API_MODE=live` flips to backend). |
| `services/api/` (FastAPI) | Working. Setup-once (scrypt+TOTP enroll, secret shown once), login (password+TOTP, 15-min JWT), forgot (always-200), health/mode/pnl/limits/positions/proposals (JWT-gated), kill (JWT + `HALT ALL` phrase → mode OFF). 4 TestClient tests green. Dev store = file-backed JSON (`MONOLITH_DATA_DIR`); Postgres + AES vault pending (Sprint 1). |
| `libs/risk/` | Done. Deterministic gate (9-stage eval, FAIL_CLOSED), sizer, nullish-float coercion. 21 tests green incl. 4,000 randomized invariant cases. No LLM/network/ML (CI import guard in execution tests). |
| `services/execution/` | Done v1. BrokerPort, PaperBroker (in-memory, idempotent replay), FyersBroker stub (locked), single-live-adapter boot guard, ApprovedOrder-only executor, paper fill model (touch+slippage, trade-through limits, gap-open stops, lot/circuit rejects), P4 VWAP attribution vs post-trade reversion. 9 tests green. Single-fill only (partials = v2); `impact_k=0.10` uncalibrated. |
| `services/worker/` | Done on mock provider. Code indicators (Wilder ATR, ORB levels, signal `0.5exp+0.35part+0.15spread`, gate `s≥0.6`), LLM boundary (MockProvider deterministic, UnconfiguredProvider fails closed), pipeline analyst→strategist→critic→gate with tick-snapped levels, REVIEW paths, plan renderer. 10 tests green. Live adapters + news ingest pending (Sprint 4). |
| `services/watchdog/`, `services/notifier/`, `libs/ledger/` | Skeleton (`.gitkeep`) only. Next backend work. |
| `infra/` | `compose.yml` (postgres+api/worker/watchdog/notifier/web), `charges_schedule.v0.json` (ALL rates `# VERIFY`, 1% contract-note gate), `migrations/.gitkeep`. No Docker on dev machine — compose never run. |
| Test totals | **44 Python tests green** (`pytest services libs`), web `tsc` clean + `vite build` green. No `coverage`/`mypy` installed — 100% branch + `--strict` claims unverified. |

## 3. Decisions already locked (do not relitigate)

- Project Monolith; modes OFF→PAPER→LIVE_CONFIRM→LIVE_AUTO; default PAPER; single live broker `fyers`.
- Data: Fyers History API 1-min bars minimum; missing bars → skip day + alert.
- Filters: ORB needs range≥0.5×ATR(14), spread≤3 ticks, costs≤30% of stop distance, volume≥median pace; entries need Strategist `s≥0.6` (sweep 0.4–0.8 later).
- Square-off: 15:10 POV ≤5% rolling volume limit-ladder; 15:25 CRITICAL if MIS open.
- Sizer: `qty=floor(min(risk/dist, 10%cap/entry, 1%ADV)/lot)·lot`, tick-snapped, code-computed SL mandatory.
- LLM contributes direction+rationale+evidence only; nullish numerics → None → reject; unparseable → REVIEW.
- UI: eferbarn flat 3-column is THE design (a Claude-spec TopBar layout was tried and reverted — see `apps/web/CHANGES.md`; do not reintroduce TopBar/RightRail/HoldButton). Auth stays black/sage reference style. No mascot (removed by user).
- Git identity repo-local (`Akash Panja <AkashPanja@users.noreply.github.com>`); branch `master`; push works via stored creds; no `gh` CLI on machine.
- Dev servers are started detached per need (they don't survive across tool sessions reliably — always `curl`-verify `localhost:3000` and restart if 000).

## 4. How to run / verify

- Web: `apps/web` → `npm install` (done) → `npx vite --port 3000` (or `npm run dev`); `VITE_API_MODE=live` + API on :8000 for live mode (vite proxies `/api`).
- API: `services/api` → `python -m uvicorn app.main:app --port 8000` (needs `MONOLITH_DATA_DIR` for isolation in tests; deps: fastapi, uvicorn, pyotp, pyjwt, httpx, email-validator — installed).
- Tests: `python -m pytest services libs -q` (repo root); web `npx tsc --noEmit` + `npx vite build` (`apps/web`).
- E2E proven 4 Oct: setup 201 → TOTP login 200 → mode PAPER → positions → kill→OFF.

## 5. Open inputs (need user answers)

1. `max_capital` + daily loss tolerance · 2. Home NAS vs static-IP VPS · 3. Intraday only or delivery too? (SELL path mirrors BUY but shorts unverified) · 4. News sources (Sprint 4) · 5. Hard-banned stocks/sectors · 6. Employer pre-clearance (§0).

## 6. Suggested next steps (in order)

1. `libs/ledger` (double-entry + charges application) → makes P&L real, unblocks EOD report.
2. `services/watchdog` (POV square-off scheduler + kill ownership) + chaos tests.
3. `services/notifier` (outbox → Telegram/Gmail first; OpenWA WhatsApp stub + `# VERIFY`).
4. Sprint-0 verifies: Fyers token/session/MIS/SL types, static-IP posture, charges vs real contract note, OpenWA API.
5. Live LLM adapters + news ingest (Sprint 4) with budget caps.
6. Install `coverage` + `mypy --strict`; ramp `risk/` to 100% branch; coverage ≥85% gate.
7. Fold `docs/execution-patches.md` + `docs/risk-appendix.md` into REQUIREMENTS.md if user wants one source of truth (offered, unanswered).
8. Visual width pass at 1024/768/390px (CSS-only verified; no screenshot harness here).

## 7. Gotchas for the next agent

- PowerShell 5.1 on Windows: no `&&` (use `;`), no `head` (use `Select-Object`), quote carefully in `curl.exe -w` (a past typo broke a command). `Remove-Item` fails on locked files (dev server logs) — stop the owning process first.
- `sys.path` off-by-ones have bitten twice: worker/execution/api tests need `parents[3]` for repo root.
- `git push` prints a scary `NativeCommandError` but succeeds (`master -> master` at the end) — verify with `git show --stat HEAD` / log, don't retry blindly.
- Never invent numbers/endpoints in UI; missing backend data → `TODO(backend)` + hide (see CHANGES.md gaps 1–8).
- Plan mode = read-only; build mode required for edits. User runs UI at localhost:3000 and reports breakage tersely ("not working") — always re-verify with curl + check the process is alive first.
