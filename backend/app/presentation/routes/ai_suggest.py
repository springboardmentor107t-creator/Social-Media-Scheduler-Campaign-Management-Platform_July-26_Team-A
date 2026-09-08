"""
ai_suggest.py — POST /content/ai-suggest

Responsibilities:
  - Validate request body (topic, platforms, optional tone).
  - Enforce per-user rate limit (10 requests/hour) via Redis.
  - Delegate to ai_suggestion_service for the actual OpenRouter call.
  - Map service-layer errors to appropriate HTTP status codes with specific messages.
  - Return structured JSON to the frontend — the API key NEVER appears in any response.

Rate limiting: Redis key  ai_suggest:<user_id>  with INCR + EXPIRE strategy.
  - 10 requests per 3600-second rolling window.
  - Returns 429 with a human-readable message when exceeded.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.presentation.dependencies.auth import get_current_user
from app.services.ai_suggestion_service import generate_suggestion
from database.postgresql.models import User
from database.redis.connection import get_redis_client

logger = logging.getLogger("socialpilot.routes.ai_suggest")

router = APIRouter(tags=["AI Content Assist"])

# ── Rate limit constants ──────────────────────────────────────────────────────
RATE_LIMIT_MAX = 10         # max requests per window per user
RATE_LIMIT_WINDOW_S = 3600  # 1 hour


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AISuggestRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500, description="Topic or idea for the post")
    platforms: List[str] = Field(..., min_length=1, description="Selected platform names")
    tone: Optional[str] = Field(
        None,
        description="Writing tone: professional | casual | promotional | excited",
    )


class AISuggestResponse(BaseModel):
    title: str
    # Either 'body' (single platform) or 'variants' (multi-platform) will be present
    body: Optional[str] = None
    variants: Optional[dict] = None
    hashtags: List[str] = []
    # Short CTA phrase with [LINK] placeholder — never a fabricated URL
    call_to_action: Optional[str] = None


# ── Helper ────────────────────────────────────────────────────────────────────

def _check_rate_limit(user_id: str) -> None:
    """
    Increment the per-user request counter in Redis.
    Raises HTTP 429 if the user has exceeded RATE_LIMIT_MAX in the current window.
    Silently passes if Redis is unavailable (fail-open to avoid blocking real users).
    """
    try:
        redis = get_redis_client()
        key = f"ai_suggest:{user_id}"
        count = redis.incr(key)
        # Set TTL only on the first request in the window
        if count == 1:
            redis.expire(key, RATE_LIMIT_WINDOW_S)

        if count > RATE_LIMIT_MAX:
            ttl = redis.ttl(key)
            minutes_left = max(1, (ttl or RATE_LIMIT_WINDOW_S) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"You've reached the AI suggestion limit ({RATE_LIMIT_MAX} requests/hour). "
                    f"Please wait approximately {minutes_left} minute(s) before trying again."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable → fail-open (log and proceed)
        logger.warning("ai_suggest rate-limit check failed (Redis error): %s", exc)


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post(
    "/content/ai-suggest",
    response_model=AISuggestResponse,
    summary="Generate AI content suggestions",
    description=(
        "Generates post title, body/variants, and hashtags via OpenRouter. "
        "Server-side only — the API key is never exposed to the frontend. "
        "Rate limited to 10 requests per hour per user."
    ),
)
def ai_suggest(
    body: AISuggestRequest,
    current_user: User = Depends(get_current_user),
):
    """
    POST /content/ai-suggest

    Body: { topic, platforms, tone? }
    Returns: { title, body?, variants?, hashtags }

    Error mapping:
      402 → API key not configured (PermissionError)
      429 → per-user rate limit exceeded (our Redis check)
      504 → OpenRouter timeout
      502 → OpenRouter returned malformed JSON after retry
      503 → OpenRouter temporary outage
      401 → OpenRouter authentication failure (bad key)
    """
    user_id = str(current_user.id)

    # 1. Enforce rate limit
    _check_rate_limit(user_id)

    # 2. Validate tone value
    allowed_tones = {"professional", "casual", "promotional", "excited"}
    tone = (body.tone or "professional").lower().strip()
    if tone not in allowed_tones:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid tone '{tone}'. Must be one of: {', '.join(sorted(allowed_tones))}.",
        )

    # 3. Call service
    try:
        result = generate_suggestion(
            topic=body.topic.strip(),
            platforms=body.platforms,
            tone=tone,
        )
    except PermissionError as exc:
        # OPENROUTER_API_KEY not set on the server
        logger.error("ai_suggest | API key not configured: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(exc),
        ) from exc

    except TimeoutError as exc:
        logger.warning("ai_suggest | timeout for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        # Malformed JSON after retry
        logger.error("ai_suggest | malformed JSON for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI suggestion service returned an invalid response. Please try again.",
        ) from exc

    except RuntimeError as exc:
        # OpenRouter HTTP errors: 401, 429 (provider-side), 5xx
        msg = str(exc)
        logger.error("ai_suggest | runtime error for user %s: %s", user_id, msg)
        if "authentication" in msg.lower() or "api key" in msg.lower():
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg) from exc
        elif "rate-limit" in msg.lower() or "rate limiting" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI is temporarily unavailable due to high demand. Please try again in a moment.",
            ) from exc
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI suggestion service is temporarily unavailable. Please try again shortly.",
            ) from exc

    except Exception as exc:
        logger.exception("ai_suggest | unexpected error for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating suggestions.",
        ) from exc

    # 4. Build response
    return AISuggestResponse(
        title=result.get("title", ""),
        body=result.get("body"),
        variants=result.get("variants"),
        hashtags=result.get("hashtags", []),
        call_to_action=result.get("call_to_action") or None,
    )
