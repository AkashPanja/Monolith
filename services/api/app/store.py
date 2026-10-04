"""Dev store: file-backed JSON. Postgres replaces this in compose (infra/).

Everything here is single-owner shaped: one user row, one settings row.
Secrets at rest are NOT encrypted in the dev store — Postgres + AES-256-GCM
lands with the secrets vault (Sprint 1). Never use the dev store for live.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


def _path() -> Path:
    d = Path(os.environ.get("MONOLITH_DATA_DIR", Path(__file__).resolve().parents[3] / "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d / "dev-store.json"


def _blank() -> dict[str, Any]:
    return {"user": None, "smtp": None, "mode": "PAPER", "killed": False}


def load() -> dict[str, Any]:
    p = _path()
    if not p.exists():
        return _blank()
    try:
        data = json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return _blank()
    merged = _blank()
    merged.update(data)
    return merged


def save(data: dict[str, Any]) -> None:
    p = _path()
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(p)
