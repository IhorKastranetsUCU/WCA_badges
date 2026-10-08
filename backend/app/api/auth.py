import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.wca import (
    GoogleAuthUrlResponse,
    GoogleCallbackRequest,
    LinkWcaRequest,
    WCAAuthResponse,
    WCAProfile,
)
from app.services.google_auth import (
    GOOGLE_PROFILE_CACHE,
    GOOGLE_WCA_LINKS,
    encode_profile_token,
    exchange_google_or_cognito_code,
    get_competitions_for_google_user,
    get_google_auth_urls,
    save_stored_links,
)
from app.services.wca_api import (
    exchange_wca_code,
    fetch_wca_me_profile,
    get_competitions_for_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/config")
async def get_auth_config():
    """
    Returns public client IDs and auth configuration for frontend setup.
    """
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID,
        "cognito_domain_prefix": settings.COGNITO_DOMAIN_PREFIX,
        "cognito_region": settings.COGNITO_REGION,
        "cognito_user_pool_client_id": settings.COGNITO_USER_POOL_CLIENT_ID,
        "wca_client_id": settings.WCA_CLIENT_ID,
    }


@router.get("/google/url", response_model=GoogleAuthUrlResponse)
async def get_google_auth_url(redirect_uri: Optional[str] = None):
    """
    Returns Google OAuth & AWS Cognito authorization URLs.
    """
    data = get_google_auth_urls(redirect_uri)
    return GoogleAuthUrlResponse(**data)


