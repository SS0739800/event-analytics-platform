"""Shared LLM client for the AI features.

Two providers, tried in order: Groq first (fast and free), Gemini as a
cross-provider backup. Within each, a chain of models.

This exists because the model name used to be hardcoded in four modules. When
Groq moved the Llama models to their enterprise tier, every AI feature broke at
once and the fix meant editing four files. A chain inside one provider survives
a single model being retired; a second provider survives a whole free tier
being reorganised.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()


class AIUnavailable(RuntimeError):
    """No model at any provider could serve the request."""


# Phrases providers use when a model is gone, renamed, or off-limits to this
# key. Anything else (auth, rate limit, network) is a real error and re-raised —
# retrying those against another model just wastes time and quota.
_MODEL_ERRORS = (
    "model_not_found",
    "does not exist",
    "decommissioned",
    "no longer supported",
    "do not have access",
    "not found for api version",
    "is not supported",
)


# Temporary conditions. Worth trying the next model, because another one is
# often on different capacity — a 503 on gemini-flash-latest says nothing about
# gemini-3.5-flash.
_TRANSIENT_ERRORS = (
    "unavailable",
    "high demand",
    "overloaded",
    "rate limit",
    "resource_exhausted",
    "429",
    "500 internal",
    "502",
    "503",
    "504",
    "timeout",
    "timed out",
)

# Config problems. Never retried — no other model will fix a bad key, and
# hammering the chain just turns one clear error into four confusing ones.
_FATAL_ERRORS = (
    "api key not valid",
    "api_key_invalid",
    "invalid api key",
    "unauthorized",
    "permission denied",
    "permission_denied",
    "401",
    "403",
)


def _is_model_problem(err: Exception) -> bool:
    text = str(err).lower()
    return any(phrase in text for phrase in _MODEL_ERRORS)


def _should_try_next(err: Exception) -> bool:
    """Whether another model is worth attempting for this failure."""
    text = str(err).lower()
    if any(phrase in text for phrase in _FATAL_ERRORS):
        return False
    if isinstance(err, AIUnavailable):
        return True
    return (any(p in text for p in _MODEL_ERRORS)
            or any(p in text for p in _TRANSIENT_ERRORS))


def _chain(env_var: str, default: list[str]) -> list[str]:
    """Comma-separated override, in priority order, so a future outage can be
    fixed from the host's env vars without a deploy."""
    override = os.environ.get(env_var, "").strip()
    if override:
        return [m.strip() for m in override.split(",") if m.strip()]
    return default


# -- Groq ---------------------------------------------------------------------

GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound",
]

_groq = None


def _groq_client():
    global _groq
    if _groq is None:
        from groq import Groq
        _groq = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _groq


def _groq_complete(model, messages, max_tokens, temperature, effort):
    kwargs = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if temperature is not None:
        kwargs["temperature"] = temperature
    if effort:
        # gpt-oss models reason before answering, and that reasoning is billed
        # against max_tokens. At "low" it drops roughly 70%, which is the
        # difference between a summary completing and returning empty.
        kwargs["reasoning_effort"] = "low"

    choice = _groq_client().chat.completions.create(**kwargs).choices[0]
    content = (choice.message.content or "").strip()
    if not content:
        # A reasoning model that spends its whole budget thinking returns empty
        # content with finish_reason "length". Silently returning "" would show
        # the user a blank card, so treat it as a failure.
        raise AIUnavailable(
            f"{model} returned no content (finish_reason={choice.finish_reason}); "
            f"max_tokens={max_tokens} is likely too low for its reasoning step"
        )
    return content


def _try_groq(messages, max_tokens, temperature, tried):
    if not os.environ.get("GROQ_API_KEY"):
        return None
    for model in _chain("GROQ_MODEL", GROQ_MODELS):
        for effort in (True, False):
            try:
                return _groq_complete(model, messages, max_tokens, temperature, effort)
            except TypeError:
                continue  # SDK too old for reasoning_effort
            except Exception as err:
                # Not every model takes reasoning_effort; retry once without it
                # before writing the model off.
                if effort and "reasoning_effort" in str(err):
                    continue
                if not _should_try_next(err):
                    raise
                tried.append(f"groq/{model}: {err}")
                print(f"[ai] groq {model} unusable: {err}", file=sys.stderr)
                break
    return None


