import os

# Default to SQLite for isolated test environments (e.g. GitHub Actions runner)
if "DATABASE_URL" not in os.environ and not os.environ.get("POSTGRES_HOST"):
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////tmp/badges_test.db"

import pytest

from app.core.database import Base, engine
from app.models.badge_template import BadgeTemplate  # noqa: F401
from app.models.competitor import Competitor  # noqa: F401
from app.models.meeting import Meeting  # noqa: F401
from app.models.role import Role  # noqa: F401
from app.models.user import User  # noqa: F401


@pytest.fixture(autouse=True, scope="session")
async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    yield
    await engine.dispose()
