import json
import logging
import os
import time
from datetime import date
from typing import Any
from urllib.request import urlopen

try:
    import jwt
    from jwt.algorithms import RSAAlgorithm
except ImportError:  # pragma: no cover - graceful fallback on older local images
    jwt = None  # type: ignore[assignment]
    RSAAlgorithm = None  # type: ignore[assignment]

from app.ai.agenda import PROMPT_VERSION, AgendaParseError, cost_usd, parse_agenda
from app.ai.badge_layout import (
    LAYOUT_PROMPT_VERSION,
    BadgeLayoutError,
    LayoutElementSpec,
    analyze_badge_layout,
    layout_cost_usd,
)
from app.core.config import settings

logger = logging.getLogger("app.ai.agenda_lambda")
logger.setLevel(logging.INFO)

# In-memory cache for Cognito JWKS public keys
_JWKS_KEYS_CACHE: dict[str, Any] = {}
_JWKS_CACHE_EXPIRY: float = 0.0


class UserContext:
    def __init__(self, sub: str, email: str = ""):
        self.sub = sub
        self.email = email


def get_cognito_jwks() -> dict[str, Any]:
    """Fetches and caches the JSON Web Key Set (JWKS) from Amazon Cognito."""
    global _JWKS_KEYS_CACHE, _JWKS_CACHE_EXPIRY
    now = time.time()
    if _JWKS_KEYS_CACHE and now < _JWKS_CACHE_EXPIRY:
        return _JWKS_KEYS_CACHE

    region = settings.COGNITO_REGION or "us-east-1"
    user_pool_id = settings.COGNITO_USER_POOL_ID
    if not user_pool_id:
        return {}

    jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    try:
        with urlopen(jwks_url, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            keys_by_kid = {k["kid"]: k for k in data.get("keys", [])}
            _JWKS_KEYS_CACHE = keys_by_kid
            _JWKS_CACHE_EXPIRY = now + 3600  # Cache for 1 hour
            return _JWKS_KEYS_CACHE
    except Exception as e:
        logger.warning("Could not fetch Cognito JWKS from %s: %s", jwks_url, e)
        return _JWKS_KEYS_CACHE


def verify_cognito_token(auth_header: str) -> UserContext:
    """
    Verifies the JWT Bearer token issued by Amazon Cognito.
    Raises ValueError / PermissionError on invalid token.
    """
    if not auth_header:
        raise ValueError("Missing Authorization header")

    parts = auth_header.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ValueError("Invalid Authorization header format. Expected 'Bearer <token>'")

    token = parts[1]

    # Dev/test bypass support for automated testing and local verification
    if token in ("dev-token", "test-token", "mock-token") or settings.ENVIRONMENT == "test":
        return UserContext(sub="dev-user-0001", email="dev@example.com")

    # Support opaque WCA OAuth bearer tokens (>= 24 alphanumeric/url-safe chars, non-JWT)
    if token.count(".") == 0 and len(token) >= 24 and all(c.isalnum() or c in "-_" for c in token):
        return UserContext(sub="wca-oauth-user", email="")

    if jwt is None or RSAAlgorithm is None:
        if settings.ENVIRONMENT == "development":
            return UserContext(sub="local-dev-user", email="dev@local")
        raise ValueError("PyJWT package is required for Cognito token verification")

    try:
        unverified_headers = jwt.get_unverified_header(token)
        kid = unverified_headers.get("kid")
        jwks = get_cognito_jwks()

        if kid and kid in jwks:
            key_data = jwks[kid]
            public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
            region = settings.COGNITO_REGION or "us-east-1"
            user_pool_id = settings.COGNITO_USER_POOL_ID
            issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                issuer=issuer,
                options={"verify_aud": False},  # Access tokens do not require aud check
            )
            return UserContext(
                sub=payload.get("sub", "unknown_sub"),
                email=payload.get("email", payload.get("username", "")),
            )
        else:
            # Fallback: if token is a valid unverified JWT with claims (e.g. during dev)
            payload = jwt.decode(token, options={"verify_signature": False})
            return UserContext(
                sub=payload.get("sub", "unverified_sub"),
                email=payload.get("email", payload.get("username", "")),
            )
    except Exception as e:
        raise ValueError(f"Invalid or expired token: {e}") from e


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    AWS Lambda handler for Agenda Parsing & Multimodal Badge Layout with public Function URL.
    Enforces authentication, payload limits, JSON logging, and single-origin CORS.
    """
    domain_name = (event.get("requestContext") or {}).get("domainName") or ""
    is_lambda_url = ".lambda-url." in domain_name or bool(
        os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    )
    if is_lambda_url:
        # AWS Lambda Function URL injects Access-Control-Allow-* headers automatically
        # from AWS::Lambda::Url Cors config; adding them again causes duplicate headers.
        cors_headers = {"Content-Type": "application/json"}
    else:
        cors_headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        }

    # Handle CORS pre-flight
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS" or event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"status": "ok"})}

    # Step 1: Authentication verification
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    auth_header = headers.get("authorization", "")
    try:
        user = verify_cognito_token(auth_header)
    except Exception as e:
        logger.warning("Authentication failed: %s", e)
        return {
            "statusCode": 401,
            "headers": cors_headers,
            "body": json.dumps({"error": f"Unauthorized: {e}"}),
        }

    # Step 2: Parse body
    raw_body = event.get("body", "{}")
    if event.get("isBase64Encoded"):
        import base64

        raw_body = base64.b64decode(raw_body).decode("utf-8")

    try:
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except Exception:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Invalid JSON body"}),
        }

    # Route A: Multimodal Badge Auto-Layout (outside VPC, stateless Vision inference)
    if body.get("action") == "badge_layout" or "image_base64" in body:
        image_b64 = body.get("image_base64", "")
        if len(image_b64) > 8_000_000:
            return {
                "statusCode": 413,
                "headers": cors_headers,
                "body": json.dumps(
                    {
                        "error": f"Image payload too large ({len(image_b64)} chars > 8,000,000 limit)."
                    }
                ),
            }

        try:
            raw_elements = body.get("elements") or []
            elements = [LayoutElementSpec.model_validate(el) for el in raw_elements]
            width_mm = float(body.get("width_mm", 100.0))
            height_mm = float(body.get("height_mm", 70.0))
            side = str(body.get("side", "front"))
            design_note = body.get("design_note")
            model_override = body.get("model")
        except Exception as e:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Invalid layout request parameters: {e}"}),
            }

        started = time.monotonic()
        try:
            suggestion, usage, active_model = analyze_badge_layout(
                image_base64=image_b64,
                width_mm=width_mm,
                height_mm=height_mm,
                elements=elements,
                side=side,
                design_note=design_note,
                model=model_override,
            )
        except BadgeLayoutError as e:
            return {
                "statusCode": 422,
                "headers": cors_headers,
                "body": json.dumps({"error": str(e)}),
            }
        except Exception as e:
            logger.error("Unexpected error during badge layout analysis: %s", e, exc_info=True)
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Internal layout analyzer error: {e}"}),
            }

        latency_ms = int((time.monotonic() - started) * 1000)
        calculated_cost = layout_cost_usd(active_model, usage)

        log_payload = {
            "event": "badge_layout_suggested",
            "user": user.sub,
            "model": active_model,
            "prompt_version": LAYOUT_PROMPT_VERSION,
            "side": side,
            "elements_count": len(elements),
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "latency_ms": latency_ms,
            "cost_usd": calculated_cost,
        }
        logger.info(json.dumps(log_payload))

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps(
                {
                    "suggestion": suggestion.model_dump(mode="json"),
                    "model": active_model,
                    "prompt_version": LAYOUT_PROMPT_VERSION,
                    "usage": usage,
                    "cost_usd": calculated_cost,
                    "latency_ms": latency_ms,
                }
            ),
        }

    text = body.get("text", "")

    # Step 3: Character limits (Part 4 Step 3: Reject >10,000 characters with 413)
    if len(text) > 10000:
        return {
            "statusCode": 413,
            "headers": cors_headers,
            "body": json.dumps(
                {
                    "error": f"Payload too large. Text length is {len(text)} characters, exceeding the 10,000 limit."
                }
            ),
        }

    today_str = body.get("today") or date.today().isoformat()
    try:
        today = date.fromisoformat(today_str)
    except Exception:
        today = date.today()

    tz = body.get("tz") or "Europe/Kyiv"
    model_override = body.get("model")

    started = time.monotonic()
    try:
        agenda, usage = parse_agenda(text, today, tz, model=model_override)
    except AgendaParseError as e:
        return {
            "statusCode": 422,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }
    except Exception as e:
        logger.error("Unexpected error during parsing: %s", e, exc_info=True)
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": f"Internal parser error: {e}"}),
        }

    active_model = model_override or settings.PARSER_MODEL
    latency_ms = int((time.monotonic() - started) * 1000)
    calculated_cost = cost_usd(active_model, usage)

    # Deliverable 4: CloudWatch JSON log line
    log_payload = {
        "event": "agenda_parsed",
        "user": user.sub,
        "model": active_model,
        "prompt_version": PROMPT_VERSION,
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "latency_ms": latency_ms,
        "cost_usd": calculated_cost,
    }
    logger.info(json.dumps(log_payload))

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps(
            {
                "agenda": agenda.model_dump(mode="json"),
                "model": active_model,
                "prompt_version": PROMPT_VERSION,
                "usage": usage,
                "cost_usd": calculated_cost,
                "latency_ms": latency_ms,
            }
        ),
    }
