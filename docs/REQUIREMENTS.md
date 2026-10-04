# Monolith — Requirements (Atlas v2.1, consolidated 4 Oct 2026)

Personal NSE/BSE cash-equity algo trader. Self-hosted, single owner, paper-first.
Merges Cobalt (PRD) + Meridian (architecture) + whitepaper patches (P1–P6) + risk guardrails (R1–R5).
UI/UX is specified separately (see `AGENTS.md`); this file covers product, architecture,
trading logic, safety, and delivery. Items marked `# VERIFY` are unconfirmed broker/regulatory facts.

## 0. Reality check (read first)

- A "₹999,999 billion" book cannot run through a retail broker API: market impact, SEBI limits and
  liquidity break the model long before that. Monolith targets a **bounded, configured `max_capital`**
  with a hard liquidity cap (order ≤ 1% of 20-day ADV). Institutional scale needs a different system.
- **Employer compliance:** personal algo trading at a regulated asset manager usually needs
  pre-clearance under the personal-account dealing policy. Check before going live. Not legal advice.
- **No guarantees.** Paper results are evidence, not proof. Stops can gap. This is a personal
  automation tool, not investment advice; **owner-only** delivery of plans.

## 1. Product principles

P1 Safety > autonomy · P2 Paper default · P3 Hard limits, no bypass path · P4 Everything auditable ·
P5 Untrusted input stays untrusted · P6 Providers are adapters.

**Modes:** `OFF` → `PAPER` (default) → `LIVE_CONFIRM` (each order approved) → `LIVE_AUTO`.
Going live needs step-up auth, a typed phrase, and the promotion checklist (§10).

**Decisions locked:** stack FastAPI + React + Postgres 16 via Docker Compose; monorepo
(`apps/web`, `services/*`, `libs/*`); project name **Monolith**;
`https://github.com/AkashPanja/Monolith`.

## 2. Architecture

Containers: `caddy` (TLS) · `api` (FastAPI) · `worker` (agents + scheduler) ·
**`watchdog`** (separate process; owns square-off and kill — never merged into worker) ·
`notifier` (outbox sender) · `web` (React) · `postgres` · `openwa` (internal network only).
Access via Tailscale/WireGuard, never public.

**Hard rules (CI grep/AST enforces):**
- Only `services/execution/` may call broker order methods, and only with an `ApprovedOrder`
  minted by `libs/risk` gate. Paper and live share the pipeline up to the final adapter.
- Gate has no LLM/network/ML; fails closed on any error. No numeric level flows from LLM output
  into `ApprovedOrder` — levels are computed in code; LLM gives direction + rationale + evidence only.
- LLM never sees keys, account IDs, or balances. Never log secrets. No config/secret tools for the LLM.
- `backtest/` imports no ledger: decision-grid scoring only (forward alpha, independent cells).
  Sequential ledger lives in paper soak.
- One live broker (`fyers`) by config allow-list; >1 live adapter refuses to boot. Paper always present.

## 3. Daily lifecycle (IST, NSE-calendar aware, U-shaped: active open/close, quiet midday)

| Time | Job | Output |
| --- | --- | --- |
| 06:00 | Pre-flight: broker token, LLM, WhatsApp session, NTP, DB | Health; **skip day + alert if broker/data fails** |
| 07:30 | Overnight research (filings, news, global cues) | Research notes |
| 08:30 | Pre-market plan; screeners → shortlist (≤20) | Plan → WhatsApp + Gmail + dashboard |
| 09:15–09:30 | Opening-range capture (levels only) | Levels |
| 09:30–15:00 | Gated entry window: signal → proposal → gate → execute; news watcher | Orders, journal events |
| 15:10 | Own MIS square-off: POV schedule (≤5% rolling volume, limit-ladder) | Flat book |
| 15:25 | If any MIS open: **CRITICAL** alert on all channels | Manual action |
| 16:00 | Mover marking + journal | Flags |
| 16:30 | EOD report (paper + live) | WhatsApp summary, Gmail PDF |
| 20:00 | Next-day outlook (feeds 08:30 plan) | Follow-up list |

## 4. Security and access

- **SEC-1** Tailnet-only, TLS, strict CORS/CSP, rate limits.
- **SEC-2** Argon2id, **mandatory TOTP**, 15-min access + rotating refresh (reuse revokes family).
- **SEC-3** **Step-up auth** for: going live, raising limits, changing credentials, resuming after kill, exports.
- **SEC-4** Secrets encrypted (AES-256-GCM), master key via Docker secret, write-only in UI,
  rotation reminders with dual-key overlap.
