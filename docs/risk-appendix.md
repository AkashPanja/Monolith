# Risk appendix: non-goal guardrails (R1–R5)

## R1 — No accidental HFT/market-making
`execution/` exposes only limit/market/cancel/modify (DAY, ≤2 cancel-replace per order).
CI bans `quote_both_sides`, LOB/imbalance signals in `services/`. Alert if passive-fill rate > 30%.

## R2 — No ML price regression into orders
No numeric level flows from LLM/model output into `ApprovedOrder`. Levels computed in code;
LLM gives direction + rationale + evidence. Nullish floats coerce to None → reject.
CI: `risk/` and `execution/` import zero ML symbols.

## R3 — No multi-broker live sprawl
Config allow-list `live_broker: ["fyers"]`; >1 live adapter refuses to boot. Paper always present.
Second live broker requires schema migration + full Sprint-0 re-verification.

## R4 — Backtest stays a scorer, not a simulator
`backtest/` imports no ledger/cash/fills. Independent cells, forward-alpha scoring, fixed standing book.
Sequential ledger + compounding live only in paper soak. CI import test + lookahead canary.

## R5 — Non-determinism logged, not fought
Bit-stability required only in `risk/`, `execution/`, charges, ledger.
LLM tests assert schema validity + REVIEW-sentinel behaviour, never byte equality.
Every run logs prompt-hash + model + tokens + cost.
