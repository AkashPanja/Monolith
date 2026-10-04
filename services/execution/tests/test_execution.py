import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "libs"))

import pytest

from execution.broker import BrokerOrder, PaperBroker, create_live_broker, reset_live_broker_flag_for_tests
from execution.executor import Executor
from execution.paper import Bar, EngineConfig, PaperEngine
from risk.gate import ApprovedOrder


def approved(**kw):
    d = dict(symbol="INFY", side="BUY", qty=53, entry=1872.40, stop_loss=1858.00,
             target=1901.00, max_worst_case_loss=771.0)
    d.update(kw)
    return ApprovedOrder(**d)


def bar(**kw):
    d = dict(open=1872.0, high=1875.0, low=1870.0, close=1874.0,
             volume=50000.0, bid=1871.95, ask=1872.05)
    d.update(kw)
    return Bar(**d)


def test_market_fill_pays_touch_plus_slippage():
    eng = PaperEngine()
    o = BrokerOrder("k1", "INFY", "BUY", 53, "MARKET")
    f = eng.process_bar(o, bar(), adv=2_000_000.0)
    assert f is not None
    # spread 0.10 -> k*spread 0.05; tick 0.05; impact tiny -> slip 0.05
    assert f.price == round(1872.05 + 0.05, 2)


def test_limit_fill_only_on_trade_through():
    eng = PaperEngine()
    o = BrokerOrder("k2", "INFY", "BUY", 10, "LIMIT", limit_price=1871.0)
    assert eng.process_bar(o, bar(low=1871.5), adv=1_000_000.0) is None
    f = eng.process_bar(o, bar(low=1870.5), adv=1_000_000.0)
    assert f is not None and f.price <= 1871.0 + 0.1


def test_gap_through_stop_fills_at_open():
    eng = PaperEngine()
    o = BrokerOrder("k3", "INFY", "SELL", 10, "STOP", stop_price=1858.0)
    # bar opens below the stop: untradeable at 1858 -> fills at open
    f = eng.process_bar(o, bar(open=1850.0, low=1848.0, bid=1849.9, ask=1850.1), adv=1_000_000.0)
    assert f is not None and f.price <= 1850.1


def test_lot_violation_rejects():
    eng = PaperEngine(EngineConfig(lot_size=25))
    o = BrokerOrder("k4", "INFY", "BUY", 53, "MARKET")
    assert eng.process_bar(o, bar(), adv=1_000_000.0) is None
    assert o.status == "REJECTED" and o.reason == "LOT"


def test_executor_refuses_non_approved():
    ex = Executor(PaperBroker())
    with pytest.raises(TypeError):
        ex.execute({"symbol": "INFY"}, client_key="x")  # type: ignore[arg-type]


def test_executor_idempotent_replay():
    ex = Executor(PaperBroker())
    r1 = ex.execute(approved(), client_key="k5")
    r2 = ex.execute(approved(), client_key="k5")
    assert r1.status == "OPEN" and r2.reason == "REPLAY"


def test_single_live_broker_enforced():
    reset_live_broker_flag_for_tests()
    with pytest.raises(ValueError):
        create_live_broker("groww")
    with pytest.raises(NotImplementedError):
        create_live_broker("fyers")  # stub until Sprint-0 verifies
    reset_live_broker_flag_for_tests()


def test_attribution_and_tolerance():
    eng = PaperEngine()
    a = eng.attribute(side="BUY", arrival_mid=1872.0, avg_fill=1872.30,
                      spread_at_arrival=0.10, qty=53, adv=2_000_000.0)
    assert a.shortfall_per_share == pytest.approx(0.30)
    assert a.spread_per_share == pytest.approx(0.05)
    assert a.timing_per_share == pytest.approx(0.30 - 0.05 - a.impact_per_share)
    realized = eng.realized_impact(side="BUY", arrival_mid=1872.0, post_window_mid=1872.01)
    assert eng.impact_within_tolerance(modeled=a.impact_per_share, realized=realized)
    assert not eng.impact_within_tolerance(modeled=a.impact_per_share, realized=5.0)


def test_no_ml_or_network_imports_in_risk_and_execution():
    import ast

    banned = {"sklearn", "torch", "transformers", "requests", "httpx", "openai", "anthropic"}
    for rel in ["libs/risk/coerce.py", "libs/risk/sizer.py", "libs/risk/gate.py",
                "services/execution/broker.py", "services/execution/executor.py",
                "services/execution/paper.py"]:
        tree = ast.parse((ROOT / rel).read_text())
        mods = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                mods.update(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                mods.add(node.module.split(".")[0])
        assert not (mods & banned), f"{rel} imports {mods & banned}"