- **SEC-5** Non-root containers, separate DB roles, no Docker socket, secrets redacted from logs/prompts.
- **SEC-6** Prompt-injection defences: LLM has no tools; schema-only output; sanitized, length-capped text;
  Tier-1 or ≥2 independent sources for news-driven trades.
- Current state: dev API uses scrypt + TOTP + 15-min JWT + file-backed dev store;
  Postgres + AES vault land in Sprint 1.

## 5. Brokers and data

- **BRK-1** `BrokerPort` interface (auth, funds, positions, orders, place/modify/cancel, quotes,
  history, stream). Adapters: Fyers (live, stub locked), Paper (in-memory, working).
- **BRK-2** Session manager: automated refresh where allowed, else one-tap login prompt; no live
  orders on invalid session. **# VERIFY** token lifecycle.
- **BRK-3** Reconciliation at startup and every 5 min in live; drift → HALT + alert.
- **BRK-4** Static-IP / algo-registration under SEBI retail framework: **# VERIFY with Fyers**.
- **DATA-1** 1-min bars minimum (decided: **Fyers History API**, NSE cash); missing bars → skip day + alert.
  WebSocket quotes; stale-feed detector (>N s → halt new entries). Instrument master daily; holiday calendar weekly.
- **DATA-2** Indicators computed in code only, never by the LLM. Hard exclusions before the LLM sees a name:
  ASM/GSM, T2T, illiquid, corporate action today, circuit-locked.

## 6. Agent pipeline and research

- **AGT-1** Pipeline: News Analyst → Technical (code indicators) → bull/bear researcher debate →
  Strategist → **Critic** → Reporter, each with typed I/O. Levels flow down from code; LLM outputs
  direction + rationale + evidence refs; unparseable output → `REVIEW`, never `Hold`.
- **AGT-2** Proposal: `symbol, side, product, entry, stop_loss, targets, confidence, rationale,
  evidence_refs, expiry`. **No stop-loss = auto-reject.** LLM nullish floats (`"15%"`, `"150-160"`)
  coerce to `None` → reject.
- **AGT-3** **Quantity is computed by the position sizer**, never the LLM:
  `qty = floor(min(R·C/|entry−SL|, 10%·C/entry, 1%·ADV)/lot)·lot`, tick-snapped.
- **AGT-4** Exits are deterministic: broker-side SL on fill + software trailing; cancel SL before any software exit.
- **AGT-5** Cool-down after stop-out; pause after N consecutive losses; "why didn't you trade X?" explain mode.
- **LLM-1** Provider adapter (Anthropic + OpenAI-compatible `base_url`); model IDs are config; per-task
  routing with quick/deep tiers on separate providers; daily budget cap; prompt versions + hashes logged.
  Reasoning models are accepted as non-deterministic (logged, not fought); determinism is required only
  in `risk/`, `execution/`, charges, ledger.
- **MOV-1** After close, flag watchlist stocks moving > ±2% (or >1.5× ATR%) or with volume/gap anomaly;
  append-only Markdown journal (cause, levels, what to watch); carry as `FOLLOW_UP` for 3 days; settle
  each with realized + alpha return and a one-line reflection the next 08:30 plan must ingest; T+1/T+3 outcomes → hit-rate.

## 7. Risk gate (defaults conservative, set at setup)

| Limit | Default |
| --- | --- |
| `max_capital` | required, no default |
| per-trade notional / risk-to-stop | 10% / 0.5% of capital |
| daily / weekly loss, drawdown | 2% / 4% / 8% |
| open positions, orders/day, trades/symbol/day | 5 / 30 / 2 |
| symbol / sector exposure | 15% / 40% |
| order vs ADV, price-sanity band | ≤1% / 1% of LTP |
| gap buffer on worst-case order loss | 1% |
| entry window, square-off | 09:30–15:00, 15:10 POV schedule |

**Evaluation order (first fail rejects, all reasons logged):** global state (not HALTED, feed fresh,
session valid, reconciled) → instrument checks → order integrity (SL present, correct side, lot/tick) →
signal/threshold → sizing → portfolio caps → P&L guards **including worst-case loss of this order** →
funds after charges → price sanity → mode checks. **Fail closed** on any error. The AI cannot read or write limits.

**Evidence-backed filters (whitepaper patches):**
- **P1 — Cost-aware ORB:** break eligible only if range ≥ 0.5× ATR(14), spread ≤ 3 ticks,
  projected charges + slippage ≤ 30% of stop distance, volume ≥ session-median pace.
  Reasons: `ORB_RANGE_THIN` / `ORB_SPREAD_WIDE` / `ORB_COST_DOMINATES` / `ORB_VOLUME_THIN`.
  (Naive ORB is net-negative after costs — Fetna 2026, 225-cell pre-registered study.)
