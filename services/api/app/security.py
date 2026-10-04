"""Auth primitives: scrypt password hashing, TOTP, 15-min JWT.

No secrets leave this module except inside signed tokens. LLM code must
never import this module (CI boundary test covers services/ too).
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timedelta, timezone

import jwt
import pyotp

JWT_ALG = "HS256"
JWT_TTL_MIN = 15


def _jwt_secret() -> str:
    s = os.environ.get("MONOLITH_JWT_SECRET", "")
    if not s:
        # Dev-only fallback. Compose/prod MUST set MONOLITH_JWT_SECRET.
        return "dev-only-insecure-secret-change-me"
    return s


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt$14$8$1${salt.hex()}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        _, _, _, _, salt_hex, dk_hex = hashed.split("$")
        dk = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex),
                            n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(dk.hex(), dk_hex)
    except (ValueError, TypeError):
        return False


def new_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    if not code or not code.isdigit():
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def mint_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "iat": int(now.timestamp()),
               "exp": int((now + timedelta(minutes=JWT_TTL_MIN)).timestamp())}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALG)


def check_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALG])
        return str(payload.get("sub") or "")
    except jwt.PyJWTError:
        return None
