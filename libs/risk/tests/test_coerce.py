import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from risk.coerce import coerce_optional_float


def test_none_and_placeholders():
    for v in [None, "", "None", "n/a", "N/A", "null", "-", "tbd", "unknown"]:
        assert coerce_optional_float(v) is None


def test_percentages_and_ranges_rejected():
    assert coerce_optional_float("15%") is None
    assert coerce_optional_float("150-160") is None
    assert coerce_optional_float("around 150") is None


def test_formatted_prices_parsed():
    assert coerce_optional_float("$1,234.50") == 1234.50
    assert coerce_optional_float("189.5") == 189.5


def test_numbers_pass_through():
    assert coerce_optional_float(172.0) == 172.0
    assert coerce_optional_float(5) == 5.0
    assert coerce_optional_float(True) is None
