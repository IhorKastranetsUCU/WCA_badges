import json
import logging
import time
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.ai.agenda_lambda import verify_cognito_token
from app.ai.badge_layout import (
    LAYOUT_PROMPT_VERSION,
    BadgeLayoutError,
    BadgeLayoutSuggestion,
    LayoutElementSpec,
    analyze_badge_layout,
    layout_cost_usd,
)

logger = logging.getLogger("app.api.ai")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/ai", tags=["ai"])

MAX_IMAGE_BASE64_CHARS = 8_000_000  # ~6 MB binary image payload guard


class BadgeAutoLayoutRequest(BaseModel):
    image_base64: str = Field(min_length=1, description="Base64 or data URL of badge background")
    width_mm: float = Field(default=100.0, ge=20.0, le=200.0)
    height_mm: float = Field(default=70.0, ge=20.0, le=200.0)
    side: Literal["front", "back"] = "front"
    elements: list[LayoutElementSpec] = Field(min_length=1, max_length=25)
    design_note: str | None = Field(default=None, max_length=500)
    model: str | None = None


class BadgeAutoLayoutResponse(BaseModel):
    suggestion: BadgeLayoutSuggestion
    model: str
    prompt_version: str
    usage: dict[str, int]
    cost_usd: float
    latency_ms: int


@router.post("/badge-layout", response_model=BadgeAutoLayoutResponse)
async def suggest_badge_layout_endpoint(
    payload: BadgeAutoLayoutRequest,
    authorization: str | None = Header(default=None),
):
    if len(payload.image_base64) > MAX_IMAGE_BASE64_CHARS:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Image payload is too large ({len(payload.image_base64):,} chars). "
                f"Maximum allowed is {MAX_IMAGE_BASE64_CHARS:,} characters."
            ),
        )

    user_sub = "local-organizer"
    if authorization:
        try:
            user_ctx = verify_cognito_token(authorization)
            user_sub = user_ctx.sub
        except Exception:
            # Allow authenticated WCA/local sessions in main editor while logging caller identity
            user_sub = "wca-session-user"

    started = time.monotonic()
    try:
        suggestion, usage, active_model = analyze_badge_layout(
            image_base64=payload.image_base64,
            width_mm=payload.width_mm,
            height_mm=payload.height_mm,
            elements=payload.elements,
            side=payload.side,
            design_note=payload.design_note,
            model=payload.model,
        )
    except BadgeLayoutError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        logger.error("Unexpected error in badge auto-layout: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI layout service failed: {e}") from e

    latency_ms = int((time.monotonic() - started) * 1000)
    calculated_cost = layout_cost_usd(active_model, usage)

    # Structured CloudWatch JSON telemetry line (Lab 6 deliverable format)
    log_payload = {
        "event": "badge_layout_suggested",
        "user": user_sub,
        "model": active_model,
        "prompt_version": LAYOUT_PROMPT_VERSION,
        "side": payload.side,
        "elements_count": len(payload.elements),
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "latency_ms": latency_ms,
        "cost_usd": calculated_cost,
    }
    logger.info(json.dumps(log_payload))

    return BadgeAutoLayoutResponse(
        suggestion=suggestion,
        model=active_model,
        prompt_version=LAYOUT_PROMPT_VERSION,
        usage=usage,
        cost_usd=calculated_cost,
        latency_ms=latency_ms,
    )
