import io
import os
import base64
import logging
from typing import Any, Dict, List, Optional, Tuple
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import qrcode
from PIL import Image

logger = logging.getLogger(__name__)

# Register Unicode TrueType fonts (DejaVuSans) if available
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
_FONTS_REGISTERED = False

PAPER_SIZES: Dict[str, Tuple[float, float]] = {
    "A4": (210.0, 297.0),
    "A5": (148.0, 210.0),
    "Letter": (215.9, 279.4),
    "Legal": (215.9, 355.6),
}


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

    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.rect(x, y, w, h, fill=0, stroke=1)
    c.restoreState()


def draw_qr_code(c: canvas.Canvas, content: str, label: Optional[str], label_pos: str, x: float, y: float, w: float, h: float, opacity: float = 1.0):
    c.saveState()
    c.setFillAlpha(opacity)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1,
    )
    qr.add_data(content or "https://live.worldcubeassociation.org")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    qr_reader = ImageReader(img_buffer)

    has_label = bool(label and label.strip())
    label_h = 10.0 if has_label else 0.0

    qr_y = y
    qr_h = h
    if has_label and label_pos != "bottom":
        qr_h = max(10.0, h - label_h)
    elif has_label and label_pos == "bottom":
        qr_y = y + label_h
        qr_h = max(10.0, h - label_h)

    qr_size = min(w, qr_h)
    qr_x = x + (w - qr_size) / 2.0
    qr_actual_y = qr_y + (qr_h - qr_size) / 2.0

    c.drawImage(qr_reader, qr_x, qr_actual_y, width=qr_size, height=qr_size)

    if has_label:
        c.setFont(FONT_BOLD, 7)
        c.setFillColor(HexColor("#0F172A"))
        if label_pos == "bottom":
            c.drawCentredString(x + w / 2.0, y + 2, label.upper())
        else:
            c.drawCentredString(x + w / 2.0, y + h - 8, label.upper())

    c.restoreState()


