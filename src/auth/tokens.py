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


def create_pending_token(email: str, full_name: str, password_hash: str, totp_secret: str) -> str:
    payload = {
        "type": "pending_registration",
        "email": email,
        "full_name": full_name,
        "password_hash": password_hash,
        "totp_secret": totp_secret,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGO)


def verify_pending_token(token: str) -> dict:
    payload = jwt.decode(token, _secret(), algorithms=[_ALGO])
    if payload.get("type") != "pending_registration":
        raise ValueError("Not a pending registration token")
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
