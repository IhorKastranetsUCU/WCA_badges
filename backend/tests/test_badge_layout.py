import base64
import io
import json
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image, ImageDraw
from pydantic import ValidationError

from app.ai.agenda_lambda import handler
from app.ai.badge_layout import (
    LAYOUT_PROMPT_VERSION,
    BadgeLayoutError,
    BadgeLayoutSuggestion,
    LayoutElementSpec,
    SuggestedBrandPalette,
    SuggestedElementPlacement,
    SuggestedRoleStyle,
    _refine_and_clamp_suggestion,
    analyze_badge_layout,
    extract_image_palette,
    layout_cost_usd,
    prepare_badge_image,
)
from app.main import app
from app.services.pdf_generator import get_pdf_font


def _make_sample_badge_data_url(
    top_color: str = "#0F172A", body_color: str = "#FFFFFF"
) -> str:
    img = Image.new("RGB", (600, 420), body_color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 600, 110], fill=top_color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def test_badge_layout_schema_validation():
    """Validates strict Pydantic constraints on SuggestedElementPlacement."""
    valid = BadgeLayoutSuggestion(
        detected_theme="mixed",
        layout_summary="Елементи розташовані у світлій центральній зоні.",
        elements=[
            SuggestedElementPlacement(
                id="elem-name",
                x_mm=10.0,
                y_mm=26.0,
                width_mm=80.0,
                height_mm=12.0,
                font_size=20,
                text_align="center",
                text_color="#0F172A",
            )
        ],
    )
    assert valid.detected_theme == "mixed"
    assert valid.elements[0].text_color == "#0F172A"

    # Invalid hex color should fail validation
    with pytest.raises(ValidationError):
        SuggestedElementPlacement(
            id="elem-name",
            x_mm=10.0,
            y_mm=20.0,
            width_mm=50.0,
            height_mm=10.0,
            text_color="not-a-hex",
        )


def test_prepare_badge_image_and_reject_corrupt():
    """Ensures valid images produce JPEG bytes + 5x5 luminance grid, and corrupt inputs fail."""
    data_url = _make_sample_badge_data_url(top_color="#000000", body_color="#FFFFFF")
    jpeg_bytes, orig_size, grid = prepare_badge_image(data_url)

    assert len(jpeg_bytes) > 100
    assert orig_size == (600, 420)
    assert len(grid) == 5 and len(grid[0]) == 5
    # Top row is dark, center row is bright white
    assert grid[0][2] < 80
    assert grid[2][2] > 220

    with pytest.raises(BadgeLayoutError):
        prepare_badge_image("this-is-not-an-image-at-all")


def test_anti_injection_contrast_and_bounds_clamping():
    """
    Verifies post-inference guardrails clamp out-of-bounds coordinates, strip hallucinated IDs,
    fill missing requested elements, and fix unreadable white-on-white injected text colors.
    """
    requested = [
        LayoutElementSpec(id="elem-name", type="name", label="Name"),
        LayoutElementSpec(id="elem-flag", type="flag", label="Flag"),
    ]
    # Pure white 5x5 grid (luminance 250 everywhere)
    white_grid = [[250] * 5 for _ in range(5)]

    # Simulate malicious visual prompt injection output: white text on white background + out of bounds
    raw_suggestion = BadgeLayoutSuggestion(
        detected_theme="light",
        layout_summary="Injected layout",
        elements=[
            SuggestedElementPlacement(
                id="elem-name",
                x_mm=180.0,  # out of 100mm badge bounds
                y_mm=150.0,  # out of 70mm badge bounds
                width_mm=60.0,
                height_mm=12.0,
                text_color="#FFFFFF",  # unreadable white-on-white
            ),
            SuggestedElementPlacement(
                id="elem-hallucinated",
                x_mm=10.0,
                y_mm=10.0,
                width_mm=20.0,
                height_mm=10.0,
            ),
        ],
    )

    refined = _refine_and_clamp_suggestion(
        suggestion=raw_suggestion,
        requested_elements=requested,
        badge_w=100.0,
        badge_h=70.0,
        luminance_grid=white_grid,
    )

    ids = [el.id for el in refined.elements]
    assert ids == ["elem-name", "elem-flag"]
    name_el = refined.elements[0]
    assert name_el.x_mm + name_el.width_mm <= 98.0
    assert name_el.y_mm + name_el.height_mm <= 68.0
    # Unreadable white-on-white automatically corrected to dark high-contrast text
    assert name_el.text_color == "#0F172A"


def test_layout_cost_calculation():
    usage = {"input_tokens": 1200, "output_tokens": 400}
    cost = layout_cost_usd("gemini-3-flash-preview", usage)
    # 1200 * 0.15/1M + 400 * 0.60/1M = 0.00018 + 0.00024 = 0.00042
    assert cost == 0.00042


