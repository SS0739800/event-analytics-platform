import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

_ALGO = "HS256"


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGO)


def verify_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[_ALGO])


def create_login_token(user_id: str) -> str:
    """Short-lived token issued after a successful password check; required to
    complete the MFA step. Binds /auth/login/verify to /auth/login so the
    password stage cannot be skipped."""
    payload = {
        "sub": user_id,
        "scope": "login_mfa",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGO)


def verify_login_token(token: str) -> dict:
    payload = jwt.decode(token, _secret(), algorithms=[_ALGO])
    if payload.get("scope") != "login_mfa":
        raise ValueError("Not a login challenge token")
    return payload


def create_ical_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "scope": "ical",
        "exp": datetime.now(timezone.utc) + timedelta(days=365),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGO)


def verify_ical_token(token: str) -> dict:
    payload = jwt.decode(token, _secret(), algorithms=[_ALGO])
    if payload.get("scope") != "ical":
        raise ValueError("Not an iCal token")
    return payload