# -- Gemini -------------------------------------------------------------------
# Optional. With no GEMINI_API_KEY set the app behaves exactly as before, Groq
# only, so this costs nothing until a key exists.

# "-latest" first on purpose: it is an alias Google repoints at the current
# model, so unlike a pinned ID it cannot go stale. The whole gemini-2.5 family
# was already retired when this was wired up, which is the failure mode this
# avoids. The pinned entry behind it is insurance for the alias itself moving.
GEMINI_MODELS = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
]

_gemini = None


def _gemini_client():
    global _gemini
    if _gemini is None:
        from google import genai
        _gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _gemini


def _gemini_discover() -> list[str]:
    """Ask Gemini what it actually serves, when none of the known IDs work.

    Hardcoding IDs is the exact fragility this module exists to fix, and Google
    renames models more often than Groq does. This only runs after the static
    chain is exhausted, so it costs one extra call in the rare bad case.
    """
    try:
        names = []
        for m in _gemini_client().models.list():
            name = (getattr(m, "name", "") or "").replace("models/", "", 1)
            actions = getattr(m, "supported_actions", None) or []
            if "flash" in name and (not actions or "generateContent" in actions):
                names.append(name)
        # Aliases first (they self-update), then stable over preview, then
        # shortest. models.list() also returns models that 404 when called, so
        # this is a best guess to retry with, not a guarantee.
        names.sort(key=lambda n: (
            "latest" not in n,
            "preview" in n or "exp" in n,
            len(n),
        ))
        return names[:3]
    except Exception as err:
        print(f"[ai] gemini model discovery failed: {err}", file=sys.stderr)
        return []


def _gemini_complete(model, messages, max_tokens, temperature):
    from google.genai import types

    # Our messages are OpenAI-shaped; Gemini takes the system prompt separately
    # and calls the assistant role "model".
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
        if m["role"] != "system"
    ]

    config_args = {"max_output_tokens": max_tokens}
    if system:
        config_args["system_instruction"] = system
    if temperature is not None:
        config_args["temperature"] = temperature

    response = _gemini_client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(**config_args),
    )
    content = (getattr(response, "text", "") or "").strip()
    if not content:
        raise AIUnavailable(f"gemini/{model} returned no content")
    return content


def _try_gemini(messages, max_tokens, temperature, tried):
    if not os.environ.get("GEMINI_API_KEY"):
        return None

    rounds = [_chain("GEMINI_MODEL", GEMINI_MODELS), None]
    for round_models in rounds:
        if round_models is None:
            round_models = _gemini_discover()
            if round_models:
                print(f"[ai] gemini discovery found: {round_models}", file=sys.stderr)
        for model in round_models:
            try:
                return _gemini_complete(model, messages, max_tokens, temperature)
            except Exception as err:
                if not _should_try_next(err):
                    raise
                tried.append(f"gemini/{model}: {err}")
                print(f"[ai] gemini {model} unusable: {err}", file=sys.stderr)
    return None


# -- Public API ---------------------------------------------------------------

def providers() -> list[str]:
    """Which providers are configured. Useful for a health check."""
    active = []
    if os.environ.get("GROQ_API_KEY"):
        active.append("groq")
    if os.environ.get("GEMINI_API_KEY"):
        active.append("gemini")
    return active


def models() -> dict:
    return {
        "groq": _chain("GROQ_MODEL", GROQ_MODELS) if os.environ.get("GROQ_API_KEY") else [],
        "gemini": _chain("GEMINI_MODEL", GEMINI_MODELS) if os.environ.get("GEMINI_API_KEY") else [],
    }


def chat(messages: list[dict], max_tokens: int, temperature: float | None = None) -> str:
    """Send a completion, falling through models and then providers."""
    tried = []

    for attempt in (_try_groq, _try_gemini):
        result = attempt(messages, max_tokens, temperature, tried)
        if result:
            return result

    if not providers():
        raise AIUnavailable("No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY")
    raise AIUnavailable("No available AI model. Tried - " + " | ".join(tried))