@patch("app.ai.badge_layout._call_gemini_layout")
def test_analyze_badge_layout_with_mock_gemini(mock_gemini):
    mock_gemini.return_value = (
        {
            "detected_theme": "mixed",
            "layout_summary": "Елементи розміщено у відкритій центральній зоні.",
            "elements": [
                {
                    "id": "elem-name",
                    "x_mm": 10.0,
                    "y_mm": 28.0,
                    "width_mm": 80.0,
                    "height_mm": 12.0,
                    "font_size": 20,
                    "text_align": "center",
                    "text_color": "#0F172A",
                }
            ],
        },
        {"input_tokens": 1150, "output_tokens": 320},
        "gemini-3-flash-preview",
    )

    data_url = _make_sample_badge_data_url()
    suggestion, usage, model = analyze_badge_layout(
        image_base64=data_url,
        width_mm=100.0,
        height_mm=70.0,
        elements=[LayoutElementSpec(id="elem-name", type="name", label="Participant Name")],
        model="gemini-3-flash-preview",
    )

    assert model == "gemini-3-flash-preview"
    assert usage["input_tokens"] == 1150
    assert len(suggestion.elements) == 1
    assert suggestion.elements[0].id == "elem-name"


@patch("app.ai.badge_layout._call_gemini_layout")
def test_lambda_handler_badge_layout_route(mock_gemini):
    mock_gemini.return_value = (
        {
            "detected_theme": "light",
            "layout_summary": "Оптимальне розташування.",
            "elements": [
                {
                    "id": "elem-name",
                    "x_mm": 12.0,
                    "y_mm": 25.0,
                    "width_mm": 76.0,
                    "height_mm": 12.0,
                    "text_color": "#0F172A",
                }
            ],
        },
        {"input_tokens": 1000, "output_tokens": 250},
        "gemini-3-flash-preview",
    )

    event = {
        "headers": {"authorization": "Bearer dev-token"},
        "body": json.dumps(
            {
                "action": "badge_layout",
                "image_base64": _make_sample_badge_data_url(),
                "width_mm": 100.0,
                "height_mm": 70.0,
                "side": "front",
                "elements": [{"id": "elem-name", "type": "name", "label": "Name"}],
            }
        ),
    }
    res = handler(event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])
    assert body["prompt_version"] == LAYOUT_PROMPT_VERSION
    assert body["suggestion"]["elements"][0]["id"] == "elem-name"


