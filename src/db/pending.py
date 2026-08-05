"""Pending registrations — the interim state between /auth/register and
/auth/register/verify.

Backed by public.pending_registrations rather than process memory so the
two halves of the flow work across gunicorn workers and survive restarts.
See src/db/migrations/pending_registrations.sql.
"""

import uuid
from datetime import datetime, timedelta, timezone

from src.db.client import get_client

PENDING_TTL_SECONDS = 600


def _valid_uuid(value: str) -> bool:
    """Postgres raises on a malformed UUID comparison, which would surface as
    a 500. Clients can send anything, so check before querying."""
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def purge_expired_pending() -> None:
    now = datetime.now(timezone.utc).isoformat()
    get_client().table("pending_registrations").delete().lt("expires_at", now).execute()


def create_pending(email: str, full_name: str, password_hash: str, totp_secret: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=PENDING_TTL_SECONDS)
    result = get_client().table("pending_registrations").insert({
        "email": email,
        "full_name": full_name,
        "password_hash": password_hash,
        "totp_secret": totp_secret,
        "expires_at": expires_at.isoformat(),
    }).execute()
    return result.data[0]["id"]


def get_pending(pending_id: str) -> dict | None:
    if not _valid_uuid(pending_id):
        return None
    result = (
        get_client()
        .table("pending_registrations")
        .select("*")
        .eq("id", pending_id)
        .execute()
    )
    return result.data[0] if result.data else None


def delete_pending(pending_id: str) -> None:
    if not _valid_uuid(pending_id):
        return
    get_client().table("pending_registrations").delete().eq("id", pending_id).execute()


def is_expired(pending: dict) -> bool:
    """expires_at comes back as an ISO timestamptz string from Supabase."""
    expires_at = datetime.fromisoformat(pending["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expires_at
