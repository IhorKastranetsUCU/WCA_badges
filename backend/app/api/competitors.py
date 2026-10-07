import asyncio
import logging
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.competitor import Competitor
from app.models.role import Role
from app.schemas.competitor import (
    CompetitorOut,
    CSVUploadResponse,
    CompetitorAvatarUpdate,
    CompetitorBatchAvatarsResponse,
)
from app.schemas.wca import ManualCompetitorCreate
from app.services.csv_parser import parse_wca_csv, parse_wca_name, resolve_country_iso2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/competitors", tags=["competitors"])


@router.post("/upload-csv", response_model=CSVUploadResponse)
async def upload_wca_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.lower().endswith(".csv") and file.content_type not in ["text/csv", "application/vnd.ms-excel", "text/plain"]:
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV file")

    content = await file.read()
    records = parse_wca_csv(content)

    if not records:
        raise HTTPException(status_code=400, detail="No valid participant records found in CSV file")

    result = await db.execute(select(Role).where(Role.is_default == True))  # noqa: E712
    default_role = result.scalars().first()
    default_role_id = default_role.id if default_role else None

    await db.execute(delete(Competitor))

    created_entities = []
    for r in records:
        comp = Competitor(
            csv_index=r["csv_index"],
            name_latin=r["name_latin"],
            name_local=r["name_local"],
            name_raw=r["name_raw"],
            wca_id=r["wca_id"],
            country_iso2=r["country_iso2"],
            country_name=r["country_name"],
            role_id=default_role_id,
        )
        db.add(comp)
        created_entities.append(comp)

    await db.commit()

    for comp in created_entities:
        await db.refresh(comp)

    return CSVUploadResponse(
        total_imported=len(created_entities),
        competitors=[CompetitorOut.model_validate(c) for c in created_entities],
    )


@router.get("", response_model=List[CompetitorOut])
async def list_competitors(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Competitor).order_by(Competitor.csv_index.asc()))
    competitors = result.scalars().all()
    return [CompetitorOut.model_validate(c) for c in competitors]


@router.post("/manual", response_model=CompetitorOut, status_code=status.HTTP_201_CREATED)
async def add_manual_competitor(
    payload: ManualCompetitorCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Adds a custom/manual person to the badge generation list,
    even if they are not in the official WCA registration list (e.g. VIP, Guest, Staff, Sponsor).
    """
    # Determine next csv_index
    max_idx_res = await db.execute(select(func.max(Competitor.csv_index)))
    current_max = max_idx_res.scalar() or 0
    next_index = current_max + 1

    # Format name
    latin = payload.name_latin.strip()
    local = payload.name_local.strip() if payload.name_local else None
    if not latin:
        raise HTTPException(status_code=400, detail="Participant name is required")

    name_raw = f"{latin} ({local})" if local else latin
    iso2, country_name = resolve_country_iso2(payload.country_iso2 or payload.country_name)

    # Determine role
    target_role_id = payload.role_id
    if not target_role_id:
        def_role_res = await db.execute(select(Role).where(Role.is_default == True))  # noqa: E712
        def_role = def_role_res.scalars().first()
        target_role_id = def_role.id if def_role else None

    new_comp = Competitor(
        csv_index=next_index,
        name_latin=latin,
        name_local=local,
        name_raw=name_raw,
        wca_id=payload.wca_id.strip() if payload.wca_id else None,
        country_iso2=iso2,
        country_name=country_name,
        role_id=target_role_id,
        avatar_url=payload.avatar_url,
    )
    db.add(new_comp)
    await db.commit()
    await db.refresh(new_comp)

    return CompetitorOut.model_validate(new_comp)


@router.patch("/{competitor_id}/avatar", response_model=CompetitorOut)
async def update_competitor_avatar(
    competitor_id: str,
    payload: CompetitorAvatarUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Updates or removes a competitor's photo (supports WCA image URL or uploaded data URL).
    """
    result = await db.execute(select(Competitor).where(Competitor.id == competitor_id))
    comp = result.scalars().first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")

    comp.avatar_url = payload.avatar_url
    await db.commit()
    await db.refresh(comp)
    return CompetitorOut.model_validate(comp)


@router.post("/fetch-wca-avatars", response_model=CompetitorBatchAvatarsResponse)
async def fetch_wca_avatars(
    db: AsyncSession = Depends(get_db),
):
    """
    Automatically queries WCA API for all competitors with a WCA ID.
    If a real photo exists (is_default is False and not missing_avatar),
    updates avatar_url. If no avatar exists on WCA, sets to None (leaves without photo).
    """
    result = await db.execute(select(Competitor))
    competitors = result.scalars().all()

    wca_competitors = [c for c in competitors if c.wca_id and c.wca_id.strip()]
    if not wca_competitors:
        return CompetitorBatchAvatarsResponse(total_checked=0, avatars_found=0, updated={})

    sem = asyncio.Semaphore(8)
    headers = {
        "User-Agent": "WCA-Badge-Generator/1.0",
        "Accept": "application/json",
    }

    updated_map = {}
    avatars_found_count = 0

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        async def fetch_one(comp: Competitor):
            nonlocal avatars_found_count
            wca_id = comp.wca_id.strip().upper()
            url = f"https://www.worldcubeassociation.org/api/v0/persons/{wca_id}"
            async with sem:
                try:
                    res = await client.get(url, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        avatar_obj = data.get("person", {}).get("avatar") or {}
                        is_default = avatar_obj.get("is_default", False)
                        av_url = avatar_obj.get("url") or avatar_obj.get("thumb_url")

                        if not is_default and av_url and "missing_avatar" not in av_url:
                            comp.avatar_url = av_url
                            updated_map[comp.id] = av_url
                            avatars_found_count += 1
                        else:
                            # User requirement: If there are no avatar just leave it without photo
                            comp.avatar_url = None
                            updated_map[comp.id] = None
                    elif res.status_code == 404:
                        comp.avatar_url = None
                        updated_map[comp.id] = None
                except Exception as e:
                    logger.warning(f"Failed to fetch WCA avatar for {wca_id}: {e}")

        await asyncio.gather(*(fetch_one(c) for c in wca_competitors))

    await db.commit()
    return CompetitorBatchAvatarsResponse(
        total_checked=len(wca_competitors),
        avatars_found=avatars_found_count,
        updated=updated_map,
    )