@pytest.mark.asyncio
@patch("app.ai.badge_layout._call_gemini_layout")
async def test_fastapi_badge_layout_and_template_save(mock_gemini):
    mock_gemini.return_value = (
        {
            "detected_theme": "dark",
            "layout_summary": "Контрастне біле розміщення на темному фоні.",
            "elements": [
                {
                    "id": "elem-name",
                    "x_mm": 10.0,
                    "y_mm": 30.0,
                    "width_mm": 80.0,
                    "height_mm": 12.0,
                    "text_color": "#FFFFFF",
                }
            ],
        },
        {"input_tokens": 1100, "output_tokens": 290},
        "gemini-3-flash-preview",
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Valid layout request
        resp = await client.post(
            "/api/ai/badge-layout",
            headers={"Authorization": "Bearer dev-token"},
            json={
                "image_base64": _make_sample_badge_data_url(
                    top_color="#0F172A", body_color="#1E293B"
                ),
                "width_mm": 100.0,
                "height_mm": 70.0,
                "side": "front",
                "elements": [{"id": "elem-name", "type": "name", "label": "Name"}],
            },
        )
        assert resp.status_code == 200
        layout_data = resp.json()
        assert layout_data["suggestion"]["elements"][0]["text_color"] == "#FFFFFF"

        # 2. Invalid non-image payload returns 422
        bad_resp = await client.post(
            "/api/ai/badge-layout",
            json={
                "image_base64": "not_an_image",
                "width_mm": 100.0,
                "height_mm": 70.0,
                "side": "front",
                "elements": [{"id": "elem-name", "type": "name", "label": "Name"}],
            },
        )
        assert bad_resp.status_code == 422

        # 3. Persist verified layout + ai_suggestion via trusted template endpoint
        save_resp = await client.put(
            "/api/badges/templates/current",
            json={"ai_suggestion": layout_data},
        )
        assert save_resp.status_code == 200
        saved_tpl = save_resp.json()
        assert saved_tpl["ai_suggestion"]["model"] == "gemini-3-flash-preview"


def test_extract_image_palette_and_brand_typography_matching():
    """
    Ensures pixel palette extraction finds chromatic brand accents and _refine_and_clamp_suggestion
    preserves brand-tinted text colors, inherits matched fonts, and guards Role + QR contrast.
    """
    # Cream badge (#FFFBEB) with royal burgundy header (#881337) & gold stripe (#D97706)
    img = Image.new("RGB", (600, 420), "#FFFBEB")
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 600, 115], fill="#881337")
    draw.rectangle([0, 115, 600, 145], fill="#D97706")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    data_url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    jpeg_bytes, _size, grid = prepare_badge_image(data_url)
    palette_info = extract_image_palette(jpeg_bytes)

    assert len(palette_info["dominant_colors"]) >= 2
    assert len(palette_info["accent_colors"]) >= 1
    assert palette_info["dark_ink_color"] != "#FFFFFF"

    requested = [
        LayoutElementSpec(id="elem-name", type="name", label="Name"),
        LayoutElementSpec(id="elem-wca-id", type="wca_id", label="WCA ID"),
        LayoutElementSpec(id="elem-role", type="role", label="Role"),
        LayoutElementSpec(id="elem-qr", type="qr_code", label="QR"),
        LayoutElementSpec(id="elem-avatar", type="avatar", label="Avatar"),
    ]
    raw = BadgeLayoutSuggestion(
        detected_theme="light",
        visual_style="classic-championship",
        palette=SuggestedBrandPalette(
            primary_font_family="Playfair Display",
            secondary_font_family="JetBrains Mono",
            primary_text_color="#4C0519",
            secondary_text_color="#78350F",
            accent_color="#881337",
        ),
        role_style=SuggestedRoleStyle(
            background_color="#881337",
            text_color="#8A1538",  # intentionally unreadable low-contrast text on role pill
            font_family="Playfair Display",
            font_weight="700",
            font_size=13,
            border_radius=10.0,
        ),
        layout_summary="Підібрано класичний шрифт Playfair Display та бордово-золоту палітру.",
        elements=[
            SuggestedElementPlacement(
                id="elem-name",
                x_mm=10.0,
                y_mm=34.0,
                width_mm=80.0,
                height_mm=12.0,
                text_color="#4C0519",  # deep burgundy ink on cream background — should be preserved!
            ),
            SuggestedElementPlacement(
                id="elem-wca-id",
                x_mm=15.0,
                y_mm=48.0,
                width_mm=70.0,
                height_mm=7.0,
                text_color="#78350F",  # warm amber-brown ink — should be preserved!
            ),
            SuggestedElementPlacement(
                id="elem-role",
                x_mm=22.0,
                y_mm=57.0,
                width_mm=56.0,
                height_mm=8.5,
            ),
            SuggestedElementPlacement(
                id="elem-qr",
                x_mm=76.0,
                y_mm=46.0,
                width_mm=18.0,
                height_mm=18.0,
                qr_color="#FEF3C7",  # inverted unscannable light-on-light QR — should be fixed!
                qr_bg_color="#FFFFFF",
            ),
            SuggestedElementPlacement(
                id="elem-avatar",
                x_mm=6.0,
                y_mm=34.0,
                width_mm=16.0,
                height_mm=16.0,
            ),
        ],
    )

    refined = _refine_and_clamp_suggestion(
        suggestion=raw,
        requested_elements=requested,
        badge_w=100.0,
        badge_h=70.0,
        luminance_grid=grid,
        palette_info=palette_info,
    )

    by_id = {e.id: e for e in refined.elements}
    # Brand-tinted burgundy & amber text colors preserved (not overwritten to #0F172A!)
    assert by_id["elem-name"].text_color == "#4C0519"
    assert by_id["elem-name"].font_family == "Playfair Display"
    assert by_id["elem-wca-id"].text_color == "#78350F"
    assert by_id["elem-wca-id"].font_family == "JetBrains Mono"

    # Unreadable burgundy-on-burgundy role text corrected to crisp white
    assert refined.role_style is not None
    assert refined.role_style.background_color == "#881337"
    assert refined.role_style.text_color == "#FFFFFF"
    assert refined.role_style.border_radius == 10.0

    # Unscannable light-on-white QR auto-corrected to dark brand ink on white
    assert by_id["elem-qr"].qr_bg_color == "#FFFFFF"
    assert by_id["elem-qr"].qr_color != "#FEF3C7"

    # Avatar automatically gets accent border color
    assert by_id["elem-avatar"].border_color == "#881337"
    assert len(refined.palette.sampled_swatches) >= 2


def test_pdf_font_mapping_with_serif_mono_and_cyrillic_fallback():
    assert get_pdf_font("Playfair Display", is_bold=True, text_sample="Max Park") == "Times-Bold"
    assert (
        get_pdf_font("Playfair Display", is_bold=True, is_italic=True, text_sample="Max Park")
        == "Times-BoldItalic"
    )
    assert get_pdf_font("JetBrains Mono", is_bold=True, text_sample="2024PARK01") == "Courier-Bold"
    # Non-Latin Cyrillic text automatically falls back to Unicode TTF instead of Type1 Times/Courier
    cyr_font = get_pdf_font("Playfair Display", is_bold=True, text_sample="Ігор Коваленко")
    assert "Times" not in cyr_font
