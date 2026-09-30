from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.competitor import Competitor
from app.models.role import Role
from app.schemas.competitor import CompetitorOut
from app.schemas.wca import (
    WCAAuthResponse,
    WCACompetition,
    WCAImportRequest,
    WCAOAuthCallbackRequest,
    WCAOAuthUrlResponse,
    WCAProfile,
    WCARegistrationsCategorized,
    WCATokenLoginRequest,
)
from app.services.wca_api import (
    DEMO_PROFILES,
    exchange_wca_code,
    fetch_wca_me_profile,
    get_competition_registrations_categorized,
    get_competitions_for_user,
    get_wca_authorization_url,
)

router = APIRouter(prefix="/wca", tags=["wca"])


@router.get("/oauth/url", response_model=WCAOAuthUrlResponse)
async def get_oauth_url(redirect_uri: Optional[str] = None):
    """
    Returns the WCA OAuth2 authorization URL to start user login.
    Allows specifying redirect_uri for local development (e.g. http://localhost:5173/).
    """
    data = get_wca_authorization_url(redirect_uri)
    return WCAOAuthUrlResponse(**data)


@router.post("/oauth/callback", response_model=WCAAuthResponse)
async def handle_oauth_callback(payload: WCAOAuthCallbackRequest):
    """
    Exchanges OAuth code for access token and retrieves profile and managed competitions.
    """
    token_data = await exchange_wca_code(payload.code, payload.redirect_uri)
    access_token = token_data.get("access_token", f"wca_tok_{payload.code[:8]}")

    profile = await fetch_wca_me_profile(access_token)
    comps = await get_competitions_for_user(profile, access_token)

    return WCAAuthResponse(
        access_token=access_token,
        profile=profile,
        competitions=comps,
    )


@router.post("/login", response_model=WCAAuthResponse)
async def login_with_token_or_demo(payload: WCATokenLoginRequest):
    """
    Allows connecting either via a Personal Access Token or selecting a preconfigured
    Delegate / Organizer profile for immediate testing and demonstration.
    """
    if payload.token and not payload.demo_role:
        token = payload.token.strip()
        profile = await fetch_wca_me_profile(token)
    else:
        role_key = payload.demo_role if payload.demo_role in DEMO_PROFILES else "delegate"
        profile = DEMO_PROFILES[role_key]
        token = f"wca_demo_token_{role_key}"

    comps = await get_competitions_for_user(profile, token)

    return WCAAuthResponse(
        access_token=token,
        profile=profile,
        competitions=comps,
    )


@router.get("/me", response_model=WCAProfile)
async def get_current_profile(authorization: Optional[str] = Header(None)):
    """
    Returns the currently connected WCA profile.
    """
    if not authorization:
        return DEMO_PROFILES["delegate"]
    token = authorization.replace("Bearer ", "")
    return await fetch_wca_me_profile(token)


@router.get("/competitions", response_model=List[WCACompetition])
async def list_user_competitions(
    authorization: Optional[str] = Header(None),
):
    """
    Lists competitions where the connected user holds a role (Delegate or Organizer).
    """
    token = authorization.replace("Bearer ", "") if authorization else None
    if token and not token.startswith("wca_demo_"):
        profile = await fetch_wca_me_profile(token)
    elif token and "organizer" in token:
        profile = DEMO_PROFILES["organizer"]
    else:
        profile = DEMO_PROFILES["delegate"]

    return await get_competitions_for_user(profile, token)


@router.get("/competitions/{competition_id}/registrations", response_model=WCARegistrationsCategorized)
async def get_competition_registrations(
    competition_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Fetches registrations for a competition from WCA API, separated into:
    Approved, Pending, and Cancelled.
    """
    token = authorization.replace("Bearer ", "") if authorization else None
    return await get_competition_registrations_categorized(competition_id, token)


@router.post("/competitions/{competition_id}/import", response_model=List[CompetitorOut])
async def import_selected_registrations(
    competition_id: str,
    payload: WCAImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Imports user-selected registrations into the active badge generator list.
    """
    selected_items = [
        item for item in payload.selected_registrations
        if item.selected and str(item.status).lower() not in ["cancelled", "deleted", "rejected", "canceled", "declined", "withdrawn", "d"]
    ]
    if not selected_items:
        raise HTTPException(status_code=400, detail="No competitors were selected for import")

    # Fetch default role
    res = await db.execute(select(Role).where(Role.is_default == True))  # noqa: E712
    default_role = res.scalars().first()
    default_role_id = default_role.id if default_role else None

    # Clear previous list
    await db.execute(delete(Competitor))

    created = []
    for idx, reg in enumerate(selected_items, 1):
        comp = Competitor(
            csv_index=idx,
            name_latin=reg.name_latin,
            name_local=reg.name_local,
            name_raw=reg.name_raw,
            wca_id=reg.wca_id,
            country_iso2=reg.country_iso2,
            country_name=reg.country_name,
            role_id=default_role_id,
        )
        db.add(comp)
        created.append(comp)

    await db.commit()
    for c in created:
        await db.refresh(c)

    return [CompetitorOut.model_validate(c) for c in created]
