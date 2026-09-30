from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.competitor import Competitor
from app.models.role import Role
from app.schemas.role import RoleAssignRequest, RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=List[RoleOut])
async def list_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Role).order_by(Role.is_default.desc(), Role.created_at.asc()))
    roles = result.scalars().all()

    output = []
    for r in roles:
        assigned_ids = [c.id for c in r.competitors] if r.competitors else []
        output.append(
            RoleOut(
                id=r.id,
                name=r.name,
                is_default=r.is_default,
                style=r.style,
                created_at=r.created_at,
                assigned_competitor_ids=assigned_ids,
            )
        )
    return output


@router.post("", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(payload: RoleCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Role).where(Role.name == payload.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    new_role = Role(
        name=payload.name,
        is_default=False,
        style=payload.style.model_dump(),
    )
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)

    return RoleOut(
        id=new_role.id,
        name=new_role.name,
        is_default=new_role.is_default,
        style=new_role.style,
        created_at=new_role.created_at,
        assigned_competitor_ids=[],
    )


@router.put("/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: str,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.name is not None and payload.name.strip():
        role.name = payload.name.strip()
    if payload.style is not None:
        role.style = payload.style

    await db.commit()
    await db.refresh(role)

    assigned_ids = [c.id for c in role.competitors] if role.competitors else []
    return RoleOut(
        id=role.id,
        name=role.name,
        is_default=role.is_default,
        style=role.style,
        created_at=role.created_at,
        assigned_competitor_ids=assigned_ids,
    )


@router.put("/{role_id}/assign", response_model=RoleOut)
async def assign_user_to_role(
    role_id: str,
    payload: RoleAssignRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    comp_result = await db.execute(select(Competitor).where(Competitor.id == payload.competitor_id))
    competitor = comp_result.scalars().first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    competitor.role_id = role.id
    await db.commit()
    await db.refresh(role)

    assigned_ids = [c.id for c in role.competitors] if role.competitors else []
    return RoleOut(
        id=role.id,
        name=role.name,
        is_default=role.is_default,
        style=role.style,
        created_at=role.created_at,
        assigned_competitor_ids=assigned_ids,
    )
