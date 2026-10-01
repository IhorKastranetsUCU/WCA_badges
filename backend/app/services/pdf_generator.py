import io
import os
import base64
import logging
from typing import Any, Dict, List
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

logger = logging.getLogger(__name__)

# Register Unicode TrueType fonts (DejaVuSans) if available
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

_FONTS_REGISTERED = False


def _ensure_fonts_registered():
    global FONT_REGULAR, FONT_BOLD, _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return

    candidates_regular = [
        os.path.join(os.path.dirname(__file__), "..", "fonts", "DejaVuSans.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    candidates_bold = [
        os.path.join(os.path.dirname(__file__), "..", "fonts", "DejaVuSans-Bold.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]

    reg_path = next((p for p in candidates_regular if os.path.exists(p)), None)
    bold_path = next((p for p in candidates_bold if os.path.exists(p)), None)

    if reg_path:
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", reg_path))
            FONT_REGULAR = "DejaVuSans"
        except Exception as e:
            logger.warning(f"Could not register DejaVuSans: {e}")

    if bold_path:
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold_path))
            FONT_BOLD = "DejaVuSans-Bold"
        except Exception as e:
            logger.warning(f"Could not register DejaVuSans-Bold: {e}")

    _FONTS_REGISTERED = True


def hex_to_color(hex_str: str, default: str = "#000000") -> HexColor:
    try:
        if not hex_str or not hex_str.startswith("#"):
            return HexColor(default)
        return HexColor(hex_str)
    except Exception:
        return HexColor(default)


def draw_flag_vector(c: canvas.Canvas, iso2: str, x: float, y: float, w: float, h: float, opacity: float = 1.0):
    c.saveState()
    c.setFillAlpha(opacity)
    iso = (iso2 or "").upper()

    if iso == "UA":
        half_h = h / 2.0
        c.setFillColor(HexColor("#0057B7"))
        c.rect(x, y + half_h, w, half_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFDD00"))
        c.rect(x, y, w, half_h, fill=1, stroke=0)
    elif iso == "PL":
        half_h = h / 2.0
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(x, y + half_h, w, half_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#DC143C"))
        c.rect(x, y, w, half_h, fill=1, stroke=0)
    elif iso == "DE":
        third_h = h / 3.0
        c.setFillColor(HexColor("#000000"))
        c.rect(x, y + 2 * third_h, w, third_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#DD0000"))
        c.rect(x, y + third_h, w, third_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFCE00"))
        c.rect(x, y, w, third_h, fill=1, stroke=0)
    elif iso == "FR":
        third_w = w / 3.0
        c.setFillColor(HexColor("#002654"))
        c.rect(x, y, third_w, h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(x + third_w, y, third_w, h, fill=1, stroke=0)
        c.setFillColor(HexColor("#ED2939"))
        c.rect(x + 2 * third_w, y, third_w, h, fill=1, stroke=0)
    else:
        c.setFillColor(HexColor("#3B82F6"))
        c.rect(x, y, w, h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + w / 2.0, y + h / 2.0 - 3, iso[:2])

    c.setStrokeColor(HexColor("#E5E7EB"))
    c.setLineWidth(0.5)
    c.rect(x, y, w, h, fill=0, stroke=1)
    c.restoreState()


def render_badges_pdf(
    competitors: List[Dict[str, Any]],
    roles: Dict[str, Dict[str, Any]],
    template_dimensions: Dict[str, Any],
    sides_config: Dict[str, Any],
    side_to_export: str = "front",
) -> bytes:
    _ensure_fonts_registered()
    width_mm = float(template_dimensions.get("width_mm", 100.0))
    height_mm = float(template_dimensions.get("height_mm", 70.0))

    page_width = width_mm * mm
    page_height = height_mm * mm

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

    # Pre-cache background images outside competitor loop for high performance and low memory
    side_bg_draw_params: Dict[str, Any] = {}
    sides_to_check = ["front", "back"] if side_to_export == "both" else [side_to_export]
    for side_name in sides_to_check:
        side_def = sides_config.get(side_name, {})
        bg_url = side_def.get("background_url")
        if bg_url:
            try:
                img_reader = None
                if bg_url.startswith("data:image"):
                    _, b64data = bg_url.split(",", 1)
                    img_bytes = base64.b64decode(b64data)
                    img_reader = ImageReader(io.BytesIO(img_bytes))
                elif bg_url.startswith("http://") or bg_url.startswith("https://"):
                    img_reader = ImageReader(bg_url)

                if img_reader:
                    img_w, img_h = img_reader.getSize()
                    if img_w > 0 and img_h > 0:
                        # Emulate CSS background-size: cover; background-position: center
                        scale = max(page_width / img_w, page_height / img_h)
                        draw_w = img_w * scale
                        draw_h = img_h * scale
                        offset_x = (page_width - draw_w) / 2.0
                        offset_y = (page_height - draw_h) / 2.0
                        side_bg_draw_params[side_name] = {
                            "reader": img_reader,
                            "x": offset_x,
                            "y": offset_y,
                            "w": draw_w,
                            "h": draw_h,
                        }
            except Exception as e:
                logger.warning(f"Failed to pre-decode background image for side {side_name}: {e}")

    for comp in competitors:
        role_id = comp.get("role_id")
        role_data = roles.get(role_id, {}) if role_id else {}
        role_name = role_data.get("name", "Participant")
        role_style = role_data.get("style", {})

        sides = ["front", "back"] if side_to_export == "both" else [side_to_export]

        for current_side in sides:
            side_def = sides_config.get(current_side, {})
            elements = side_def.get("elements", [])

            # Page background
            c.saveState()
            c.setFillColor(HexColor("#FFFFFF"))
            c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

            # Optional uploaded background image (cover & center)
            if current_side in side_bg_draw_params:
                bg_params = side_bg_draw_params[current_side]
                c.saveState()
                path = c.beginPath()
                path.rect(0, 0, page_width, page_height)
                c.clipPath(path, stroke=0)
                c.drawImage(
                    bg_params["reader"],
                    bg_params["x"],
                    bg_params["y"],
                    width=bg_params["w"],
                    height=bg_params["h"],
                )
                c.restoreState()
            c.restoreState()

            sorted_elements = sorted(
                [e for e in elements if e.get("enabled", True)],
                key=lambda x: x.get("position", {}).get("z_index", 1),
            )

            for elem in sorted_elements:
                elem_type = elem.get("type")
                pos = elem.get("position", {})
                style = elem.get("style", {}) or {}

                x_mm = float(pos.get("x_mm", 0.0))
                y_mm = float(pos.get("y_mm", 0.0))
                w_mm = float(pos.get("width_mm", 50.0))
                h_mm = float(pos.get("height_mm", 10.0))
                opacity = float(elem.get("opacity", style.get("opacity", 1.0)))

                pt_x = x_mm * mm
                pt_y = (height_mm - y_mm - h_mm) * mm
                pt_w = w_mm * mm
                pt_h = h_mm * mm

                c.saveState()
                c.setFillAlpha(opacity)

                # Background styling (role or element has_background)
                if elem_type == "role":
                    bg_hex = role_style.get("background_color", "#2563EB")
                    c.setFillColor(hex_to_color(bg_hex, "#2563EB"))
                    radius_mm = float(role_style.get("border_radius", 4.0))
                    radius_pt = min(radius_mm * mm * 0.5, min(pt_w, pt_h) / 2.0)
                    if radius_pt > 0:
                        c.roundRect(pt_x, pt_y, pt_w, pt_h, radius_pt, fill=1, stroke=0)
                    else:
                        c.rect(pt_x, pt_y, pt_w, pt_h, fill=1, stroke=0)
                elif style.get("has_background", False):
                    bg_color = hex_to_color(style.get("background_color", "#FFFFFF"))
                    c.setFillColor(bg_color)
                    border_w = float(style.get("border_width", 0.0))
                    radius_mm = float(style.get("border_radius", 0.0))
                    radius_pt = min(radius_mm * mm * 0.5, min(pt_w, pt_h) / 2.0)

                    has_stroke = border_w > 0
                    if has_stroke:
                        c.setStrokeColor(hex_to_color(style.get("border_color", "#000000")))
                        c.setLineWidth(border_w)

                    if radius_pt > 0:
                        c.roundRect(pt_x, pt_y, pt_w, pt_h, radius_pt, fill=1, stroke=1 if has_stroke else 0)
                    else:
                        c.rect(pt_x, pt_y, pt_w, pt_h, fill=1, stroke=1 if has_stroke else 0)

                # Flag element
                if elem_type == "flag":
                    draw_flag_vector(c, comp.get("country_iso2", "UA"), pt_x, pt_y, pt_w, pt_h, opacity)
                    c.restoreState()
                    continue

                # Text resolution
                text_content = ""
                font_weight = "600"
                font_size = 14.0
                text_color = HexColor("#111827")
                align = "center"

                if elem_type == "name":
                    display_mode = elem.get("name_display", "latin_only")
                    local_name = comp.get("name_local")
                    latin_name = comp.get("name_latin") or "Participant"
                    if display_mode == "local_only" and local_name:
                        text_content = local_name
                    elif display_mode == "both" and local_name:
                        text_content = f"{latin_name} ({local_name})"
                    else:
                        text_content = latin_name

                    font_weight = style.get("font_weight", "700")
                    font_size = float(style.get("font_size", 18))
                    text_color = hex_to_color(style.get("text_color", "#111827"))
                    align = style.get("text_align", "center")

                elif elem_type == "wca_id":
                    raw_id = comp.get("wca_id") or "Newcomer"
                    fmt = elem.get("format_mode", "prefix_label")
                    if fmt == "prefix_label":
                        text_content = f"WCA ID: {raw_id}"
                    elif fmt == "custom":
                        prefix = elem.get("format_prefix", "")
                        suffix = elem.get("format_suffix", "")
                        text_content = f"{prefix}{raw_id}{suffix}"
                    else:
                        text_content = raw_id

                    font_weight = style.get("font_weight", "500")
                    font_size = float(style.get("font_size", 13))
                    text_color = hex_to_color(style.get("text_color", "#4B5563"))
                    align = style.get("text_align", "center")

                elif elem_type == "competition_id":
                    raw_idx = str(comp.get("csv_index", 1))
                    fmt = elem.get("format_mode", "raw")
                    if fmt == "prefix_label":
                        text_content = f"ID: {raw_idx}"
                    elif fmt == "custom":
                        prefix = elem.get("format_prefix", "")
                        suffix = elem.get("format_suffix", "")
                        text_content = f"{prefix}{raw_idx}{suffix}"
                    else:
                        text_content = raw_idx

                    font_weight = style.get("font_weight", "500")
                    font_size = float(style.get("font_size", 10))
                    text_color = hex_to_color(style.get("text_color", "#9CA3AF"))
                    align = style.get("text_align", "right")

                elif elem_type == "role":
                    text_content = role_name
                    font_weight = role_style.get("font_weight", "600")
                    font_size = float(role_style.get("font_size", 12))
                    text_color = hex_to_color(role_style.get("text_color", "#FFFFFF"))
                    align = role_style.get("text_align", "center")

                if style.get("uppercase", False):
                    text_content = text_content.upper()

                is_bold = font_weight in ["700", "800", "bold"]
                font_name = FONT_BOLD if is_bold else FONT_REGULAR

                c.setFont(font_name, font_size)
                c.setFillColor(text_color)

                pad_pt = 3.0
                max_w = pt_w - (2 * pad_pt)
                actual_w = c.stringWidth(text_content, font_name, font_size)
                if actual_w > max_w and max_w > 0:
                    font_size = max(6.0, font_size * (max_w / actual_w))
                    c.setFont(font_name, font_size)

                # Vertical center formula: box_center_y - 0.35 * font_size
                text_y = pt_y + (pt_h / 2.0) - (font_size * 0.35)

                if align == "left":
                    c.drawString(pt_x + pad_pt, text_y, text_content)
                elif align == "right":
                    c.drawRightString(pt_x + pt_w - pad_pt, text_y, text_content)
                else:
                    c.drawCentredString(pt_x + (pt_w / 2.0), text_y, text_content)

                c.restoreState()

            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
