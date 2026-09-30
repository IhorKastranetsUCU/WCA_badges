from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CompetitorBase(BaseModel):
    name_latin: str
    name_local: Optional[str] = None
    name_raw: str
    wca_id: Optional[str] = None
    country_iso2: Optional[str] = None
    country_name: Optional[str] = None
    role_id: Optional[str] = None
    csv_index: int = 1


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorOut(CompetitorBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class CSVUploadResponse(BaseModel):
    total_imported: int
    competitors: List[CompetitorOut]
