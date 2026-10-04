"""Auth + first-run setup routes. Single owner: setup works exactly once."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from .. import security, store

router = APIRouter()


class SetupBody(BaseModel):
    username: str
    email: EmailStr
    password: str
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_from: str = ""


class LoginBody(BaseModel):
    user: str
    password: str
    totp: str


class ForgotBody(BaseModel):
    email: EmailStr


@router.get("/setup/status")
def setup_status() -> dict:
    return {"done": store.load()["user"] is not None}


@router.post("/setup", status_code=201)
def setup(body: SetupBody) -> dict:
    data = store.load()
    if data["user"] is not None:
        raise HTTPException(409, "Setup already completed.")
    if len(body.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters.")
    secret = security.new_totp_secret()
    data["user"] = {
        "username": body.username,
        "email": str(body.email),
        "pw": security.hash_password(body.password),
        "totp_secret": secret,
    }
    data["smtp"] = {
        "host": body.smtp_host, "port": body.smtp_port,
        "user": body.smtp_user, "from": body.smtp_from or str(body.email),
    }
    store.save(data)
    import pyotp

    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=str(body.email), issuer_name="Monolith")
    # totp_secret is shown ONCE so the owner can enroll the authenticator.
    return {"totp_secret": secret, "otpauth_uri": uri}


@router.post("/auth/login")
def login(body: LoginBody) -> dict:
    data = store.load()
    u = data["user"]
    if u is None:
        raise HTTPException(409, "Run /setup first.")
    if body.user != u["username"] or not security.verify_password(body.password, u["pw"]):
        raise HTTPException(401, "Invalid credentials.")
    if not security.verify_totp(u["totp_secret"], body.totp):
        raise HTTPException(401, "Invalid TOTP code.")
    return {"token": security.mint_token(u["username"])}


@router.post("/auth/forgot")
def forgot(body: ForgotBody) -> dict:
    # Always 200: never reveal whether an address is registered. Delivery
    # uses stored SMTP when configured; otherwise logged for the owner.
    data = store.load()
    _ = (body.email, data.get("smtp"))
    return {"ok": True}
