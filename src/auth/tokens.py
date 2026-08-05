import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

_ALGO = "HS256"

# Sessions slide — require_auth reissues a token on every request, so this
# clock only runs down while the user is idle.
IDLE_TIMEOUT_MINUTES = 30

# ...but not forever. Renewal stops this long after the original login.
ABSOLUTE_SESSION_DAYS = 7


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_token(user_id: str, email: str, session_start: int | None = None) -> str:
    """session_start carries the original login time across renewals. Leave it
    out when the user actually signs in."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "session_start": session_start if session_start is not None else int(now.timestamp()),
        "exp": now + timedelta(minutes=IDLE_TIMEOUT_MINUTES),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGO)


def verify_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=[_ALGO])


def renew_token(payload: dict) -> str | None:
    """A fresh token with the idle window pushed forward, or None if the session
    hit the absolute cap — or predates this scheme, so there's nothing to
    measure. None doesn't sign anyone out; the current token still works until
    its own exp."""
    session_start = payload.get("session_start")
    if session_start is None:
        return None
    age = datetime.now(timezone.utc).timestamp() - session_start
    if age > ABSOLUTE_SESSION_DAYS * 86400:
        return None
    return create_token(payload["sub"], payload.get("email", ""), session_start=session_start)


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
