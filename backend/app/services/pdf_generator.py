import io
from typing import Any, Dict, List
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


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
    width_mm = float(template_dimensions.get("width_mm", 100.0))
    height_mm = float(template_dimensions.get("height_mm", 70.0))

    page_width = width_mm * mm
    page_height = height_mm * mm

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

    for comp in competitors:
        role_id = comp.get("role_id")
        role_data = roles.get(role_id, {}) if role_id else {}
        role_name = role_data.get("name", "Participant")
        role_style = role_data.get("style", {})

        sides = ["front", "back"] if side_to_export == "both" else [side_to_export]

        for current_side in sides:
            side_def = sides_config.get(current_side, {})
            elements = side_def.get("elements", [])

            c.saveState()
            c.setFillColor(HexColor("#FFFFFF"))
            c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
            c.restoreState()

            sorted_elements = sorted(
                [e for e in elements if e.get("enabled", True)],
                key=lambda x: x.get("position", {}).get("z_index", 1),
            )

            for elem in sorted_elements:
                elem_type = elem.get("type")
                pos = elem.get("position", {})
                style = elem.get("style", {})

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

                if style.get("has_background", False):
                    bg_color = hex_to_color(style.get("background_color", "#FFFFFF"))
                    c.setFillColor(bg_color)
                    border_w = float(style.get("border_width", 0.0))
                    if border_w > 0:
                        c.setStrokeColor(hex_to_color(style.get("border_color", "#000000")))
                        c.setLineWidth(border_w)
                        c.rect(pt_x, pt_y, pt_w, pt_h, fill=1, stroke=1)
                    else:
                        c.rect(pt_x, pt_y, pt_w, pt_h, fill=1, stroke=0)

                if elem_type == "flag":
                    draw_flag_vector(c, comp.get("country_iso2", "UA"), pt_x, pt_y, pt_w, pt_h, opacity)
                    c.restoreState()
                    continue

                text_content = ""
                font_weight = style.get("font_weight", "600")
                font_size = float(style.get("font_size", 12))
                text_color = hex_to_color(style.get("text_color", "#111827"))

                if elem_type == "name":
                    display_mode = elem.get("name_display", "latin_only")
                    if display_mode == "local_only" and comp.get("name_local"):
                        text_content = comp.get("name_local", "")
                    elif display_mode == "both" and comp.get("name_local"):
                        text_content = f"{comp.get('name_latin', '')} ({comp.get('name_local', '')})"
                    else:
                        text_content = comp.get("name_latin", "")

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

                elif elem_type == "role":
                    text_content = role_name
                    if role_style:
                        text_color = hex_to_color(role_style.get("text_color", "#FFFFFF"))
                        role_bg = hex_to_color(role_style.get("background_color", "#2563EB"))
                        c.setFillColor(role_bg)
                        radius = float(role_style.get("border_radius", 4.0))
                        c.roundRect(pt_x, pt_y, pt_w, pt_h, radius, fill=1, stroke=0)

                if style.get("uppercase", False):
                    text_content = text_content.upper()

                is_bold = font_weight in ["700", "800", "bold"]
                is_italic = style.get("italic", False)
                font_name = "Helvetica"
                if is_bold and is_italic:
                    font_name = "Helvetica-BoldOblique"
                elif is_bold:
                    font_name = "Helvetica-Bold"
                elif is_italic:
                    font_name = "Helvetica-Oblique"

                c.setFont(font_name, font_size)
                c.setFillColor(text_color)

                align = style.get("text_align", "center")
                text_y = pt_y + (pt_h / 2.0) - (font_size / 2.8)

                if align == "left":
                    c.drawString(pt_x + 4, text_y, text_content)
                elif align == "right":
                    c.drawRightString(pt_x + pt_w - 4, text_y, text_content)
                else:
                    c.drawCentredString(pt_x + (pt_w / 2.0), text_y, text_content)

                c.restoreState()

            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