@router.post("/google/callback", response_model=WCAAuthResponse)
async def handle_google_callback(
    payload: GoogleCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    1. Exchanges Google authorization code.
    2. Writes user to database (users table).
    3. If WCA account was already linked in database, restores WCA profile.
       If not linked, marks needs_wca_link=True so frontend prompts user to connect WCA by API.
    """
    if not payload.code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # 1. Exchange code for user identity
    auth_result = await exchange_google_or_cognito_code(payload.code, payload.redirect_uri)
    google_user = auth_result.get("user_info", {})
    email = (google_user.get("email") or "").strip().lower()
    name = (google_user.get("name") or google_user.get("email") or "Google User").strip()
    picture = google_user.get("picture")
    sub = (google_user.get("sub") or "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="Google authentication did not provide an email address")

    # 2. Write Google user in database (firstly you write him in database)
    db_user = None
    try:
        stmt = select(User).where(User.email == email)
        res = await db.execute(stmt)
        db_user = res.scalars().first()
        if not db_user:
            db_user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                avatar_url=picture,
                google_sub=sub,
                auth_provider="google",
                wca_id=None,
                wca_profile_data=None,
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            logger.info("Saved new Google user to database: %s (id: %s)", email, db_user.id)
        else:
            db_user.name = name
            if picture:
                db_user.avatar_url = picture
            if sub:
                db_user.google_sub = sub
            await db.commit()
            await db.refresh(db_user)
            logger.info("Updated existing Google user in database: %s", email)
    except Exception as e:
        logger.error("Database user error during Google callback: %s", e)

    # 3. Check if user already has a linked WCA account preserved in database
    linked_wca_id = (payload.wca_id or (db_user.wca_id if db_user else None) or GOOGLE_WCA_LINKS.get(email) or "").strip()

    if linked_wca_id:
        clean_wca_id = linked_wca_id.upper()
        try:
            wca_profile = await fetch_wca_me_profile(clean_wca_id)
            if db_user:
                db_user.wca_id = clean_wca_id
                db_user.wca_name = wca_profile.name
                db_user.wca_avatar_url = wca_profile.avatar_url or db_user.avatar_url
                db_user.wca_country_iso2 = wca_profile.country_iso2
                db_user.wca_delegate_status = wca_profile.delegate_status
                db_user.wca_profile_data = wca_profile.model_dump()
                await db.commit()
        except Exception as e:
            logger.warning("Could not refresh WCA profile %s from WCA API: %s", clean_wca_id, e)
            if db_user and db_user.wca_profile_data:
                wca_profile = WCAProfile(**db_user.wca_profile_data)
            else:
                wca_profile = WCAProfile(
                    id=db_user.id if db_user else abs(hash(email)) % 10000000,
                    wca_id=clean_wca_id,
                    name=db_user.wca_name if db_user else name,
                    avatar_url=db_user.wca_avatar_url if db_user else picture,
                    country_iso2=db_user.wca_country_iso2 if db_user else "UA",
                    delegate_status=db_user.wca_delegate_status if db_user else None,
                    is_delegate=bool(db_user and db_user.wca_delegate_status),
                    is_organizer=True,
                    email=email,
                    auth_provider="google",
                )

        wca_profile.auth_provider = "google"
        wca_profile.email = email
        wca_profile.needs_wca_link = False

        comps = await get_competitions_for_google_user(
            wca_profile, (db_user.wca_access_token if db_user else None) or auth_result.get("access_token", "")
        )
        token_str = encode_profile_token(wca_profile)
        GOOGLE_PROFILE_CACHE[token_str] = wca_profile

        return WCAAuthResponse(
            access_token=token_str,
            profile=wca_profile,
            competitions=comps,
            provider="google",
            needs_wca_link=False,
        )

    # 4. User has NO linked WCA account yet:
    # Google user is preserved in DB, needs_wca_link=True signals frontend to prompt WCA API login
    unlinked_profile = WCAProfile(
        id=db_user.id if db_user else abs(hash(email)) % 10000000,
        wca_id=None,
        name=db_user.name if db_user else name,
        avatar_url=db_user.avatar_url if db_user else picture,
        country_iso2="UA",
        delegate_status=None,
        is_delegate=False,
        is_organizer=False,
        email=email,
        auth_provider="google",
        needs_wca_link=True,
    )
    token_str = encode_profile_token(unlinked_profile)
    GOOGLE_PROFILE_CACHE[token_str] = unlinked_profile

    return WCAAuthResponse(
        access_token=token_str,
        profile=unlinked_profile,
        competitions=[],
        provider="google",
        needs_wca_link=True,
    )


@router.post("/link-wca", response_model=WCAAuthResponse)
async def link_wca_account(
    payload: LinkWcaRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Connects user to their WCA profile via API and permanently preserves their WCA data in the database.
    Supports linking via:
    - wca_id: Official WCA ID (e.g. 2024EXAM01)
    - wca_code: WCA OAuth authorization code
    - wca_token: WCA Personal Access Token
    """
    user_email = (payload.user_email or "").strip().lower()
    if not user_email:
        raise HTTPException(status_code=400, detail="User email is required to associate WCA account")

    wca_profile: Optional[WCAProfile] = None
    wca_access_token: Optional[str] = None

    if payload.wca_code:
        token_data = await exchange_wca_code(payload.wca_code, payload.redirect_uri)
        wca_access_token = token_data.get("access_token")
        wca_profile = await fetch_wca_me_profile(wca_access_token)
    elif payload.wca_token:
        wca_access_token = payload.wca_token.strip()
        wca_profile = await fetch_wca_me_profile(wca_access_token)
    elif payload.wca_id:
        clean_wca_id = payload.wca_id.strip().upper()
        if not clean_wca_id:
            raise HTTPException(status_code=400, detail="Valid WCA ID is required")
        wca_profile = await fetch_wca_me_profile(clean_wca_id)
    else:
        raise HTTPException(status_code=400, detail="Please provide wca_id, wca_code, or wca_token")

    if not wca_profile or not wca_profile.wca_id:
        raise HTTPException(status_code=400, detail="Could not retrieve valid WCA profile from WCA API")

    # Preserve WCA data in database
    stmt = select(User).where(User.email == user_email)
    res = await db.execute(stmt)
    db_user = res.scalars().first()
    if not db_user:
        db_user = User(
            id=str(uuid.uuid4()),
            email=user_email,
            name=wca_profile.name,
            avatar_url=wca_profile.avatar_url,
            auth_provider="google",
        )
        db.add(db_user)

    db_user.wca_id = wca_profile.wca_id
    db_user.wca_name = wca_profile.name
    if wca_profile.avatar_url:
        db_user.wca_avatar_url = wca_profile.avatar_url
    db_user.wca_country_iso2 = wca_profile.country_iso2
    db_user.wca_delegate_status = wca_profile.delegate_status
    db_user.wca_profile_data = wca_profile.model_dump()
    if wca_access_token:
        db_user.wca_access_token = wca_access_token

    await db.commit()
    await db.refresh(db_user)
    logger.info("Preserved WCA profile in database for %s: WCA ID %s", user_email, db_user.wca_id)

    # Update persistent file mapping
    GOOGLE_WCA_LINKS[user_email] = db_user.wca_id
    save_stored_links(GOOGLE_WCA_LINKS)

    comps = await get_competitions_for_user(wca_profile, db_user.wca_access_token)
    wca_profile.auth_provider = "google"
    wca_profile.email = user_email
    wca_profile.needs_wca_link = False

    token_str = encode_profile_token(wca_profile)
    GOOGLE_PROFILE_CACHE[token_str] = wca_profile

    return WCAAuthResponse(
        access_token=token_str,
        profile=wca_profile,
        competitions=comps,
        provider="google",
        needs_wca_link=False,
    )
