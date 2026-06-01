from src.db.client import get_client


def email_taken(email: str) -> bool:
    result = get_client().table("profiles").select("id").eq("email", email).execute()
    return bool(result.data)


def create_profile_from_pending(email: str, full_name: str, password_hash: str, totp_secret: str) -> dict:
    try:
        result = get_client().table("profiles").insert({
            "email": email,
            "full_name": full_name,
            "password_hash": password_hash,
            "totp_secret": totp_secret,
        }).execute()
        return result.data[0]
    except Exception:
        raise ValueError("Email already registered")


def get_profile_by_email(email: str) -> dict | None:
    result = get_client().table("profiles").select("*").eq("email", email).execute()
    return result.data[0] if result.data else None


def get_profile_by_id(user_id: str) -> dict | None:
    result = (
        get_client()
        .table("profiles")
        .select("id, email, full_name, created_at")
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def get_profile_by_id_full(user_id: str) -> dict | None:
    result = get_client().table("profiles").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


_DEFAULT_CATEGORIES = ['Academics', 'Gym', 'Sports', 'Cooking', 'Recreation']


def get_categories(user_id: str) -> list[str]:
    result = get_client().table("profiles").select("categories").eq("id", user_id).execute()
    if result.data:
        cats = result.data[0].get("categories")
        if cats:
            return cats
    return _DEFAULT_CATEGORIES


def update_categories(user_id: str, categories: list[str]) -> None:
    get_client().table("profiles").update({"categories": categories}).eq("id", user_id).execute()
