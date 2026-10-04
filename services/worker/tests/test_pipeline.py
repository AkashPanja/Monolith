import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "libs"))

from worker.indicators import atr, signal_strength  # noqa: E402
from worker.llm import MockProvider  # noqa: E402
from worker.pipeline import analyze, render_plan, run_symbol  # noqa: E402
from worker.indicators import Bar  # noqa: E402
from risk.gate import MarketState, PortfolioState, RiskLimits  # noqa: E402


def flat_bars(n, px=1870.0, rng=2.0, vol=10000.0):
    return [Bar(px, px + rng / 2, px - rng / 2, px, vol) for _ in range(n)]


def test_atr_flat_is_range():
    bars = flat_bars(16, rng=4.0)
    assert atr(bars) == 4.0


def test_signal_zero_without_atr():
    assert signal_strength(breakout=5.0, atr14=0.0, volume_pace=1.5, spread_ticks=1) == 0.0


def test_signal_punishes_wide_spread():
    narrow = signal_strength(breakout=5.0, atr14=5.0, volume_pace=1.5, spread_ticks=2)
    wide = signal_strength(breakout=5.0, atr14=5.0, volume_pace=1.5, spread_ticks=7)
    assert narrow > wide


def breakout_bars():
    bars = flat_bars(15, px=1870.0, rng=4.0, vol=10000.0)  # ORB 1868-1872
    px = 1870.0
    for i in range(10):  # steady expansion with participation
        px += 1.8
        bars.append(Bar(px - 0.5, px + 1.0, px - 1.0, px, 30000.0))
    return bars


def base():
    limits = RiskLimits(max_capital=1_000_000.0)
    portfolio = PortfolioState(peak_equity=1_000_000.0, current_equity=1_000_000.0,
                               funds_available=1_000_000.0)
    return limits, MarketState(), portfolio


def test_breakout_pipeline_approves():
    limits, market, portfolio = base()
    r = run_symbol("INFY", breakout_bars(), limits, market, portfolio,
                   provider=MockProvider(), median_volume=10000.0)
    assert r.status == "APPROVED", (r.status, r.signal)
    assert r.gate is not None and r.gate.order is not None
    assert r.gate.order.qty > 0


def test_flat_day_holds():
    limits, market, portfolio = base()
    r = run_symbol("INFY", flat_bars(30), limits, market, portfolio,
                   provider=MockProvider(), median_volume=10000.0)
    assert r.status == "HOLD"


def test_thin_range_rejected_by_gate():
    bars = flat_bars(15, px=1870.0, rng=1.0, vol=5000.0)
    px = 1870.0
    for _ in range(10):  # late spike: big breakout, thin opening range
        px += 2.5
        bars.append(Bar(px - 0.5, px + 1.0, px - 1.0, px, 40000.0))
    limits, market, portfolio = base()
    r = run_symbol("INFY", bars, limits, market, portfolio,
                   provider=MockProvider(), median_volume=5000.0)
    assert r.status == "REJECTED:ORB_RANGE_THIN", r.status


def test_critic_reject_becomes_review():
    class EmptyEvidence(MockProvider):
        def complete(self, *, task, context):
            out = super().complete(task=task, context=context)
            if task == "strategist":
                out["evidence_refs"] = []
            return out

    limits, market, portfolio = base()
    r = run_symbol("INFY", breakout_bars(), limits, market, portfolio,
                   provider=EmptyEvidence(), median_volume=10000.0)
    assert r.status == "REVIEW" and r.critic_verdict == "REJECT"


def test_garbage_direction_becomes_review():
    class Garbage(MockProvider):
        def complete(self, *, task, context):
            if task == "strategist":
                return {"direction": "MOON", "rationale": "x", "evidence_refs": ["y"]}
            return super().complete(task=task, context=context)

    limits, market, portfolio = base()
    r = run_symbol("INFY", breakout_bars(), limits, market, portfolio,
                   provider=Garbage(), median_volume=10000.0)
    assert r.status == "REVIEW"


def test_reporter_renders_statuses():
    limits, market, portfolio = base()
    ok = run_symbol("INFY", breakout_bars(), limits, market, portfolio,
                    provider=MockProvider(), median_volume=10000.0)
    flat = run_symbol("TCS", flat_bars(30), limits, market, portfolio,
                      provider=MockProvider(), median_volume=10000.0)
    text = render_plan([ok, flat])
    assert "INFY" in text and "APPROVED" in text
    assert "TCS" in text and "HOLD" in text


def test_too_few_bars_is_review():
    limits, market, portfolio = base()
    r = run_symbol("INFY", flat_bars(10), limits, market, portfolio)
    assert r.status == "REVIEW"
    assert analyze("INFY", flat_bars(10), spread_ticks=1, tick_size=0.05) is None
