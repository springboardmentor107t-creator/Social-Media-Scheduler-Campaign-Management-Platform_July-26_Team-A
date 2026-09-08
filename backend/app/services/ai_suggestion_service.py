"""
ai_suggestion_service.py — OpenRouter integration for AI content suggestions.

Model chosen: google/gemini-3.5-flash-lite
Rationale: It is the cheapest currently available Gemini model on OpenRouter (~$0.0000003/token),
has ≤2s median response latency for short prompts, and is more than capable for short-form
marketing copy generation. A Claude Haiku or GPT-4o-mini tier model would also work, but
Gemini 3.5 Flash Lite offers the best cost/latency for this lightweight suggestion use-case.
(Previously used google/gemini-flash-1.5-8b which was removed from OpenRouter.)

Key design decisions:
- OPENROUTER_API_KEY is read from env — it NEVER leaves the server.
- On malformed JSON from the model, we retry once, then raise a 502.
- Request timeout is 15 s (httpx).
- Token-usage is logged per call for cost monitoring; generated content is NOT logged.
- Platform variants are generated when more than one platform is selected and their
  character limits differ meaningfully (X ~280, Instagram ~2200, LinkedIn ~3000).
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("socialpilot.ai_suggest")

# ── Configuration ─────────────────────────────────────────────────────────────
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Fast, inexpensive model for short marketing copy generation.
# google/gemini-flash-1.5-8b was removed from OpenRouter; gemini-3.5-flash-lite is its successor.
AI_MODEL = "google/gemini-3.5-flash-lite"
# Hard request timeout — do not let a slow response hang indefinitely.
REQUEST_TIMEOUT_S = 15.0
MAX_RETRIES = 1  # one automatic retry on malformed JSON, then 502

# Platform character limits (mirrors PlatformPreview.tsx CHAR_LIMITS)
PLATFORM_CHAR_LIMITS: dict[str, int] = {
    "instagram": 2200,
    "facebook": 63206,
    "linkedin": 3000,
    "twitter": 280,
    "x": 280,
    "youtube": 5000,
    "pinterest": 500,
}

# Platforms whose limits differ "meaningfully" — we generate per-platform variants
# when more than one of these is selected.
VARIANT_PLATFORMS = {"instagram", "twitter", "x", "linkedin"}


def _build_prompt(topic: str, platforms: list[str], tone: str) -> str:
    """
    Build a strict JSON-only generation prompt for the AI model.

    Response shape:
      Single platform  → { "title": str, "body": str, "hashtags": str[], "call_to_action": str }
      Multi-platform   → { "title": str, "variants": { "<platform>": str, ... }, "hashtags": str[], "call_to_action": str }

    The call_to_action is a short phrase with a [LINK] placeholder (never a fabricated URL).
    """
    # Normalise platform names
    norm_platforms = [p.lower().strip() for p in platforms]

    # Determine if we need per-platform variants
    variant_set = [p for p in norm_platforms if p in VARIANT_PLATFORMS]
    needs_variants = len(variant_set) > 1

    if needs_variants:
        variant_instructions = "\n".join(
            f"  - \"{p}\": max {PLATFORM_CHAR_LIMITS.get(p, 500)} characters"
            for p in variant_set
        )
        body_instruction = (
            f"Because multiple platforms with different character limits are selected, "
            f"return a \"variants\" object with one body per platform:\n"
            f"{variant_instructions}\n"
            "Each variant must be tailored to that platform's style and length."
        )
        response_shape = (
            '{"title": "<post title>", '
            '"variants": {"<platform1>": "<body1>", "<platform2>": "<body2>"}, '
            '"hashtags": ["<tag1>", "<tag2>", "<tag3>"], '
            '"call_to_action": "<CTA text with [LINK] placeholder>"}'
        )
    else:
        platform = norm_platforms[0] if norm_platforms else "general"
        char_limit = PLATFORM_CHAR_LIMITS.get(platform, 500)
        body_instruction = (
            f"Platform: {platform} (max {char_limit} characters for the body).\n"
            "Return a single \"body\" field."
        )
        response_shape = (
            '{"title": "<post title>", '
            '"body": "<post body>", '
            '"hashtags": ["<tag1>", "<tag2>", "<tag3>"], '
            '"call_to_action": "<CTA text with [LINK] placeholder>"}'
        )

    return f"""You are a social media marketing copywriter. Generate engaging, platform-optimised post content.

Topic: {topic}
Tone: {tone}
{body_instruction}

IMPORTANT — respond with STRICT JSON ONLY. No markdown, no prose, no explanation. Example shape:
{response_shape}

