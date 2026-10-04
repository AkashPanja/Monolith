"""Agent pipeline: Analysts -> Strategist -> Critic -> Reporter -> Gate.

Data-flow rules:
- Numbers (ATR, ORB, signal, SL, qty) are computed in code and flow DOWN.
- The LLM contributes direction + rationale + evidence refs only. Numeric
  fields in LLM output are advisory and never reach the gate.
- Critic REJECT or unparseable output -> proposal dropped as REVIEW, never
  silently converted to Hold/BUY.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "libs"))
from risk.gate import (  # noqa: E402
    GateResult,
    MarketState,
    PortfolioState,
    Proposal,
    RiskLimits,
    evaluate,
)

from .indicators import Bar, atr, orb_levels, signal_strength  # noqa: E402
from .llm import LLMProvider, MockProvider  # noqa: E402

Direction = Literal["BUY", "SELL", "HOLD"]


@dataclass
class AnalystReport:
    symbol: str
    orb_high: float
    orb_low: float
    orb_range: float
    atr14: float
    volume_pace: float
    spread_ticks: int
    last: float
    news_stance: str = "NEUTRAL"


@dataclass
class StrategySignal:
    symbol: str
    direction: Direction
    strength: float
    entry: float
    stop_loss: float
    target: float
    rationale: str
    evidence_refs: list[str] = field(default_factory=list)


@dataclass
class PlanResult:
    symbol: str
    report: AnalystReport | None
    signal: StrategySignal | None
    critic_verdict: str = "SKIP"
    gate: GateResult | None = None
    status: str = "REVIEW"  # APPROVED | REJECTED:<code> | REVIEW | HOLD


def analyze(
    symbol: str,
    bars: list[Bar],
    *,
    spread_ticks: int,
    tick_size: float,
    news_stance: str = "NEUTRAL",
    median_volume: float = 0.0,
) -> AnalystReport | None:
    """Technical analyst (code) + news stance (LLM-classified upstream)."""
    if len(bars) < 16:
        return None
    orb = orb_levels(bars, median_volume=median_volume)
    if orb is None:
        return None
    return AnalystReport(
        symbol=symbol,
        orb_high=orb.high,
        orb_low=orb.low,
        orb_range=orb.range,
        atr14=orb.atr14,
        volume_pace=orb.volume_pace,
        spread_ticks=spread_ticks,
        last=bars[-1].close,
        news_stance=news_stance,
    )


def strategize(
    report: AnalystReport,
    provider: LLMProvider,
    *,
    tick_size: float = 0.05,
) -> StrategySignal | None:
    """Strategist: code computes strength + code computes levels; the LLM
    contributes direction + rationale + evidence. SELL logic mirrors BUY."""
    s = signal_strength(
        breakout=max(0.0, report.last - report.orb_high),
        atr14=report.atr14,
        volume_pace=report.volume_pace,
        spread_ticks=report.spread_ticks,
    )
    stop_distance = max(tick_size * 4, 0.5 * report.atr14)
    entry = report.last
    out = provider.complete(task="strategist", context={
        "symbol": report.symbol, "signal": s, "news_stance": report.news_stance,
    })
    direction = out.get("direction", "HOLD")
    if direction not in ("BUY", "SELL", "HOLD"):
        return None  # unparseable -> REVIEW upstream
    if direction == "HOLD" or s < 0.6:
        return StrategySignal(report.symbol, "HOLD", s, entry, entry, entry,
                              str(out.get("rationale", "")), list(out.get("evidence_refs", [])))
    stop = entry - stop_distance if direction == "BUY" else entry + stop_distance
    target = entry + 2 * stop_distance if direction == "BUY" else entry - 2 * stop_distance

    def snap(px: float) -> float:
        q = round(px / tick_size)
        return round(q * tick_size, 2)

    entry, stop, target = snap(entry), snap(stop), snap(target)
    # Re-derive distance after snapping so SL stays on the correct side.
    if direction == "BUY" and stop >= entry:
        stop = round(entry - 4 * tick_size, 2)
    if direction == "SELL" and stop <= entry:
        stop = round(entry + 4 * tick_size, 2)
    return StrategySignal(
        symbol=report.symbol, direction=direction, strength=s,
        entry=entry, stop_loss=stop, target=target,
        rationale=str(out.get("rationale", "")),
        evidence_refs=list(out.get("evidence_refs", [])),
    )


def critique(signal: StrategySignal, provider: LLMProvider) -> str:
    out = provider.complete(task="critic", context={
        "symbol": signal.symbol, "direction": signal.direction,
        "evidence_refs": signal.evidence_refs,
        "stop_distance": abs(signal.entry - signal.stop_loss),
    })
    verdict = out.get("verdict", "REJECT")
    return verdict if verdict in ("APPROVE", "REJECT") else "REJECT"


def run_symbol(
    symbol: str,
    bars: list[Bar],
    limits: RiskLimits,
    market: MarketState,
    portfolio: PortfolioState,
    *,
    provider: LLMProvider | None = None,
    spread_ticks: int = 2,
    tick_size: float = 0.05,
    lot_size: int = 1,
    adv_20d: float = 1_000_000.0,
    sector: str = "",
    news_stance: str = "NEUTRAL",
    median_volume: float = 0.0,
) -> PlanResult:
    """Full pipeline for one symbol: analyze -> strategize -> critique -> gate."""
    provider = provider or MockProvider()
    report = analyze(symbol, bars, spread_ticks=spread_ticks, tick_size=tick_size,
                     news_stance=news_stance, median_volume=median_volume)
    if report is None:
        return PlanResult(symbol, None, None, status="REVIEW")
    signal = strategize(report, provider, tick_size=tick_size)
    if signal is None:
        return PlanResult(symbol, report, None, status="REVIEW")
    if signal.direction == "HOLD":
        return PlanResult(symbol, report, signal, critic_verdict="SKIP", status="HOLD")

    verdict = critique(signal, provider)
    if verdict != "APPROVE":
        return PlanResult(symbol, report, signal, critic_verdict=verdict, status="REVIEW")

    proposal = Proposal(
        symbol=symbol, side=signal.direction, entry=signal.entry,
        stop_loss=signal.stop_loss, target=signal.target,
        signal=signal.strength, sector=sector, ltp=report.last,
        tick_size=tick_size, lot_size=lot_size, adv_20d=adv_20d,
        orb_range=report.orb_range, orb_atr14=report.atr14,
        orb_spread_ticks=report.spread_ticks, orb_volume_pace=report.volume_pace,
    )
    gate = evaluate(proposal, limits, market, portfolio)
    status = "APPROVED" if gate.approved else f"REJECTED:{gate.reasons[0]}" if gate.reasons else "REJECTED"
    return PlanResult(symbol, report, signal, critic_verdict=verdict, gate=gate, status=status)


def render_plan(results: list[PlanResult]) -> str:
    """Reporter: 08:30 plan markdown for WhatsApp + dashboard."""
    lines = ["# Pre-market plan", ""]
    for r in results:
        if r.signal is None:
            lines.append(f"- {r.symbol}: insufficient data (REVIEW)")
            continue
        s = r.signal
        lines.append(
            f"- {r.symbol}: {s.direction} s={s.strength:.2f} "
            f"entry={s.entry} SL={s.stop_loss} T={s.target} [{r.status}]"
        )
        if s.rationale:
            lines.append(f"  rationale: {s.rationale}")
    return "\n".join(lines)
