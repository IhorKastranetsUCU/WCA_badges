from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.badge_template import BadgeTemplate
from app.models.competitor import Competitor
from app.models.role import Role
from app.schemas.badge import BadgeTemplateOut, BadgeTemplateUpdate, ExportPDFRequest
from app.services.pdf_generator import render_badges_pdf

router = APIRouter(prefix="/badges", tags=["badges"])


async def get_or_create_default_template(db: AsyncSession) -> BadgeTemplate:
    result = await db.execute(select(BadgeTemplate).where(BadgeTemplate.id == "current"))
    tpl = result.scalars().first()
    if not tpl:
        tpl = BadgeTemplate(id="current", name="Default WCA Template")
        db.add(tpl)
        await db.commit()
        await db.refresh(tpl)
    return tpl


@router.get("/templates/current", response_model=BadgeTemplateOut)
async def get_current_template(db: AsyncSession = Depends(get_db)):
    tpl = await get_or_create_default_template(db)
    return BadgeTemplateOut.model_validate(tpl)


@router.put("/templates/current", response_model=BadgeTemplateOut)
async def update_current_template(
    payload: BadgeTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    tpl = await get_or_create_default_template(db)

    if payload.name is not None:
        tpl.name = payload.name
    if payload.dimensions is not None:
        tpl.dimensions = payload.dimensions.model_dump()
    if payload.sides is not None:
        tpl.sides = payload.sides.model_dump()

    await db.commit()
    await db.refresh(tpl)
    return BadgeTemplateOut.model_validate(tpl)


@router.post("/export-pdf")
async def export_badges_pdf(
    payload: ExportPDFRequest,
    db: AsyncSession = Depends(get_db),
):
    tpl = await get_or_create_default_template(db)

    dims = payload.template_override.get("dimensions") if payload.template_override else tpl.dimensions
    sides = payload.template_override.get("sides") if payload.template_override else tpl.sides

    comp_dicts = []
    if payload.competitors and len(payload.competitors) > 0:
        comp_dicts = payload.competitors
    else:
        comp_res = await db.execute(select(Competitor).order_by(Competitor.csv_index.asc()))
        competitors = comp_res.scalars().all()

        if not competitors:
            comp_dicts = [
                {
                    "csv_index": 1,
                    "name_latin": "Ihor Shevchenko",
                    "name_local": "Ігор Шевченко",
                    "wca_id": "2018SHEV01",
                    "country_iso2": "UA",
                    "country_name": "Ukraine",
                    "role_id": "r-participant",
                },
                {
                    "csv_index": 2,
                    "name_latin": "Artem Zhuravsky",
                    "name_local": "Артем Журавський",
                    "wca_id": "2022ZHUR01",
                    "country_iso2": "UA",
                    "country_name": "Ukraine",
                    "role_id": "r-participant",
                },
            ]
        else:
            for c in competitors:
                comp_dicts.append({
                    "csv_index": c.csv_index,
                    "name_latin": c.name_latin,
                    "name_local": c.name_local,
                    "wca_id": c.wca_id,
                    "country_iso2": c.country_iso2,
                    "country_name": c.country_name,
                    "role_id": c.role_id,
                })

    roles_map = {}
    if payload.roles and len(payload.roles) > 0:
        for r in payload.roles:
            roles_map[r["id"]] = {"name": r.get("name", "Participant"), "style": r.get("style", {})}
    else:
        roles_res = await db.execute(select(Role))
        roles_list = roles_res.scalars().all()
        roles_map = {r.id: {"name": r.name, "style": r.style} for r in roles_list}

    pdf_bytes = render_badges_pdf(
        competitors=comp_dicts,
        roles=roles_map,
        template_dimensions=dims,
        sides_config=sides,
        side_to_export=payload.side,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=wca_badges.pdf"},
    )
