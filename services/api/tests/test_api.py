import os
import sys
from pathlib import Path

import pyotp

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services" / "api"))

os.environ["MONOLITH_DATA_DIR"] = str(Path(__file__).parent / ".tmp-data")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from app import store  # noqa: E402

client = TestClient(create_app())


def setup_module(_):
    p = Path(os.environ["MONOLITH_DATA_DIR"])
    if p.exists():
        for f in p.glob("*.json"):
            f.unlink()


def _enroll():
    r = client.post("/api/setup", json={
        "username": "owner", "email": "o@example.com", "password": "s3cret!!x",
        "smtp_host": "smtp.gmail.com", "smtp_port": 587,
        "smtp_user": "o@example.com", "smtp_from": "o@example.com",
    })
    assert r.status_code == 201, r.text
    return r.json()["totp_secret"]


def _token(secret):
    r = client.post("/api/auth/login", json={
        "user": "owner", "password": "s3cret!!x",
        "totp": pyotp.TOTP(secret).now(),
    })
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_setup_once_then_locked():
    _enroll()
    r = client.post("/api/setup", json={
        "username": "intruder", "email": "x@example.com", "password": "s3cret!!x"})
    assert r.status_code == 409


def test_login_totp_enforced():
    secret = store.load()["user"]["totp_secret"]
    bad = client.post("/api/auth/login", json={
        "user": "owner", "password": "s3cret!!x", "totp": "000000"})
    assert bad.status_code == 401
    good = client.post("/api/auth/login", json={
        "user": "owner", "password": "wrongpass1", "totp": pyotp.TOTP(secret).now()})
    assert good.status_code == 401


def test_authed_reads_and_kill():
    secret = store.load()["user"]["totp_secret"]
    token = _token(secret)
    assert client.get("/api/mode").status_code == 401
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/mode", headers=h).json() == {"mode": "PAPER"}
    assert "positions" in client.get("/api/positions", headers=h).json()
    r = client.post("/api/kill", json={"reason": "t", "phrase": "nope"}, headers=h)
    assert r.status_code == 422
    r = client.post("/api/kill", json={"reason": "manual test", "phrase": "HALT ALL"}, headers=h)
    assert r.json() == {"ok": True, "mode": "OFF"}


def test_forgot_always_200():
    assert client.post("/api/auth/forgot", json={"email": "nobody@example.com"}).status_code == 200
