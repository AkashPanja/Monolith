"""Nullish-float coercion for untrusted numeric fields.

LLMs write placeholders ("None", "N/A"), percentages ("15%"), ranges
("150-160") or formatted prices ("$1,234.50") into numeric slots. A percentage
can never be salvaged into an absolute level, so all of these coerce to None
and the caller rejects. Pure function: no I/O, no network, no ML.
"""

from __future__ import annotations

from typing import Any, Optional

_NULLISH = {"", "none", "n/a", "na", "null", "nil", "-", "tbd", "unknown"}


def coerce_optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or text.lower() in _NULLISH or text.endswith("%"):
        return None
    cleaned = text.replace(",", "").lstrip("$\u20ac\u00a3\u00a5").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None
