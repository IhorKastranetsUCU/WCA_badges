from datetime import datetime
from typing import Any, Literal

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
    type: Literal[
        "name", "wca_id", "flag", "competition_id", "role", "avatar", "qr_code", "schedule"
    ]
    enabled: bool = True
    position: ElementPosition
    style: ElementStyle | None = None
    name_display: Literal["latin_only", "local_only", "both"] | None = "latin_only"
    format_mode: Literal["raw", "prefix_label", "custom"] | None = "prefix_label"
    format_prefix: str | None = ""
    format_suffix: str | None = ""
    opacity: float | None = 1.0
    qr_content: str | None = None
    qr_label: str | None = None
    qr_label_position: Literal["top", "bottom", "none"] | None = "bottom"
    qr_color: str | None = "#000000"
    qr_bg_color: str | None = "#FFFFFF"
    qr_font_family: str | None = "Inter"
    qr_font_size: int | None = 10
    qr_text_color: str | None = "#1E293B"
    schedule_title: str | None = None
    schedule_data: Any | None = None


class BadgeDimensions(BaseModel):
    preset: Literal["A6", "100x70", "90x70", "Custom"] = "100x70"
    width_mm: float = Field(100.0, ge=20.0, le=200.0)
    height_mm: float = Field(70.0, ge=20.0, le=200.0)


class BadgeSideConfig(BaseModel):
    background_url: str | None = None
    elements: list[BadgeElement] = Field(default_factory=list)


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
    name: str | None = None
    dimensions: BadgeDimensions | None = None
    sides: BadgeSides | None = None


class ExportPDFRequest(BaseModel):
    template_id: str | None = "current"
    side: Literal["front", "back", "both"] = "front"
    paper_size: Literal["A4", "A5", "Letter", "Legal", "Single"] = "A4"
    parity: Literal["front_even", "front_odd"] = "front_even"
    crop_marks: bool = True
    template_override: dict[str, Any] | None = None
    competitors: list[dict[str, Any]] | None = None
    roles: list[dict[str, Any]] | None = None
    schedule_data: dict[str, Any] | None = None
