from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RoleStyle(BaseModel):
    font_family: str = "Inter"
    font_size: int = 14
    font_weight: str = "600"
    italic: bool = False
    text_align: str = "center"
    text_color: str = "#FFFFFF"
    background_color: str = "#2563EB"
    border_radius: float = 4.0
    border_width: float = 0.0
    border_color: str = "#000000"
    opacity: float = 1.0


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    style: RoleStyle = Field(default_factory=RoleStyle)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    style: Optional[Dict[str, Any]] = None


class RoleAssignRequest(BaseModel):
    competitor_id: str


class RoleOut(RoleBase):
    id: str
    is_default: bool
    created_at: datetime
    assigned_competitor_ids: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True
