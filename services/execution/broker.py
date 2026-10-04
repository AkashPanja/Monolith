"""Broker adapters. Exactly ONE live adapter may exist per process (R3).

PaperBroker is fully functional (in-memory). FyersBroker is a typed stub:
every order path raises until Sprint-0 verifies (token lifecycle, MIS
semantics, SL order types) are locked. Mark live-broker facts # VERIFY.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Literal, Optional

OrderType = Literal["MARKET", "LIMIT", "STOP"]
OrderStatus = Literal["OPEN", "FILLED", "CANCELLED", "REJECTED"]


@dataclass
class BrokerOrder:
    client_key: str  # idempotency key, caller-supplied
    symbol: str
    side: Literal["BUY", "SELL"]
    qty: int
    type: OrderType
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    status: OrderStatus = "OPEN"
    avg_fill: float = 0.0
    filled_qty: int = 0
    reason: str = ""


@dataclass
class Fill:
    client_key: str
    symbol: str
    side: Literal["BUY", "SELL"]
    qty: int
    price: float
    charge: float = 0.0


class BrokerPort(ABC):
    @abstractmethod
    def place(self, order: BrokerOrder) -> BrokerOrder: ...
    @abstractmethod
    def cancel(self, client_key: str) -> BrokerOrder: ...
    @abstractmethod
    def status(self, client_key: str) -> BrokerOrder: ...
    @abstractmethod
    def positions(self) -> dict[str, int]: ...


class PaperBroker(BrokerPort):
    """In-memory broker. Fills are driven by PaperEngine bars, not here."""

    def __init__(self) -> None:
        self.orders: dict[str, BrokerOrder] = {}
        self._positions: dict[str, int] = {}

    def place(self, order: BrokerOrder) -> BrokerOrder:
        existing = self.orders.get(order.client_key)
        if existing is not None:
            return existing  # check-status-before-retry: duplicate key replays stored state
        if order.qty <= 0:
            order.status = "REJECTED"
            order.reason = "QTY_ZERO"
        self.orders[order.client_key] = order
        return order

    def cancel(self, client_key: str) -> BrokerOrder:
        o = self.orders[client_key]
        if o.status == "OPEN":
            o.status = "CANCELLED"
        return o

    def status(self, client_key: str) -> BrokerOrder:
        return self.orders[client_key]

    def positions(self) -> dict[str, int]:
        return dict(self._positions)

    def apply_fill(self, fill: Fill) -> None:
        o = self.orders[fill.client_key]
        o.filled_qty += fill.qty
        o.avg_fill = fill.price  # single-fill model v1; partials average in v2
        if o.filled_qty >= o.qty:
            o.status = "FILLED"
        signed = fill.qty if fill.side == "BUY" else -fill.qty
        self._positions[fill.symbol] = self._positions.get(fill.symbol, 0) + signed


class FyersBroker(BrokerPort):
    """Live adapter stub. # VERIFY: token lifecycle, MIS timings, SL order types."""

    def __init__(self, *_: object, **__: object) -> None:
        raise NotImplementedError("FyersBroker locked until Sprint-0 verifies (BRK-2/BRK-4).")

    def place(self, order: BrokerOrder) -> BrokerOrder:
        raise NotImplementedError

    def cancel(self, client_key: str) -> BrokerOrder:
        raise NotImplementedError

    def status(self, client_key: str) -> BrokerOrder:
        raise NotImplementedError

    def positions(self) -> dict[str, int]:
        raise NotImplementedError


_live_broker_created = False


def create_live_broker(kind: str) -> BrokerPort:
    """Allow-list gate: >1 live adapter in a process refuses to boot (R3)."""
    global _live_broker_created
    if kind != "fyers":
        raise ValueError(f"live broker {kind!r} not in allow-list ['fyers']")
    if _live_broker_created:
        raise RuntimeError("REFUSE_BOOT: second live adapter requested")
    _live_broker_created = True
    return FyersBroker()


def reset_live_broker_flag_for_tests() -> None:
    global _live_broker_created
    _live_broker_created = False
