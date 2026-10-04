import sys
from datetime import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import risk.gate as gate
from risk.gate import (
    MarketState,
    PortfolioState,
    Proposal,
    RiskLimits,
    evaluate,
)


def base(capital=1_000_000.0):
    limits = RiskLimits(max_capital=capital)
    market = MarketState()
    portfolio = PortfolioState(
        peak_equity=capital, current_equity=capital, funds_available=capital
    )
    return limits, market, portfolio


def good_proposal(**kw):
    d = dict(
        symbol="INFY",
        side="BUY",
        entry=1872.40,
        stop_loss=1858.00,
        target=1901.00,
        signal=0.72,
        sector="IT",
        ltp=1872.00,
        tick_size=0.05,
        lot_size=1,
        adv_20d=2_000_000.0,
    )
    d.update(kw)
    return Proposal(**d)


def test_happy_path_mints_approved_order():
    limits, market, portfolio = base()
    r = evaluate(good_proposal(), limits, market, portfolio, now_ist=time(10, 0))
    assert r.approved and r.order is not None and r.order.qty == 53
    assert r.order.stop_loss == 1858.00


def test_check_order_global_first():
    limits, market, portfolio = base()
    market.halted = True
    r = evaluate(good_proposal(stop_loss=None), limits, market, portfolio)
    assert r.reasons == [gate.HALTED]  # halt beats even a missing SL


def test_missing_and_percent_stop_rejected():
    limits, market, portfolio = base()
    assert evaluate(good_proposal(stop_loss=None), limits, market, portfolio).reasons == [gate.MISSING_STOP]
    assert evaluate(good_proposal(stop_loss="15%"), limits, market, portfolio).reasons == [gate.MISSING_STOP]
    assert evaluate(good_proposal(stop_loss="1850-1860"), limits, market, portfolio).reasons == [gate.MISSING_STOP]


def test_wrong_side_stop_rejected():
    limits, market, portfolio = base()
    r = evaluate(good_proposal(side="BUY", stop_loss=1880.00), limits, market, portfolio)
    assert r.reasons == [gate.BAD_SIDE]


def test_weak_signal_rejected():
    limits, market, portfolio = base()
    r = evaluate(good_proposal(signal=0.4), limits, market, portfolio)
    assert r.reasons == [gate.SIGNAL_WEAK]


def test_orb_filters():
    limits, market, portfolio = base()
    kw = dict(orb_range=5.0, orb_atr14=20.0, orb_spread_ticks=1, orb_volume_pace=1.2)
    assert evaluate(good_proposal(**kw), limits, market, portfolio).reasons == [gate.ORB_RANGE_THIN]
    kw = dict(orb_range=15.0, orb_atr14=20.0, orb_spread_ticks=10, orb_volume_pace=1.2)
    assert evaluate(good_proposal(**kw), limits, market, portfolio).reasons == [gate.ORB_SPREAD_WIDE]
    kw = dict(orb_range=15.0, orb_atr14=20.0, orb_spread_ticks=1, orb_volume_pace=0.5)
    assert evaluate(good_proposal(**kw), limits, market, portfolio).reasons == [gate.ORB_VOLUME_THIN]


def test_orb_cost_dominates_with_huge_charges():
    limits, market, portfolio = base()
    kw = dict(orb_range=15.0, orb_atr14=20.0, orb_spread_ticks=1, orb_volume_pace=1.5)
    r = evaluate(good_proposal(**kw), limits, market, portfolio, charges_estimate=50_000.0)
    assert r.reasons == [gate.ORB_COST_DOMINATES]


def test_daily_loss_guard_includes_worst_case():
    limits, market, portfolio = base()
    portfolio.day_pnl = -19_500.0  # 1.95% down; new worst-case ~771 pushes past 2%
    r = evaluate(good_proposal(), limits, market, portfolio, now_ist=time(10, 0))
    assert r.reasons == [gate.DAILY_LOSS]


def test_mode_checks():
    limits, market, portfolio = base()
    assert evaluate(good_proposal(), limits, market, portfolio, mode="OFF").reasons == [gate.MODE_OFF]
    assert evaluate(good_proposal(), limits, market, portfolio, mode="LIVE_CONFIRM").reasons == [gate.NEED_APPROVAL]
    r = evaluate(good_proposal(), limits, market, portfolio, mode="LIVE_CONFIRM", human_approved=True)
    assert r.approved


def test_insufficient_funds():
    limits, market, portfolio = base()
    portfolio.funds_available = 100.0
    r = evaluate(good_proposal(), limits, market, portfolio)
    assert r.reasons == [gate.INSUFFICIENT_FUNDS]


def test_fail_closed_on_garbage():
    limits, market, portfolio = base()
    r = evaluate(None, limits, market, portfolio)  # type: ignore[arg-type]
    assert r.reasons == [gate.FAIL_CLOSED]


def test_property_invariants():
    import random

    rng = random.Random(7)
    for _ in range(2000):
        capital = rng.uniform(100_000, 5_000_000)
        limits = RiskLimits(max_capital=capital)
        entry = round(rng.uniform(50, 3000), 2)
        stop = round(entry - rng.uniform(1, entry * 0.05), 2)
        p = Proposal(
            symbol="TST", side="BUY", entry=entry, stop_loss=stop,
            signal=rng.uniform(0, 1), ltp=entry,
            adv_20d=rng.uniform(100_000, 5_000_000),
        )
        portfolio = PortfolioState(
            peak_equity=capital, current_equity=capital, funds_available=capital * 2
        )
        r = evaluate(p, limits, MarketState(), portfolio, now_ist=time(10, 0))
        if r.approved:
            assert r.order is not None
            assert r.order.qty * r.order.entry <= 0.10 * capital + 1e-6
            assert r.order.max_worst_case_loss <= 0.005 * capital * 1.02 + 1e-6
