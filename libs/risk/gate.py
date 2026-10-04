"""Deterministic risk gate. LLM proposes, code disposes.

Evaluation order (first fail rejects, all reasons logged):
  global state -> instrument -> order integrity -> signal/threshold ->
  sizing -> portfolio caps -> P&L guards (incl. worst-case loss of this order)
  -> funds after charges -> mode checks.

Fail-closed: any unexpected error rejects the proposal. No network, no LLM,
no ML imports anywhere in this package (CI import test enforces).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time
from typing import Literal, Optional

from .coerce import coerce_optional_float
from .sizer import compute_qty

Side = Literal["BUY", "SELL"]
Mode = Literal["OFF", "PAPER", "LIVE_CONFIRM", "LIVE_AUTO"]

# Rejection reason codes (stable strings; reports and audit log match on these).
HALTED = "HALTED"
STALE_FEED = "STALE_FEED"
SESSION_INVALID = "SESSION_INVALID"
NOT_RECONCILED = "NOT_RECONCILED"
BANNED_INSTRUMENT = "BANNED_INSTRUMENT"
MISSING_STOP = "MISSING_STOP"
BAD_SIDE = "BAD_SIDE"
BAD_TICK = "BAD_TICK"
BAD_LOT = "BAD_LOT"
SIGNAL_WEAK = "SIGNAL_WEAK"
ORB_RANGE_THIN = "ORB_RANGE_THIN"
ORB_SPREAD_WIDE = "ORB_SPREAD_WIDE"
ORB_COST_DOMINATES = "ORB_COST_DOMINATES"
ORB_VOLUME_THIN = "ORB_VOLUME_THIN"
QTY_ZERO = "QTY_ZERO"
SYMBOL_CAP = "SYMBOL_CAP"
SECTOR_CAP = "SECTOR_CAP"
POSITIONS_CAP = "POSITIONS_CAP"
ORDERS_CAP = "ORDERS_CAP"
SYMBOL_TRADES_CAP = "SYMBOL_TRADES_CAP"
DAILY_LOSS = "DAILY_LOSS"
WEEKLY_LOSS = "WEEKLY_LOSS"
DRAWDOWN = "DRAWDOWN"
INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
MODE_OFF = "MODE_OFF"
NEED_APPROVAL = "NEED_APPROVAL"
ENTRY_WINDOW = "ENTRY_WINDOW"
FAIL_CLOSED = "FAIL_CLOSED"


@dataclass
class RiskLimits:
    max_capital: float
    per_trade_notional_frac: float = 0.10
    risk_to_stop_frac: float = 0.005
    daily_loss_frac: float = 0.02
    weekly_loss_frac: float = 0.04
    drawdown_frac: float = 0.08
    max_open_positions: int = 5
    max_orders_per_day: int = 30
    max_trades_per_symbol_day: int = 2
    symbol_exposure_frac: float = 0.15
    sector_exposure_frac: float = 0.40
    max_adv_frac: float = 0.01
    price_sanity_frac: float = 0.01
    gap_buffer_frac: float = 0.01  # extra adverse move assumed on worst-case loss
    signal_min: float = 0.6
    orb_min_atr_frac: float = 0.5
    orb_max_spread_ticks: int = 3
    orb_max_cost_frac: float = 0.30
    entry_start: time = time(9, 30)
    entry_end: time = time(15, 0)


@dataclass
class MarketState:
    halted: bool = False
    feed_fresh: bool = True
    session_valid: bool = True
    reconciled: bool = True


@dataclass
class PortfolioState:
    open_positions: int = 0
    orders_today: int = 0
    trades_per_symbol: dict[str, int] = field(default_factory=dict)
    symbol_notional: dict[str, float] = field(default_factory=dict)
    sector_notional: dict[str, float] = field(default_factory=dict)
    day_pnl: float = 0.0
    week_pnl: float = 0.0
    peak_equity: float = 0.0
    current_equity: float = 0.0
    funds_available: float = 0.0


@dataclass
class Proposal:
    symbol: str
    side: Side
    entry: float
    stop_loss: object = None  # untrusted: coerced; None -> MISSING_STOP
    target: Optional[float] = None
    signal: float = 1.0
    sector: str = ""
    ltp: float = 0.0
    tick_size: float = 0.05
    lot_size: int = 1
    adv_20d: float = 0.0
    # ORB evidence (P1 filter); None means "not an ORB entry, skip ORB checks".
    orb_range: Optional[float] = None
    orb_atr14: Optional[float] = None
    orb_spread_ticks: Optional[int] = None
    orb_volume_pace: Optional[float] = None  # vs session median, 1.0 = median


@dataclass
class ApprovedOrder:
    symbol: str
    side: Side
    qty: int
    entry: float
    stop_loss: float
    target: Optional[float]
    max_worst_case_loss: float


@dataclass
class GateResult:
    approved: bool
    order: Optional[ApprovedOrder]
    reasons: list[str]


def _is_multiple(price: float, tick: float) -> bool:
    if tick <= 0:
        return True
    q = round(price / tick)
    return abs(q * tick - price) <= 1e-9


def evaluate(
    proposal: Proposal,
    limits: RiskLimits,
    market: MarketState,
    portfolio: PortfolioState,
    *,
    mode: Mode = "PAPER",
    human_approved: bool = False,
    charges_estimate: float = 0.0,
    banned: frozenset[str] = frozenset(),
    now_ist: Optional[time] = None,
) -> GateResult:
    """Run the gate. Never raises: unexpected errors become FAIL_CLOSED."""
    try:
        return _evaluate(
            proposal, limits, market, portfolio,
            mode=mode, human_approved=human_approved,
            charges_estimate=charges_estimate, banned=banned, now_ist=now_ist,
        )
    except Exception:
        return GateResult(False, None, [FAIL_CLOSED])


def _reject(reason: str) -> GateResult:
    return GateResult(False, None, [reason])


def _evaluate(
    proposal: Proposal,
    limits: RiskLimits,
    market: MarketState,
    portfolio: PortfolioState,
    *,
    mode: Mode,
    human_approved: bool,
    charges_estimate: float,
    banned: frozenset[str],
    now_ist: Optional[time],
) -> GateResult:
    # 1. Global state.
    if market.halted:
        return _reject(HALTED)
    if not market.feed_fresh:
        return _reject(STALE_FEED)
    if not market.session_valid:
        return _reject(SESSION_INVALID)
    if not market.reconciled:
        return _reject(NOT_RECONCILED)

    # 2. Instrument checks.
    if proposal.symbol in banned:
        return _reject(BANNED_INSTRUMENT)

    # 3. Order integrity (SL present, correct side, lot/tick).
    stop = coerce_optional_float(proposal.stop_loss)
    if stop is None or stop <= 0:
        return _reject(MISSING_STOP)
    if proposal.side not in ("BUY", "SELL"):
        return _reject(BAD_SIDE)
    if (proposal.side == "BUY" and stop >= proposal.entry) or (
        proposal.side == "SELL" and stop <= proposal.entry
    ):
        return _reject(BAD_SIDE)
    if not _is_multiple(proposal.entry, proposal.tick_size) or not _is_multiple(stop, proposal.tick_size):
        return _reject(BAD_TICK)
    if now_ist is not None and not (limits.entry_start <= now_ist <= limits.entry_end):
        return _reject(ENTRY_WINDOW)

    # 4. Signal threshold + ORB cost filter (P1/P2).
    if proposal.signal < limits.signal_min:
        return _reject(SIGNAL_WEAK)
    if proposal.orb_range is not None:
        r = _orb_check(proposal, limits, charges_estimate)
        if r is not None:
            return r

    # 5. Sizing (computed in code, never from LLM).
    qty = compute_qty(
        entry=proposal.entry,
        stop_loss=stop,
        capital=limits.max_capital,
        risk_frac=limits.risk_to_stop_frac,
        max_notional_frac=limits.per_trade_notional_frac,
        adv_20d=proposal.adv_20d,
        max_adv_frac=limits.max_adv_frac,
        lot_size=proposal.lot_size,
    )
    if qty <= 0:
        return _reject(QTY_ZERO)
    if qty % proposal.lot_size != 0:
        return _reject(BAD_LOT)
    notional = qty * proposal.entry

    # 6. Portfolio caps.
    if portfolio.open_positions >= limits.max_open_positions:
        return _reject(POSITIONS_CAP)
    if portfolio.orders_today >= limits.max_orders_per_day:
        return _reject(ORDERS_CAP)
    if portfolio.trades_per_symbol.get(proposal.symbol, 0) >= limits.max_trades_per_symbol_day:
        return _reject(SYMBOL_TRADES_CAP)
    sym_notional = portfolio.symbol_notional.get(proposal.symbol, 0.0) + notional
    if sym_notional > limits.symbol_exposure_frac * limits.max_capital:
        return _reject(SYMBOL_CAP)
    if proposal.sector:
        sec_notional = portfolio.sector_notional.get(proposal.sector, 0.0) + notional
        if sec_notional > limits.sector_exposure_frac * limits.max_capital:
            return _reject(SECTOR_CAP)

    # 7. P&L guards including worst-case loss of THIS order.
    stop_distance = abs(proposal.entry - stop)
    worst_case = qty * stop_distance * (1.0 + limits.gap_buffer_frac)
    if portfolio.day_pnl - worst_case < -limits.daily_loss_frac * limits.max_capital:
        return _reject(DAILY_LOSS)
    if portfolio.week_pnl - worst_case < -limits.weekly_loss_frac * limits.max_capital:
        return _reject(WEEKLY_LOSS)
    if portfolio.peak_equity > 0:
        dd = (portfolio.peak_equity - (portfolio.current_equity - worst_case)) / portfolio.peak_equity
        if dd > limits.drawdown_frac:
            return _reject(DRAWDOWN)

    # 8. Funds after charges.
    if portfolio.funds_available < notional + charges_estimate:
        return _reject(INSUFFICIENT_FUNDS)

    # 9. Price sanity vs LTP + mode checks.
    if proposal.ltp > 0:
        if abs(proposal.entry - proposal.ltp) / proposal.ltp > limits.price_sanity_frac:
            return _reject(BAD_TICK)
    if mode == "OFF":
        return _reject(MODE_OFF)
    if mode == "LIVE_CONFIRM" and not human_approved:
        return _reject(NEED_APPROVAL)

    return GateResult(
        True,
        ApprovedOrder(
            symbol=proposal.symbol,
            side=proposal.side,
            qty=qty,
            entry=proposal.entry,
            stop_loss=stop,
            target=proposal.target,
            max_worst_case_loss=worst_case,
        ),
        [],
    )


def _orb_check(proposal: Proposal, limits: RiskLimits, charges_estimate: float) -> Optional[GateResult]:
    assert proposal.orb_range is not None
    if proposal.orb_atr14 and proposal.orb_atr14 > 0:
        if proposal.orb_range < limits.orb_min_atr_frac * proposal.orb_atr14:
            return _reject(ORB_RANGE_THIN)
    if proposal.orb_spread_ticks is not None:
        if proposal.orb_spread_ticks > limits.orb_max_spread_ticks:
            return _reject(ORB_SPREAD_WIDE)
    stop = coerce_optional_float(proposal.stop_loss)
    if stop is not None:
        per_share_cost = charges_estimate / max(1, compute_qty(
            entry=proposal.entry, stop_loss=stop, capital=limits.max_capital,
            risk_frac=limits.risk_to_stop_frac,
            max_notional_frac=limits.per_trade_notional_frac,
            adv_20d=proposal.adv_20d, max_adv_frac=limits.max_adv_frac,
            lot_size=proposal.lot_size,
        ))
        stop_distance = abs(proposal.entry - stop)
        if stop_distance > 0 and per_share_cost > limits.orb_max_cost_frac * stop_distance:
            return _reject(ORB_COST_DOMINATES)
    if proposal.orb_volume_pace is not None and proposal.orb_volume_pace < 1.0:
        return _reject(ORB_VOLUME_THIN)
    return None
