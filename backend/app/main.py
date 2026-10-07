from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.badges import router as badges_router
from app.api.competitors import router as competitors_router
from app.api.roles import router as roles_router
from app.api.wca import router as wca_router
from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.role import Role
from app.models.badge_template import BadgeTemplate


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE competitors ADD COLUMN IF NOT EXISTS avatar_url TEXT;"))

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Role).where(Role.is_default == True))  # noqa: E712
            default_role = result.scalars().first()
            if not default_role:
                default_role = Role(
                    id="r-participant",
                    name="Participant",
                    is_default=True,
                    style={
                        "font_family": "Inter",
                        "font_size": 14,
                        "font_weight": "600",
                        "italic": False,
                        "text_align": "center",
                        "text_color": "#FFFFFF",
                        "background_color": "#2563EB",
                        "border_radius": 4.0,
                        "border_width": 0.0,
                        "border_color": "#000000",
                        "opacity": 1.0,
                    },
                )
                session.add(default_role)

            tpl_res = await session.execute(select(BadgeTemplate).where(BadgeTemplate.id == "current"))
            if not tpl_res.scalars().first():
                session.add(BadgeTemplate(id="current", name="Default Template"))

            await session.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Startup DB initialization note: %s", e)

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


app.include_router(competitors_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(badges_router, prefix="/api")
app.include_router(wca_router, prefix="/api")
