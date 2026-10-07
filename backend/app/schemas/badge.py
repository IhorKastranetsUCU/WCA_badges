from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ElementPosition(BaseModel):
    x_mm: float = Field(..., description="X coordinate in millimeters relative to badge origin")
    y_mm: float = Field(..., description="Y coordinate in millimeters relative to badge origin")
    width_mm: float = Field(..., description="Element width in millimeters")
    height_mm: float = Field(..., description="Element height in millimeters")
    rotation_deg: float = Field(0.0, description="Rotation angle in degrees")
    z_index: int = Field(1, description="Stacking order")


class ElementStyle(BaseModel):
    font_family: str = "Inter"
    font_size: int = 14
    font_weight: str = "600"
    italic: bool = False
    uppercase: bool = False
    text_align: Literal["left", "center", "right"] = "center"
    letter_spacing_mm: float = 0.0
    text_color: str = "#111827"
    has_background: bool = False
    background_color: str = "#FFFFFF"
    border_radius: float = 0.0
    border_width: float = 0.0
    border_color: str = "#000000"
    opacity: float = 1.0
    padding_mm: float = 0.0


class BadgeElement(BaseModel):
    id: str
    type: Literal["name", "wca_id", "flag", "competition_id", "role", "avatar", "qr_code", "schedule"]
    enabled: bool = True
    position: ElementPosition
    style: Optional[ElementStyle] = None
    name_display: Optional[Literal["latin_only", "local_only", "both"]] = "latin_only"
    format_mode: Optional[Literal["raw", "prefix_label", "custom"]] = "prefix_label"
    format_prefix: Optional[str] = ""
    format_suffix: Optional[str] = ""
    opacity: Optional[float] = 1.0
    qr_content: Optional[str] = None
    qr_label: Optional[str] = None
    qr_label_position: Optional[Literal["top", "bottom", "none"]] = "bottom"
    schedule_title: Optional[str] = None
    schedule_data: Optional[Any] = None


class BadgeDimensions(BaseModel):
    preset: Literal["A6", "100x70", "90x70", "Custom"] = "100x70"
    width_mm: float = Field(100.0, ge=20.0, le=200.0)
    height_mm: float = Field(70.0, ge=20.0, le=200.0)


class BadgeSideConfig(BaseModel):
    background_url: Optional[str] = None
    elements: List[BadgeElement] = Field(default_factory=list)


class BadgeSides(BaseModel):
    front: BadgeSideConfig
    back: BadgeSideConfig


class BadgeTemplateOut(BaseModel):
    id: str
    name: str
    is_active: bool
    dimensions: BadgeDimensions
    sides: BadgeSides
    updated_at: datetime

    class Config:
        from_attributes = True


class BadgeTemplateUpdate(BaseModel):
    name: Optional[str] = None
    dimensions: Optional[BadgeDimensions] = None
    sides: Optional[BadgeSides] = None


class ExportPDFRequest(BaseModel):
    template_id: Optional[str] = "current"
    side: Literal["front", "back", "both"] = "front"
    paper_size: Literal["A4", "A5", "Letter", "Legal", "Single"] = "A4"
    parity: Literal["front_even", "front_odd"] = "front_even"
    crop_marks: bool = True
    template_override: Optional[Dict[str, Any]] = None
    competitors: Optional[List[Dict[str, Any]]] = None
    roles: Optional[List[Dict[str, Any]]] = None
    schedule_data: Optional[Dict[str, Any]] = None
