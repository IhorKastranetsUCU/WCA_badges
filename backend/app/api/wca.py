from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
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
    fetch_wca_competition_schedule,
    fetch_wca_me_profile,
    get_competition_registrations_categorized,
    get_competitions_for_user,
    get_wca_authorization_url,
    get_wca_competition_info,
)

router = APIRouter(prefix="/wca", tags=["wca"])


@router.get("/oauth/url", response_model=WCAOAuthUrlResponse)
async def get_oauth_url(redirect_uri: Optional[str] = None):
    """
    Returns the WCA OAuth2 authorization URL to start user login.
    Supports dynamic redirect_uri for local development (e.g. http://localhost:5173/).
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
    Connects with a WCA Personal Access Token and retrieves real profile and managed competitions.
    """
    if not payload.token or not payload.token.strip():
        raise HTTPException(status_code=400, detail="Personal Access Token is required to connect.")

    token = payload.token.strip()
    profile = await fetch_wca_me_profile(token)
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
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.replace("Bearer ", "").strip()
    return await fetch_wca_me_profile(token)


@router.get("/competitions", response_model=List[WCACompetition])
async def list_user_competitions(
    authorization: Optional[str] = Header(None),
):
    """
    Lists competitions where the connected user holds a role (Delegate or Organizer).
    """
    if not authorization:
        return []
    token = authorization.replace("Bearer ", "").strip()
    profile = await fetch_wca_me_profile(token)
    return await get_competitions_for_user(profile, token)


@router.get("/competitions/{competition_id}/schedule")
async def get_competition_schedule(
    competition_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Fetches official competition schedule directly from WCA API, converted to venue timezone.
    """
    token = authorization.replace("Bearer ", "").strip() if authorization else None
    return await fetch_wca_competition_schedule(competition_id, token)


@router.get("/competitions/{competition_id}/info", response_model=Optional[WCACompetition])
async def get_competition_info(competition_id: str):
    """
    Fetches public metadata for any WCA competition by ID.
    """
    info = await get_wca_competition_info(competition_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Competition '{competition_id}' not found on WCA")
    return info


@router.post("/wcif/upload")
async def upload_groupifier_wcif(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """
    Directly receives an exported Groupifier/WCA WCIF JSON file,
    caches it, and returns the competition information, schedule, and competitors.
    """
    comp_id = payload.get("id") or "GroupifierCompetition"
    from app.services.wca_api import _WCIF_CACHE, parse_wca_name, resolve_country_iso2
    _WCIF_CACHE[comp_id] = payload

    res = await db.execute(select(Role).where(Role.is_default == True))  # noqa: E712
    default_role = res.scalars().first()
    default_role_id = default_role.id if default_role else None

    competitors_list = []
    persons = payload.get("persons", [])
    idx = 1
    for p in persons:
        reg = p.get("registration")
        if reg and isinstance(reg, dict):
            if reg.get("isCompeting") is False:
                continue
            st = str(reg.get("status", "accepted")).lower()
            if reg.get("deleted_at") is not None or st in ["deleted", "rejected", "cancelled", "canceled", "declined", "withdrawn", "d"]:
                continue

        raw_name = p.get("name") or "Competitor"
        latin, local = parse_wca_name(raw_name)
        country_str = p.get("countryIso2") or "UA"
        iso2, full_name = resolve_country_iso2(country_str)
        wca_id = p.get("wcaId")
        reg_id = p.get("registrantId") or idx
        avatar_obj = p.get("avatar") or {}
        avatar_url = avatar_obj.get("url") or avatar_obj.get("thumbUrl")

        role_id = default_role_id
        role_name = default_role.name if default_role else "Competitor"
        role_color = (default_role.style or {}).get("background_color", "#2563EB") if default_role else "#2563EB"

        roles = p.get("roles", [])
        if "delegate" in roles or "trainee-delegate" in roles:
            role_name = "Delegate"
            role_color = "#DC2626"
        elif "organizer" in roles:
            role_name = "Organizer"
            role_color = "#D97706"

        competitors_list.append({
            "id": f"wca-{reg_id}",
            "csv_index": idx,
            "registrant_id": reg_id,
            "name_latin": latin,
            "name_local": local,
            "name_raw": raw_name,
            "wca_id": wca_id,
            "country_iso2": iso2,
            "country_name": full_name,
            "avatar_url": avatar_url,
            "role_id": role_id,
            "role_name": role_name,
            "role_color": role_color,
            "custom_data": {},
        })
        idx += 1

    return {
        "competition_id": comp_id,
        "name": payload.get("name", comp_id),
        "persons_count": len(persons),
        "imported_competitors": competitors_list,
        "has_schedule": bool(payload.get("schedule", {}).get("venues")),
        "message": f"Successfully loaded Groupifier data for {comp_id}",
    }


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
        if item.selected
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
        final_id = reg.user_id if (reg.user_id and reg.user_id > 0) else idx
        comp = Competitor(
            csv_index=final_id,
            name_latin=reg.name_latin,
            name_local=reg.name_local,
            name_raw=reg.name_raw,
            wca_id=reg.wca_id,
            country_iso2=reg.country_iso2,
            country_name=reg.country_name,
            role_id=default_role_id,
            avatar_url=reg.avatar_url,
        )
        db.add(comp)
        created.append(comp)

    await db.commit()
    for c in created:
        await db.refresh(c)

    return [CompetitorOut.model_validate(c) for c in created]


@router.post("/pdf/upload-assignments")
async def upload_assignments_pdf(
    file: UploadFile = File(...),
):
    """
    Receives an uploaded Groupifier competitor cards PDF,
    parses each competitor's assignments for all events,
    and returns structured assignments keyed by registrant_id, wca_id, and name.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    try:
        from app.services.assignment_pdf_parser import parse_competitor_cards_pdf

        contents = await file.read()
        parsed = parse_competitor_cards_pdf(contents)
        return parsed
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to parse competitor cards PDF: {str(e)}"
        )
