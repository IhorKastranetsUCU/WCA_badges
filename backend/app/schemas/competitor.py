from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompetitorBase(BaseModel):
    name_latin: str
    name_local: str | None = None
    name_raw: str
    wca_id: str | None = None
    country_iso2: str | None = None
    country_name: str | None = None
    role_id: str | None = None
    csv_index: int = 1
    avatar_url: str | None = None


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorAvatarUpdate(BaseModel):
    avatar_url: str | None = None


class CompetitorOut(CompetitorBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CSVUploadResponse(BaseModel):
    total_imported: int
    competitors: list[CompetitorOut]


class CompetitorBatchAvatarsResponse(BaseModel):
    total_checked: int
    avatars_found: int
    updated: dict
