"""Trading read models + kill. Fixture market data until worker lands."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from .. import security, store

router = APIRouter()


def _authed(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token.")
    sub = security.check_token(authorization[7:])
    if not sub:
        raise HTTPException(401, "Expired or invalid token.")
    return sub


@router.get("/health")
def health() -> dict:
    return {
        "broker": "ok", "feed": "ok", "llm": "warn", "whatsapp": "down",
        "mode": store.load()["mode"],
    }


@router.get("/mode")
def mode(authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)
    return {"mode": store.load()["mode"]}


@router.get("/pnl")
def pnl(authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)
    return {"gross": 12480, "charges": 1312, "net": 11168}


@router.get("/limits")
def limits(authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)
    return {"limits": [
        {"name": "Daily loss", "usedPct": 22},
        {"name": "Positions", "usedPct": 40},
        {"name": "Orders / day", "usedPct": 13},
        {"name": "Symbol exposure", "usedPct": 61},
    ]}


@router.get("/positions")
def positions(authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)
    return {"positions": [
        {"symbol": "RELIANCE", "qty": 40, "avgPrice": 2984.2, "ltp": 2997.5, "pnl": 532},
        {"symbol": "HDFCBANK", "qty": 60, "avgPrice": 1642.0, "ltp": 1638.1, "pnl": -234},
    ]}


@router.get("/proposals")
def proposals(authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)
    return {"proposals": [
        {"id": "p-101", "symbol": "INFY", "side": "BUY", "entry": 1872.4,
         "stopLoss": 1858.0, "target": 1901.0, "confidence": 0.72,
         "reason": "ORB expansion + volume pace, spread 2 ticks."},
    ]}


class KillBody(BaseModel):
    reason: str
    phrase: str


@router.post("/kill")
def kill(body: KillBody, authorization: str | None = Header(default=None)) -> dict:
    _authed(authorization)  # step-up: typed phrase required on top of the JWT
    if body.phrase != "HALT ALL":
        raise HTTPException(422, "Typed phrase does not match.")
    if not body.reason:
        raise HTTPException(422, "Reason required.")
    data = store.load()
    data["mode"] = "OFF"
    data["killed"] = True
    store.save(data)
    return {"ok": True, "mode": "OFF"}
