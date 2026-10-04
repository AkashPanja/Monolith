"""Executor: the ONLY code path that may call broker order methods.

Entry rule (CI import test enforces): callers must pass an ApprovedOrder
minted by libs/risk gate.evaluate(). Raw proposals, LLM output, hand-built
dicts are rejected at the type boundary. Idempotency: every order carries a
caller-supplied key; broker.status() is checked before any retry.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "libs"))
from risk.gate import ApprovedOrder  # noqa: E402  (PYTHONPATH=libs in compose)

from .broker import BrokerOrder, BrokerPort, Fill  # noqa: E402


@dataclass
class ExecutionReport:
    client_key: str
    status: str
    filled_qty: int = 0
    avg_fill: float = 0.0
    reason: str = ""


class Executor:
    def __init__(self, broker: BrokerPort) -> None:
        self._broker = broker

    def execute(
        self,
        order: ApprovedOrder,
        *,
        client_key: str,
        type: Literal["MARKET", "LIMIT"] = "MARKET",
        limit_price: Optional[float] = None,
    ) -> ExecutionReport:
        if not isinstance(order, ApprovedOrder):
            raise TypeError("REFUSE: order is not a gate-minted ApprovedOrder")
        if order.qty <= 0:
            raise ValueError("REFUSE: non-positive qty")
        try:
            known = self._broker.status(client_key)
            return ExecutionReport(client_key, known.status, known.filled_qty, known.avg_fill, reason="REPLAY")
        except KeyError:
            pass
        placed = self._broker.place(
            BrokerOrder(
                client_key=client_key, symbol=order.symbol, side=order.side,
                qty=order.qty, type=type, limit_price=limit_price,
            )
        )
        return ExecutionReport(client_key, placed.status, placed.filled_qty, placed.avg_fill, placed.reason)

    def cancel_before_exit(self, client_key: str) -> ExecutionReport:
        """Cancel a working SL before any software exit (AGT-4)."""
        o = self._broker.cancel(client_key)
        return ExecutionReport(client_key, o.status, o.filled_qty, o.avg_fill)

    def record_fill(self, fill: Fill) -> None:
        paper = self._broker
        apply = getattr(paper, "apply_fill", None)
        if apply is not None:
            apply(fill)
