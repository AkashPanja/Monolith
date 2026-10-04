# Execution patches P1–P6 (whitepaper-backed)

Source: Almgren–Chriss execution, Fetna 2026 ORB negative result, Rosa 2022 intraday momentum,
NSE microstructure (Agarwalla; Sampath & Gopalaswamy 2020).

## P1 — Cost-aware ORB filter
Break eligible only if: range ≥ 0.5× ATR(14), spread ≤ 3 ticks,
projected costs ≤ 30% of stop distance, volume ≥ session-median pace.
Reject reasons: `ORB_RANGE_THIN` / `ORB_SPREAD_WIDE` / `ORB_COST_DOMINATES` / `ORB_VOLUME_THIN`.
Accept: filtered ORB ≥ +0.5R net uplift vs naive ORB, ≥40% fewer trades, ≥60 NSE sessions.

## P2 — Threshold-gated entries
Strategist emits `s ∈ [0,1]`; gate admits only `s ≥ 0.6` (sweep 0.4–0.8 in paper, ship curve).
Accept: gated net expectancy > always-on at equal capital, lower max intraday DD.

## P3 — POV square-off schedule
From 15:10 (or kill): slices ≤ 5% rolling volume, limit-ladder; market dump only if exchange-mandated.
Idempotency keys on retries. Accept: slippage ≤ 50% of dump baseline over ≥20 sessions; zero dup fills on kill+restart chaos.

## P4 — VWAP-decomposition validation
Paper fills attributed: timing vs impact vs spread/fees on 1–5 min bars.
Breach of `impact(qty/ADV)` model tolerance blocks G2→G3. G1 requires green decomposition on a full simulated day.

## P5 — Charges v0 + contract-note lock
`infra/charges_schedule.v0.json` placeholder, all `# VERIFY`. 1% reconciliation tolerance vs real note blocks G2→G3.

## P6 — Dashboard proof surfaces
Cost-waterfall panel + filtered-out counter (P1/P2 telemetry) on Performance/Risk pages.
