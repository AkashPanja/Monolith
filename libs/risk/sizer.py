"""Deterministic position sizer. Pure arithmetic: no I/O, no network, no ML.

qty = floor( min( risk_budget / stop_distance, max_notional / entry,
                  max_adv_qty ) / lot_size ) * lot_size
"""

from __future__ import annotations

import math


def compute_qty(
    *,
    entry: float,
    stop_loss: float,
    capital: float,
    risk_frac: float = 0.005,
    max_notional_frac: float = 0.10,
    adv_20d: float = 0.0,
    max_adv_frac: float = 0.01,
    lot_size: int = 1,
) -> int:
    stop_distance = abs(entry - stop_loss)
    if not (math.isfinite(entry) and math.isfinite(stop_loss)):
        return 0
    if entry <= 0 or stop_loss <= 0 or stop_distance <= 0 or capital <= 0 or lot_size <= 0:
        return 0
    risk_qty = (risk_frac * capital) / stop_distance
    notional_qty = (max_notional_frac * capital) / entry
    qty = min(risk_qty, notional_qty)
    if adv_20d > 0:
        qty = min(qty, max_adv_frac * adv_20d)
    lots = math.floor(qty / lot_size)
    return max(0, lots * lot_size)
