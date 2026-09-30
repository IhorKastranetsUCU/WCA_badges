from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.competitor import Competitor
from app.models.role import Role
from app.schemas.competitor import CompetitorOut, CSVUploadResponse
from app.schemas.wca import ManualCompetitorCreate
from app.services.csv_parser import parse_wca_csv, parse_wca_name, resolve_country_iso2

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
    )
    db.add(new_comp)
    await db.commit()
    await db.refresh(new_comp)

    return CompetitorOut.model_validate(new_comp)
