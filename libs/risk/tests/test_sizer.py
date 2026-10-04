import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from risk.sizer import compute_qty


def test_hand_worked_case():
    # capital 10L, risk 0.5% = 5000; stop distance 14.4 -> 347.2
    # notional 10% = 100000 / 1872.4 = 53.4 -> binds
    assert compute_qty(entry=1872.4, stop_loss=1858.0, capital=1_000_000) == 53


def test_zero_or_inverted_stop_distance():
    assert compute_qty(entry=100.0, stop_loss=100.0, capital=1_000_000) == 0
    assert compute_qty(entry=100.0, stop_loss=0.0, capital=1_000_000) == 0


def test_adv_cap_binds():
    # risk allows 5000/10 = 500 shares but 1% of ADV 20000 = 200 binds
    assert (
        compute_qty(entry=100.0, stop_loss=90.0, capital=1_000_000, adv_20d=20_000) == 200
    )


def test_lot_rounding_down():
    assert (
        compute_qty(entry=100.0, stop_loss=90.0, capital=1_000_000, lot_size=25) == 500
    )
    # 53 -> 2 lots of 25 = 50
    assert (
        compute_qty(entry=1872.4, stop_loss=1858.0, capital=1_000_000, lot_size=25) == 50
    )


def test_property_never_exceeds_caps():
    import random

    rng = random.Random(42)
    for _ in range(2000):
        capital = rng.uniform(100_000, 10_000_000)
        entry = rng.uniform(10, 5000)
        stop = entry - rng.uniform(0.5, entry * 0.1)
        qty = compute_qty(entry=entry, stop_loss=stop, capital=capital, adv_20d=rng.uniform(0, 5_000_000))
        assert qty >= 0
        assert qty * entry <= 0.10 * capital + 1e-6
        if stop < entry:
            assert qty * (entry - stop) <= 0.005 * capital + 1e-6