- **P2 — Threshold-gated entries:** Strategist signal `s ∈ [0,1]` (0.5 expansion + 0.35 participation +
  0.15 spread-ok); admit only `s ≥ 0.6` (decided default; calibrate 0.4–0.8 in paper, ship curve).
  (Always-on intraday momentum decays out-of-sample — Rosa 2022.)

## 8. Paper trading and execution

- Real live data; fills at touch plus `max(tick, 0.5·spread, 0.1·qty/ADV·mid)` slippage;
  limit orders fill only on trade-through; gap-through-stop fills at gap (bar open) price;
  300–800 ms latency; real rejections (circuit, lot, margin). Single-fill model v1 (partials average in v2).
- Idempotency keys on every order; check-status-before-retry (duplicate key replays stored state).
- **P3 — POV square-off:** from 15:10 (or kill), slices ≤ 5% rolling volume, limit-ladder; market dump
  only if exchange-mandated. Accept: slippage ≤ 50% of dump baseline over ≥20 sessions; zero dup fills on kill+restart.
- **Charges** via effective-dated `charges_schedule` (`infra/charges_schedule.v0.json`, every rate `# VERIFY`;
  lock against first real Fyers contract note, 1% tolerance blocks G2→G3). Reports are **net of costs**,
  plus a pessimistic "live-equivalent" re-price. In live mode every decision is also shadow-simulated.
- **P4 — VWAP attribution:** every paper fill split into timing vs impact vs spread/fees against 1–5 min bars;
  modeled impact must track measured post-trade reversion within tolerance, else G2→G3 is blocked.

## 9. Quantitative layer

All computed in code, versioned, unit-tested against hand-worked cases.
Position size (§6 AGT-3) · R-multiple `(exit − entry)·side / |entry − SL|` ·
Expectancy `E = p·W̄ − (1−p)·L̄` (R, 95% CI bootstrap, warn if trades < 50) ·
Profit factor `Σ wins / Σ |losses|` · Max drawdown · Sharpe/Sortino (daily net, ×√252) ·
Kelly `f* = p − (1−p)/b` capped at ¼·f\* as an upper bound, never the sizer ·
Daily VaR 95% (info, next to loss limit) · Gap buffer `qty·|entry−SL|·1.01` ·
Benchmark alpha/beta vs Nifty 50 (`.NS`) and Sensex (`.BO`) via OLS · Charges drag `Σ charges / Σ gross P&L` ·
Implementation-shortfall attribution (P4) · threshold-sensitivity curve (P2).

**Invariants (property tests):** for any random sequence of proposals/fills/prices, deployed notional ≤
`max_capital`, per-symbol/sector caps hold, and the daily-loss halt fires at or before the limit
(within the gap buffer).

## 10. Reporting, comms, and promotion

- **WhatsApp (OpenWA, dedicated number, internal network only)** is the day-to-day console; reverse-engineered
  clients risk bans, so **Telegram + Gmail are mandatory fallbacks** for CRITICAL. **# VERIFY** OpenWA endpoints/auth/webhook in Sprint 0.
- Outbound via outbox (≤20 msgs/day, quiet hours except CRITICAL): 08:30 PLAN · TRADE open/close ·
  ALERT (limit ≥80%, halt, stale feed, session, budget 80%) · CRITICAL on **all** channels
  (square-off failed, reconciliation drift, kill) · 16:30 EOD (net P&L gross/charges, W/L, limit use,
  movers, focus, PDF link).
- Inbound (HMAC + allow-list + rate limit + audit, fixed grammar — never LLM instructions):
  `status`, `pnl`, `positions`, `plan`, `why <SYMBOL>` (reads), `pause`, `kill` (PIN, immediate),
  `approve <id>` / `reject <id>` (PIN + expiry + gate re-check). Anything else → "Use dashboard".
  Cannot raise limits, resume after kill, or enable live.
- Reports: pre-market plan 08:30 · EOD 16:30 · outlook 20:00 · weekly Fri 17:00 / month-end
  (equity curve, drawdown, Sharpe/Sortino, profit factor, stock/sector/hour splits, vs Nifty,
  charges waterfall, paper-vs-live divergence). Dashboard proof surfaces: cost-waterfall panel +
  filtered-out counter (P1/P2 telemetry). Immutable snapshots with data version; sample-size
  warnings when applicable. Formats: dashboard, HTML email + PDF, Markdown, trades CSV (for CA).
- **Promotion checklist (on demand):** ≥20 trading days, ≥50 trades, net expectancy > 0 (CI shown),
  max DD < 6%, 0 limit breaches, divergence within tolerance.
- Retention: orders/audit 8 yrs, raw news 90 days. Nightly encrypted backup + monthly restore test.

## 11. Data model (core)

