"""LLM provider boundary. The pipeline talks to LLMProvider only.

Rules (CI-enforced elsewhere, documented here):
- Providers receive minimised context: symbols, code-computed numbers,
  length-capped news quotes. Never keys, accounts, balances, or limits.
- Providers return schema-shaped dicts. Anything unparseable -> REVIEW.
- MockProvider is deterministic (fixtures by symbol) and is what tests
  and paper-soak use when no key is configured.
"""

from __future__ import annotations

from typing import Any, Protocol


class LLMProvider(Protocol):
    name: str

    def complete(self, *, task: str, context: dict[str, Any]) -> dict[str, Any]: ...


class MockProvider:
    """Deterministic stand-in. Direction follows the code-computed signal so
    tests exercise wiring, not intelligence."""

    name = "mock"

    def complete(self, *, task: str, context: dict[str, Any]) -> dict[str, Any]:
        s = float(context.get("signal", 0.0))
        symbol = str(context.get("symbol", "?"))
        if task == "strategist":
            direction = "BUY" if s >= 0.6 else "HOLD"
            return {
                "direction": direction,
                "rationale": f"{symbol}: signal {s:.2f} from ORB expansion + volume pace.",
                "evidence_refs": [f"orb:{symbol}", f"tape:{symbol}"],
            }
        if task == "critic":
            ok = bool(context.get("evidence_refs")) and float(context.get("stop_distance", 0.0)) > 0
            return {
                "verdict": "APPROVE" if ok else "REJECT",
                "notes": "Evidence + SL present." if ok else "Missing evidence or uncomputable SL.",
            }
        if task == "reporter":
            return {"summary": f"Plan for {symbol}: {context.get('direction', 'HOLD')}."}
        if task == "news":
            return {"stance": "NEUTRAL", "tickers": [], "note": "Mock: no live ingest in tests."}
        raise ValueError(f"unknown task {task!r}")


class UnconfiguredProvider:
    """Placeholder for Anthropic / OpenAI-compatible providers. Instantiation
    without an API key fails closed instead of silently using the mock."""

    name = "unconfigured"

    def __init__(self, provider: str, model: str, api_key: str = "") -> None:
        if not api_key:
            raise RuntimeError(f"LLM provider {provider}/{model} has no API key.")
        self._provider = provider
        self._model = model

    def complete(self, *, task: str, context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("HTTP provider lands in Sprint 4 (LLM adapters).")
