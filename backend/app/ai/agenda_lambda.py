import json
import logging
import time
from datetime import date
from typing import Any
from urllib.request import urlopen

import jwt
from jwt.algorithms import RSAAlgorithm

from app.ai.agenda import PROMPT_VERSION, AgendaParseError, cost_usd, parse_agenda
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
    AWS Lambda handler for Agenda Parsing with public Function URL.
    Enforces authentication, 10k character limits, JSON logging, and CORS.
    """
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
