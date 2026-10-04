"""Paper fill model + VWAP-decomposition attribution (P4).

Fill rules (conservative by construction):
- MARKET: fills at touch (ask for BUY, bid for SELL) + slippage.
- Slippage per share = max(tick, k_spread * spread, impact_k * (qty/ADV) * mid).
- LIMIT: fills only on trade-through (bar prints strictly beyond the limit).
- STOP (protective SL): triggers on touch; gap-through-stop fills at the
  bar OPEN (gap price), never at the untradeable stop level.
- Rejections: lot violation, circuit-band breach, notional above margin.

Attribution splits realized implementation shortfall per share into
spread / impact / timing so the engine can be validated (P4): timing skill
must be >= 0 and modeled impact must track realized impact within tolerance.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from .broker import BrokerOrder, Fill


@dataclass
class Bar:
    open: float
    high: float
    low: float
    close: float
    volume: float
    bid: float
    ask: float


@dataclass
class Attribution:
    shortfall_per_share: float  # arrival mid -> avg fill, signed cost (buy positive)
    spread_per_share: float
    impact_per_share: float
    timing_per_share: float


@dataclass
class EngineConfig:
    tick_size: float = 0.05
    k_spread: float = 0.5
    impact_k: float = 0.10
    lot_size: int = 1
    circuit_frac: float = 0.20  # vs prev close; breach -> reject, never fill
    impact_tolerance_frac: float = 0.50  # P4 gate: |realized-model| <= tol*model


class PaperEngine:
    def __init__(self, config: EngineConfig | None = None) -> None:
        self.config = config or EngineConfig()

    def slippage_per_share(self, *, mid: float, spread: float, qty: int, adv: float) -> float:
        c = self.config
        impact = c.impact_k * (qty / adv) * mid if adv > 0 else 0.0
        return max(c.tick_size, c.k_spread * spread, impact)

    def process_bar(
        self,
        order: BrokerOrder,
        bar: Bar,
        *,
        adv: float,
        prev_close: Optional[float] = None,
    ) -> Fill | None:
        """Drive one open order through one bar. Returns a fill or None."""
        c = self.config
        if order.status != "OPEN":
            return None
        if order.qty % c.lot_size != 0:
            order.status = "REJECTED"
            order.reason = "LOT"
            return None
        if prev_close and abs(bar.open - prev_close) / prev_close > c.circuit_frac:
            order.status = "REJECTED"
            order.reason = "CIRCUIT"
            return None

        mid = (bar.bid + bar.ask) / 2.0
        spread = max(0.0, bar.ask - bar.bid)
        slip = self.slippage_per_share(mid=mid, spread=spread, qty=order.qty, adv=adv)

        if order.type == "MARKET":
            price = (bar.ask if order.side == "BUY" else bar.bid)
            price += slip if order.side == "BUY" else -slip
            return Fill(order.client_key, order.symbol, order.side, order.qty, round(price, 2))

        if order.type == "LIMIT" and order.limit_price is not None:
            lp = order.limit_price
            through = bar.low < lp if order.side == "BUY" else bar.high > lp
            if not through:
                return None
            price = lp + (slip if order.side == "BUY" else -slip)
            return Fill(order.client_key, order.symbol, order.side, order.qty, round(price, 2))

        if order.type == "STOP" and order.stop_price is not None:
            sp = order.stop_price
            touched = bar.low <= sp if order.side == "SELL" else bar.high >= sp
            if not touched:
                return None
            # Gap-through-stop: bar opened beyond the stop -> fill at open.
            gapped = bar.open < sp if order.side == "SELL" else bar.open > sp
            base = bar.open if gapped else sp
            price = base + (slip if order.side == "BUY" else -slip)
            return Fill(order.client_key, order.symbol, order.side, order.qty, round(price, 2))

        return None

    def attribute(
        self,
        *,
        side: Literal["BUY", "SELL"],
        arrival_mid: float,
        avg_fill: float,
        spread_at_arrival: float,
        qty: int,
        adv: float,
        post_window_mid: Optional[float] = None,
    ) -> Attribution:
        """Decompose shortfall: spread (model) + impact (model) + timing (residual).

        When post_window_mid (mid ~5 bars after the fill) is supplied, the
        caller should prefer realized_impact() below for validation: the model
        term here prices the trade, the market's reversion grades it.
        """
        sign = 1.0 if side == "BUY" else -1.0
        shortfall = sign * (avg_fill - arrival_mid)
        spread_c = 0.5 * spread_at_arrival
        impact_c = self.config.impact_k * (qty / adv) * arrival_mid if adv > 0 else 0.0
        timing = shortfall - spread_c - impact_c
        return Attribution(shortfall, spread_c, impact_c, timing)

    def realized_impact(
        self, *, side: Literal["BUY", "SELL"], arrival_mid: float, post_window_mid: float
    ) -> float:
        """Permanent-impact proxy: signed drift still present after the window."""
        sign = 1.0 if side == "BUY" else -1.0
        return sign * (post_window_mid - arrival_mid)

    def impact_within_tolerance(
        self, *, modeled: float, realized: float
    ) -> bool:
        """P4 gate: |model - realized| <= tol * max(model, tick)."""
        tol = self.config.impact_tolerance_frac
        return abs(modeled - realized) <= tol * max(modeled, self.config.tick_size)
