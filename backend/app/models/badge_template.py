from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, JSON, String

from app.core.database import Base


class BadgeTemplate(Base):
    __tablename__ = "badge_templates"

    id = Column(String(64), primary_key=True, default="current")
    name = Column(String(100), nullable=False, default="Default Template")
    is_active = Column(Boolean, default=True, nullable=False)
    dimensions = Column(
        JSON,
        nullable=False,
        default=lambda: {
            "preset": "100x70",
            "width_mm": 100.0,
            "height_mm": 70.0,
        },
    )
    sides = Column(
        JSON,
        nullable=False,
        default=lambda: {
            "front": {
                "background_url": None,
                "elements": [
                    {
                        "id": "elem-name",
                        "type": "name",
                        "enabled": True,
                        "name_display": "latin_only",
                        "position": {
                            "x_mm": 10.0,
                            "y_mm": 30.0,
                            "width_mm": 80.0,
                            "height_mm": 12.0,
                            "rotation_deg": 0.0,
                            "z_index": 2,
                        },
                        "style": {
                            "font_family": "Inter",
                            "font_size": 18,
                            "font_weight": "700",
                            "italic": False,
                            "uppercase": True,
                            "text_align": "center",
                            "letter_spacing_mm": 0.1,
                            "text_color": "#111827",
                            "has_background": False,
                            "background_color": "#FFFFFF",
                            "border_radius": 0.0,
                            "border_width": 0.0,
                            "border_color": "#000000",
                            "opacity": 1.0,
                            "padding_mm": 0.0,
                        },
                    },
                    {
                        "id": "elem-wca-id",
                        "type": "wca_id",
                        "enabled": True,
                        "format_mode": "prefix_label",
                        "format_prefix": "WCA ID: ",
                        "format_suffix": "",
                        "position": {
                            "x_mm": 10.0,
                            "y_mm": 44.0,
                            "width_mm": 80.0,
                            "height_mm": 8.0,
                            "rotation_deg": 0.0,
                            "z_index": 3,
                        },
                        "style": {
                            "font_family": "Inter",
                            "font_size": 12,
                            "font_weight": "500",
                            "italic": False,
                            "uppercase": False,
                            "text_align": "center",
                            "letter_spacing_mm": 0.0,
                            "text_color": "#4B5563",
                            "has_background": False,
                            "background_color": "#FFFFFF",
                            "border_radius": 0.0,
                            "border_width": 0.0,
                            "border_color": "#000000",
                            "opacity": 1.0,
                            "padding_mm": 0.0,
                        },
                    },
                    {
                        "id": "elem-country-flag",
                        "type": "flag",
                        "enabled": True,
                        "position": {
                            "x_mm": 42.0,
                            "y_mm": 10.0,
                            "width_mm": 16.0,
                            "height_mm": 11.0,
                            "rotation_deg": 0.0,
                            "z_index": 1,
                        },
                        "opacity": 1.0,
                    },
                    {
                        "id": "elem-role",
                        "type": "role",
                        "enabled": True,
                        "position": {
                            "x_mm": 20.0,
                            "y_mm": 54.0,
                            "width_mm": 60.0,
                            "height_mm": 8.0,
                            "rotation_deg": 0.0,
                            "z_index": 4,
                        },
                    },
                    {
                        "id": "elem-comp-id",
                        "type": "competition_id",
                        "enabled": True,
                        "format_mode": "raw",
                        "format_prefix": "",
                        "format_suffix": "",
                        "position": {
                            "x_mm": 75.0,
                            "y_mm": 5.0,
                            "width_mm": 20.0,
                            "height_mm": 6.0,
                            "rotation_deg": 0.0,
                            "z_index": 5,
                        },
                        "style": {
                            "font_family": "Inter",
                            "font_size": 10,
                            "font_weight": "400",
                            "italic": False,
                            "uppercase": False,
                            "text_align": "right",
                            "letter_spacing_mm": 0.0,
                            "text_color": "#9CA3AF",
                            "has_background": False,
                            "background_color": "#FFFFFF",
                            "border_radius": 0.0,
                            "border_width": 0.0,
                            "border_color": "#000000",
                            "opacity": 1.0,
                            "padding_mm": 0.0,
                        },
                    },
                ],
            },
            "back": {
                "background_url": None,
                "elements": [],
            },
        },
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