Rules:
- Title: concise, attention-grabbing (max 100 chars).
- Body/variants: match the platform's character limit; use line breaks for readability.
- Hashtags: 3–6 relevant hashtags WITHOUT the # prefix (the client adds #).
- call_to_action: a short call-to-action sentence (max 80 chars) that naturally invites
  the audience to follow a link. Use the literal placeholder token [LINK] where the URL
  should go — do NOT invent or fabricate any real URL. Example: "Shop the collection → [LINK]"
- Do NOT include any text outside the JSON object.
"""


def _parse_suggestion(raw: str) -> dict:
    """
    Parse the model's output, stripping any accidental markdown code fences.
    Raises json.JSONDecodeError on failure.
    """
    text = raw.strip()
    # Strip ```json ... ``` or ``` ... ``` wrappers if the model includes them
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop first and last fence lines
        inner = lines[1:] if lines[0].startswith("```") else lines
        if inner and inner[-1].strip() == "```":
            inner = inner[:-1]
        text = "\n".join(inner).strip()
    return json.loads(text)


def _call_openrouter(prompt: str, api_key: str) -> tuple[dict, dict | None]:
    """
    Call OpenRouter synchronously (FastAPI runs sync routes in a thread pool).
    Returns (parsed_json, usage_dict | None).
    Raises httpx.TimeoutException, httpx.HTTPStatusError, or json.JSONDecodeError.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://socialpilot.app",
        "X-Title": "SocialPilot AI Assist",
    }
    payload = {
        "model": AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 800,
    }

    with httpx.Client(timeout=REQUEST_TIMEOUT_S) as client:
        response = client.post(OPENROUTER_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    usage = data.get("usage")
    raw_content = data["choices"][0]["message"]["content"]
    parsed = _parse_suggestion(raw_content)
    return parsed, usage


def generate_suggestion(
    topic: str,
    platforms: list[str],
    tone: Optional[str] = None,
) -> dict:
    """
    Generate AI content suggestions via OpenRouter.

    Returns a dict matching one of:
      { "title": str, "body": str, "hashtags": str[] }
      { "title": str, "variants": { platform: str, ... }, "hashtags": str[] }

    Raises:
      PermissionError   — OPENROUTER_API_KEY not set
      TimeoutError      — OpenRouter did not respond within REQUEST_TIMEOUT_S
      ValueError        — model returned malformed JSON after retry (caller → 502)
      RuntimeError      — OpenRouter auth failure, model unavailable, or rate limit
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise PermissionError(
            "OPENROUTER_API_KEY is not configured on the server. "
            "Contact your administrator."
        )

    effective_tone = (tone or "professional").strip()
    prompt = _build_prompt(topic, platforms, effective_tone)

    # Log intent (not content) for cost monitoring
    logger.info(
        "ai_suggest | topic_len=%d | platforms=%s | tone=%s | model=%s",
        len(topic),
        platforms,
        effective_tone,
        AI_MODEL,
    )

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            parsed, usage = _call_openrouter(prompt, api_key)

            # Log token usage for cost monitoring
            if usage:
                logger.info(
                    "ai_suggest | attempt=%d | prompt_tokens=%s | completion_tokens=%s | total_tokens=%s",
                    attempt + 1,
                    usage.get("prompt_tokens", "?"),
                    usage.get("completion_tokens", "?"),
                    usage.get("total_tokens", "?"),
                )
            return parsed

        except httpx.TimeoutException as exc:
            logger.warning("ai_suggest | timeout on attempt %d", attempt + 1)
            raise TimeoutError(
                "The AI suggestion service timed out. Please try again in a moment."
            ) from exc

        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            logger.error(
                "ai_suggest | HTTP %d from OpenRouter on attempt %d",
                status_code,
                attempt + 1,
            )
            if status_code == 401:
                raise RuntimeError(
                    "AI service authentication failed. The server's API key may be invalid."
                ) from exc
            elif status_code == 429:
                raise RuntimeError(
                    "The AI provider is currently rate-limiting requests. "
                    "Please wait a moment and try again."
                ) from exc
            elif status_code >= 500:
                raise RuntimeError(
                    "The AI service is temporarily unavailable. Please try again shortly."
                ) from exc
            else:
                raise RuntimeError(
                    f"AI service returned an unexpected error (HTTP {status_code})."
                ) from exc

        except json.JSONDecodeError as exc:
            logger.warning(
                "ai_suggest | malformed JSON on attempt %d: %s",
                attempt + 1,
                str(exc)[:120],
            )
            last_exc = exc
            if attempt < MAX_RETRIES:
                # Retry once on malformed JSON — it happens with LLMs
                continue
            # Second failure → caller must return 502
            raise ValueError(
                "AI suggestion service returned an invalid response after retry."
            ) from last_exc

    # Should never reach here
    raise ValueError("AI suggestion service returned an invalid response after retry.")