def draw_schedule_table(c: canvas.Canvas, title: Optional[str], x: float, y: float, w: float, h: float, opacity: float = 1.0):
    c.saveState()
    c.setFillAlpha(opacity)

    # Schedule box background & border
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.rect(x, y, w, h, fill=1, stroke=1)

    # 4 columns for Thu, Fri, Sat, Sun
    col_w = w / 4.0
    days = [
        ("Thursday", [("9:20", "3x3 OH", "C"), ("12:45", "LUNCH", ""), ("15:45", "4x4x4", "C"), ("17:15", "Clock", "C")]),
        ("Friday", [("9:30", "3x3 FM", "C"), ("12:00", "3x3 BF", "C"), ("13:20", "Sq-1", "C"), ("16:55", "Mega", "C")]),
        ("Saturday", [("9:55", "5x5x5", "C"), ("12:15", "Pyra", "C"), ("13:35", "2x2x2", "QR"), ("16:30", "3x3x3", "C")]),
        ("Sunday", [("11:10", "3x3 R2", "QR"), ("13:25", "LUNCH", ""), ("15:15", "Pyra F", "QR"), ("17:50", "AWARDS", "")]),
    ]

    header_h = min(12.0, h * 0.15)
    c.setFont(FONT_BOLD, 6)

    for i, (day_name, entries) in enumerate(days):
        col_x = x + i * col_w

        # Column header
        c.setFillColor(HexColor("#334155"))
        c.rect(col_x, y + h - header_h, col_w, header_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.drawCentredString(col_x + col_w / 2.0, y + h - header_h + 3, day_name[:4].upper())

        # Column divider
        if i > 0:
            c.setStrokeColor(HexColor("#E2E8F0"))
            c.setLineWidth(0.5)
            c.line(col_x, y, col_x, y + h - header_h)

        # Entries
        row_count = len(entries)
        row_h = (h - header_h) / max(1, row_count)
        for r_idx, (t_time, t_ev, t_task) in enumerate(entries):
            r_y = y + h - header_h - (r_idx + 1) * row_h
            c.setFont(FONT_REGULAR, 5)
            c.setFillColor(HexColor("#64748B"))
            c.drawString(col_x + 1.5, r_y + (row_h / 2.0) - 2, t_time)

            c.setFont(FONT_BOLD, 5)
            c.setFillColor(HexColor("#1E293B"))
            c.drawString(col_x + col_w * 0.4, r_y + (row_h / 2.0) - 2, t_ev)

            if t_task == "C":
                c.setFillColor(HexColor("#FFE4E6"))
                c.roundRect(col_x + col_w - 9, r_y + 1, 7.5, row_h - 2, 1, fill=1, stroke=0)
                c.setFillColor(HexColor("#9F1239"))
                c.drawCentredString(col_x + col_w - 5.2, r_y + (row_h / 2.0) - 1.8, "C")
            elif t_task:
                c.setFillColor(HexColor("#F1F5F9"))
                c.roundRect(col_x + col_w - 11, r_y + 1, 9.5, row_h - 2, 1, fill=1, stroke=0)
                c.setFillColor(HexColor("#475569"))
                c.drawCentredString(col_x + col_w - 6.2, r_y + (row_h / 2.0) - 1.8, t_task)

    c.restoreState()


def draw_single_badge(
    c: canvas.Canvas,
    comp: Dict[str, Any],
    role_data: Dict[str, Any],
    side_name: str,
    side_def: Dict[str, Any],
    origin_x: float,
    origin_y: float,
    badge_w_pt: float,
    badge_h_pt: float,
    badge_h_mm: float,
    bg_params: Optional[Dict[str, Any]],
    crop_marks: bool = True,
):
    c.saveState()

    # Clip to badge boundary
    clip_p = c.beginPath()
    clip_p.rect(origin_x, origin_y, badge_w_pt, badge_h_pt)
    c.clipPath(clip_p, stroke=0)

    # Base white fill
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(origin_x, origin_y, badge_w_pt, badge_h_pt, fill=1, stroke=0)

    # Background image (cover & center)
    if bg_params:
        c.saveState()
        c.drawImage(
            bg_params["reader"],
            origin_x + bg_params["x"],
            origin_y + bg_params["y"],
            width=bg_params["w"],
            height=bg_params["h"],
        )
        c.restoreState()

    role_name = role_data.get("name", "Participant")
    role_style = role_data.get("style", {})
    elements = side_def.get("elements", [])
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

        pt_x = origin_x + (x_mm * mm)
        pt_y = origin_y + ((badge_h_mm - y_mm - h_mm) * mm)
        pt_w = w_mm * mm
        pt_h = h_mm * mm

        c.saveState()
        c.setFillAlpha(opacity)

        # Role styling or element background
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

        # Flag
        if elem_type == "flag":
            draw_flag_vector(c, comp.get("country_iso2", "UA"), pt_x, pt_y, pt_w, pt_h, opacity)
            c.restoreState()
            continue

        # Avatar / Photo
        if elem_type == "avatar":
            avatar_url = comp.get("avatar_url")
            rendered = False
            if avatar_url:
                try:
                    if avatar_url.startswith("data:image"):
                        _, b64 = avatar_url.split(",", 1)
                        img_bytes = base64.b64decode(b64)
                        av_reader = ImageReader(io.BytesIO(img_bytes))
                    else:
                        av_reader = ImageReader(avatar_url)
                    c.drawImage(av_reader, pt_x, pt_y, width=pt_w, height=pt_h)
                    rendered = True
                except Exception:
                    rendered = False

            if not rendered:
                # Placeholder avatar box
                c.setFillColor(HexColor("#F1F5F9"))
                c.setStrokeColor(HexColor("#CBD5E1"))
                c.setLineWidth(0.5)
                c.roundRect(pt_x, pt_y, pt_w, pt_h, 4, fill=1, stroke=1)
                c.setFillColor(HexColor("#94A3B8"))
                c.setFont(FONT_BOLD, min(8, pt_h * 0.25))
                initials = (comp.get("name_latin") or "P")[:2].upper()
                c.drawCentredString(pt_x + pt_w / 2.0, pt_y + pt_h / 2.0 - 3, initials)

            c.restoreState()
            continue

        # QR Code
        if elem_type == "qr_code":
            qr_text = elem.get("qr_content") or "https://live.worldcubeassociation.org"
            qr_label = elem.get("qr_label")
            qr_label_pos = elem.get("qr_label_position", "top")
            draw_qr_code(c, qr_text, qr_label, qr_label_pos, pt_x, pt_y, pt_w, pt_h, opacity)
            c.restoreState()
            continue

        # Schedule Table
        if elem_type == "schedule":
            draw_schedule_table(c, elem.get("schedule_title"), pt_x, pt_y, pt_w, pt_h, opacity)
            c.restoreState()
            continue

        # Text Element (name, wca_id, competition_id, role)
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
            raw_idx = str(comp.get("registrant_id") or comp.get("csv_index", 1))
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

        text_y = pt_y + (pt_h / 2.0) - (font_size * 0.35)

        if align == "left":
            c.drawString(pt_x + pad_pt, text_y, text_content)
        elif align == "right":
            c.drawRightString(pt_x + pt_w - pad_pt, text_y, text_content)
        else:
            c.drawCentredString(pt_x + (pt_w / 2.0), text_y, text_content)

        c.restoreState()

    c.restoreState()

    # Draw dashed crop mark / border around badge if requested
    if crop_marks:
        c.saveState()
        c.setStrokeColor(HexColor("#94A3B8"))
        c.setLineWidth(0.5)
        c.setDash([2, 2])
        c.rect(origin_x, origin_y, badge_w_pt, badge_h_pt, fill=0, stroke=1)
        c.restoreState()


def render_badges_pdf(
    competitors: List[Dict[str, Any]],
    roles: Dict[str, Dict[str, Any]],
    template_dimensions: Dict[str, Any],
    sides_config: Dict[str, Any],
    side_to_export: str = "both",
    paper_size: str = "A4",
    parity: str = "front_even",
    crop_marks: bool = True,
) -> bytes:
    _ensure_fonts_registered()
    badge_w_mm = float(template_dimensions.get("width_mm", 100.0))
    badge_h_mm = float(template_dimensions.get("height_mm", 70.0))
    badge_w_pt = badge_w_mm * mm
    badge_h_pt = badge_h_mm * mm

    # Determine paper dimensions
    is_single = paper_size == "Single"
    if is_single:
        paper_w_mm = badge_w_mm
        paper_h_mm = badge_h_mm
        cols = 1
        rows = 1
        badges_per_sheet = 1
        margin_x_pt = 0.0
        margin_y_pt = 0.0
    else:
        paper_dims = PAPER_SIZES.get(paper_size, (210.0, 297.0))
        paper_w_mm, paper_h_mm = paper_dims

        # Calculate grid to minimize waste
        edge_margin_mm = 5.0
        avail_w_mm = max(10.0, paper_w_mm - 2 * edge_margin_mm)
        avail_h_mm = max(10.0, paper_h_mm - 2 * edge_margin_mm)

        cols = max(1, int(avail_w_mm // badge_w_mm))
        rows = max(1, int(avail_h_mm // badge_h_mm))
        badges_per_sheet = cols * rows

        total_grid_w_mm = cols * badge_w_mm
        total_grid_h_mm = rows * badge_h_mm
        margin_x_pt = ((paper_w_mm - total_grid_w_mm) / 2.0) * mm
        margin_y_pt = ((paper_h_mm - total_grid_h_mm) / 2.0) * mm

    sheet_w_pt = paper_w_mm * mm
    sheet_h_pt = paper_h_mm * mm

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(sheet_w_pt, sheet_h_pt))

    # Pre-cache background images
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
                        scale = max(badge_w_pt / img_w, badge_h_pt / img_h)
                        draw_w = img_w * scale
                        draw_h = img_h * scale
                        offset_x = (badge_w_pt - draw_w) / 2.0
                        offset_y = (badge_h_pt - draw_h) / 2.0
                        side_bg_draw_params[side_name] = {
                            "reader": img_reader,
                            "x": offset_x,
                            "y": offset_y,
                            "w": draw_w,
                            "h": draw_h,
                        }
            except Exception as e:
                logger.warning(f"Failed to pre-decode background image for side {side_name}: {e}")

    # Chunk competitors for sheet placement
    total_comps = len(competitors)
    chunk_size = badges_per_sheet

    for chunk_start in range(0, total_comps, chunk_size):
        chunk = competitors[chunk_start : chunk_start + chunk_size]

        def draw_sheet(target_side: str):
            # Page background
            c.saveState()
            c.setFillColor(HexColor("#FFFFFF"))
            c.rect(0, 0, sheet_w_pt, sheet_h_pt, fill=1, stroke=0)
            c.restoreState()

            side_def = sides_config.get(target_side, {})
            bg_params = side_bg_draw_params.get(target_side)

            for idx, comp in enumerate(chunk):
                col = idx % cols
                row = idx // cols

                # For back side in duplex, mirror column horizontally so long-edge flipping aligns perfectly!
                if target_side == "back" and not is_single:
                    col = cols - 1 - col

                origin_x = margin_x_pt + (col * badge_w_pt)
                # In ReportLab, y=0 is bottom; rows are indexed top-down
                origin_y = margin_y_pt + ((rows - 1 - row) * badge_h_pt)

                role_id = comp.get("role_id")
                role_data = roles.get(role_id, {}) if role_id else {}

                draw_single_badge(
                    c=c,
                    comp=comp,
                    role_data=role_data,
                    side_name=target_side,
                    side_def=side_def,
                    origin_x=origin_x,
                    origin_y=origin_y,
                    badge_w_pt=badge_w_pt,
                    badge_h_pt=badge_h_pt,
                    badge_h_mm=badge_h_mm,
                    bg_params=bg_params,
                    crop_marks=crop_marks and not is_single,
                )

        if side_to_export == "both":
            if parity == "front_even":
                # User requirement: Back side is odd pages (Page 1, 3, 5...), Front side is even pages (Page 2, 4, 6...)
                draw_sheet("back")
                c.showPage()
                draw_sheet("front")
                c.showPage()
            else:
                # Standard: Front side is odd pages, Back side is even pages
                draw_sheet("front")
                c.showPage()
                draw_sheet("back")
                c.showPage()
        elif side_to_export == "front":
            draw_sheet("front")
            c.showPage()
        elif side_to_export == "back":
            draw_sheet("back")
            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
