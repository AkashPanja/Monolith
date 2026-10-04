"""Code-computed market facts. Indicators live here, never in the LLM.

All functions are pure and deterministic: same bars in, same numbers out.
The LLM receives these numbers as quoted context; it may not invent its own.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Bar:
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class OrbLevels:
    high: float
    low: float
    range: float
    atr14: float
    volume_pace: float  # range-window volume vs session median pace


def atr(bars: list[Bar], period: int = 14) -> float:
    """Wilder ATR over trailing `period` bars. Needs period+1 bars minimum."""
    if len(bars) < period + 1:
        return 0.0
    trs = []
    for i in range(len(bars) - period, len(bars)):
        h, l, pc = bars[i].high, bars[i].low, bars[i - 1].close
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sum(trs) / len(trs)


def orb_levels(bars: list[Bar], open_bars: int = 15, median_volume: float = 0.0) -> OrbLevels | None:
    """Opening-range levels from the first `open_bars` 1-min bars."""
    if len(bars) < open_bars:
        return None
    window = bars[:open_bars]
    hi = max(b.high for b in window)
    lo = min(b.low for b in window)
    vol = sum(b.volume for b in window)
    pace = (vol / median_volume) if median_volume > 0 else 0.0
    return OrbLevels(high=hi, low=lo, range=hi - lo, atr14=atr(bars), volume_pace=pace)


def signal_strength(
    *,
    breakout: float,  # distance beyond ORB edge, in price units
    atr14: float,
    volume_pace: float,
    spread_ticks: int,
    max_spread_ticks: int = 3,
) -> float:
    """Normalized entry signal s in [0,1]. Threshold-gated downstream (P2).

    Rewards ATR-normalized expansion + volume participation, punishes wide
    spreads. Calibrated so ordinary noise scores ~0.2-0.4 and genuine
    expansion with participation clears 0.6.
    """
    if atr14 <= 0:
        return 0.0
    expansion = min(1.0, max(0.0, breakout / atr14))
    participation = min(1.0, max(0.0, volume_pace / 1.5))
    spread_ok = 1.0 if spread_ticks <= max_spread_ticks else max(
        0.0, 1.0 - 0.25 * (spread_ticks - max_spread_ticks))
    return round(0.5 * expansion + 0.35 * participation + 0.15 * spread_ok, 4)