`users/sessions/totp` · `broker_accounts` · `instruments` · `config_versions` · `watchlist_items` ·
`ohlcv` (1-min) · `news_items` · `agent_runs` (prompt hash, model, tokens, cost) · `plans` ·
`proposals` (+gate_result) · `orders`/`order_events`/`fills` (mode, idempotency_key) · `positions` ·
`ledger_entries` (double-entry) · `charges_schedule` · `mover_flags`/`journal_entries` ·
`reports` · `outbox`/`notification_deliveries` · `audit_log` (hash-chained, DB role without UPDATE/DELETE) ·
`llm_providers`/`llm_routes`.

## 12. Test strategy and release gates

Unit (gate, sizer, charges vs contract notes, fill model) · property tests (§9) · broker/LLM contract tests ·
full simulated day · security (injection corpus, gitleaks) · chaos (feed drop, token expiry, DB restart,
clock jump, WhatsApp ban). Coverage ≥85%, **100% branch on `risk/`**, `mypy --strict` on `risk/` + `execution/`.

| Gate | Criteria |
| --- | --- |
| G1 Paper alpha | all tests green, 0 invariant failures, full simulated day; naive ORB fails while filtered ORB shows ≥+0.5R net uplift with ≥40% fewer trades; VWAP decomposition green |
| G2 Paper soak | ≥20 trading days, 0 breaches, jobs ≥99% on time, gated expectancy > always-on, charges within 1% of contract note |
| G3 Live-confirm | security review, static-IP verified, tiny `max_capital`, ≥10 days, divergence in tolerance |
| G4 Live-auto | G3 clean, explicit step-up + typed phrase |

## 13. Non-goals and guardrails (R1–R5, CI-enforced where noted)

- **No HFT/market-making:** execution exposes limit/market/cancel/modify only (DAY, ≤2 cancel-replace);
  no quoting loops; alert if passive-fill rate > 30%.
- **No ML price regression into orders:** levels are code-computed, always. (Details: `docs/risk-appendix.md`.)
- **No multi-broker live sprawl:** single live adapter; second requires schema migration + full re-verification.
- **No backtest-as-simulator:** grid evaluator scores ratings on forward alpha; no fills/cash/compounding.
- **Non-determinism logged, not fought:** bit-stability required only in `risk/`, `execution/`, charges, ledger.
- NFRs: restart-safe (live restarts in HALT) · signal→gate ≤1 s excl. LLM · 99% availability 08:00–16:30 ·
  UTC internally / IST display · compose resource limits, graceful SIGTERM.

## 14. Build plan (8 sprints; status 4 Oct 2026)

| # | Scope | Status |
| --- | --- | --- |
| 0 | Repo, CI, compose, **# VERIFY** research (Fyers token/static-IP/algo rules, charges, OpenWA API, 1-min bars) | partial (repo, compose file; verifies open) |
| 1 | Auth, 2FA, step-up, secrets vault, audit chain, config versioning | partial (dev auth+TOTP+JWT in api; vault/audit pending) |
| 2 | Broker interface, Fyers read-only, market data, calendar, indicators, stale-feed detector | partial (BrokerPort, PaperBroker, ATR/ORB/signal in code) |
| 3 | Risk gate, sizer, watchdog, kill switch, paper engine, charges, ledger (property tests) | partial (gate+sizer+paper+21+9 tests; watchdog/kill/ledger pending) |
| 4 | LLM adapters, news ingest, classifier, agent pipeline, plan → gate → paper | partial (pipeline+gate wiring+10 tests on mock provider; live adapters/news pending) |
| 5 | Movers/journal loop, reports, dashboard | partial (dashboard shell; movers/reports pending) |
| 6 | Notifier: OpenWA WhatsApp, Telegram, Gmail, commands, outbox, fallbacks | pending |
| 7 | Live path (guarded), reconciliation, shadow-paper, divergence; hardening, backups, chaos, soak | pending |

**Coding-agent safety rules:** only `execution/` calls broker orders with `ApprovedOrder`; gate has no LLM/network
I/O and fails closed; LLM output is schema-validated and never reaches the broker; no config/secret tools for
the LLM; default mode PAPER; never log secrets; tests first for `risk/`, `execution/`, charges; mark unverified
broker facts `# VERIFY`; stop and ask on ambiguity.

## 15. Open inputs (remaining)

1. `max_capital` and daily loss tolerance. 2. Hosting: home NAS vs static-IP VPS.
3. Intraday only, or delivery too? 4. News sources for Sprint 4. 5. Hard-banned stocks/sectors.
6. Confirm employer pre-clearance (§0). Decided already: Fyers 1-min bars · `s_min = 0.6` ·
   charges v0 placeholder · POV square-off ≤5% · single live broker `fyers`.
