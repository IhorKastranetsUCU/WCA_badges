import io
import os
import re
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
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Register Unicode TrueType fonts (Inter and DejaVuSans)
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
_FONTS_REGISTERED = False

PAPER_SIZES: Dict[str, Tuple[float, float]] = {
    "A4": (210.0, 297.0),
    "A5": (148.0, 210.0),
    "Letter": (215.9, 279.4),
    "Legal": (215.9, 355.6),
}

_AVATAR_CACHE: Dict[str, ImageReader] = {}


def _ensure_fonts_registered():
    global FONT_REGULAR, FONT_BOLD, _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return

    fonts_dir = os.path.join(os.path.dirname(__file__), "..", "fonts")

    # Register Inter fonts if present
    inter_reg = os.path.join(fonts_dir, "Inter-Regular.ttf")
    inter_bold = os.path.join(fonts_dir, "Inter-Bold.ttf")
    if os.path.exists(inter_reg):
        try:
            pdfmetrics.registerFont(TTFont("Inter", inter_reg))
            FONT_REGULAR = "Inter"
        except Exception as e:
            logger.warning(f"Could not register Inter: {e}")
    if os.path.exists(inter_bold):
        try:
            pdfmetrics.registerFont(TTFont("Inter-Bold", inter_bold))
            FONT_BOLD = "Inter-Bold"
        except Exception as e:
            logger.warning(f"Could not register Inter-Bold: {e}")

    # Register DejaVu fonts
    candidates_regular = [
        os.path.join(fonts_dir, "DejaVuSans.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    candidates_bold = [
        os.path.join(fonts_dir, "DejaVuSans-Bold.ttf"),
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
            if FONT_REGULAR == "Helvetica":
                FONT_REGULAR = "DejaVuSans"
        except Exception as e:
            logger.warning(f"Could not register DejaVuSans: {e}")

    if bold_path:
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold_path))
            if FONT_BOLD == "Helvetica-Bold":
                FONT_BOLD = "DejaVuSans-Bold"
        except Exception as e:
            logger.warning(f"Could not register DejaVuSans-Bold: {e}")

    try:
        if "Inter" in pdfmetrics.getRegisteredFontNames() and "Inter-Bold" in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="Inter-Bold")
    except Exception:
        pass

    try:
        if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() and "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFontFamily("DejaVuSans", normal="DejaVuSans", bold="DejaVuSans-Bold")
    except Exception:
        pass

    _FONTS_REGISTERED = True


def get_pdf_font(family: Optional[str] = None, is_bold: bool = False) -> str:
    _ensure_fonts_registered()
    fam = (family or "").lower()
    reg_fonts = pdfmetrics.getRegisteredFontNames()
    if "Inter" in reg_fonts and (not fam or "inter" in fam or fam in ["sans-serif", "system-ui", "arial", "helvetica", "roboto", "montserrat", "open sans"]):
        return "Inter-Bold" if is_bold else "Inter"
    if "DejaVuSans" in reg_fonts:
        return "DejaVuSans-Bold" if is_bold else "DejaVuSans"
    return "Helvetica-Bold" if is_bold else "Helvetica"


def hex_to_color(hex_str: str, default: str = "#000000") -> HexColor:
    try:
        if not hex_str or not hex_str.startswith("#"):
            return HexColor(default)
        return HexColor(hex_str)
    except Exception:
        return HexColor(default)


def draw_flag_image_or_vector(
    c: canvas.Canvas,
    iso2: str,
    x: float,
    y: float,
    w: float,
    h: float,
    opacity: float = 1.0,
):
    c.saveState()
    c.setFillAlpha(opacity)
    iso = (iso2 or "UA").strip().lower()

    # 1. Try local bundled PNG flag
    flags_dir = os.path.join(os.path.dirname(__file__), "..", "flags")
    flag_path = os.path.join(flags_dir, f"{iso}.png")

    if os.path.exists(flag_path):
        try:
            flag_reader = ImageReader(flag_path)
            c.drawImage(flag_reader, x, y, width=w, height=h, mask="auto")
            c.restoreState()
            return
        except Exception as e:
            logger.warning(f"Could not load flag image for {iso}: {e}")

    # Fallback to vector/colored flag
    iso_up = iso.upper()
    if iso_up == "UA":
        half_h = h / 2.0
        c.setFillColor(HexColor("#0057B7"))
        c.rect(x, y + half_h, w, half_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFDD00"))
        c.rect(x, y, w, half_h, fill=1, stroke=0)
    elif iso_up == "PL":
        half_h = h / 2.0
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(x, y + half_h, w, half_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#DC143C"))
        c.rect(x, y, w, half_h, fill=1, stroke=0)
    else:
        c.setFillColor(HexColor("#3B82F6"))
        c.rect(x, y, w, h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont(get_pdf_font(None, True), min(8, h * 0.6))
        c.drawCentredString(x + w / 2.0, y + (h / 2.0) - 2.5, iso_up[:2])

    c.restoreState()


draw_flag_vector = draw_flag_image_or_vector


def get_optimized_avatar(avatar_url: str, target_w_mm: float, target_h_mm: float) -> Optional[ImageReader]:
    """
    Downsamples avatar to target print dimensions at ~300 DPI,
    center-crops/fits preserving exact aspect ratio without stretching (object-fit: cover),
    and compresses to lightweight JPEG.
    """
    if not avatar_url:
        return None

    cache_key = f"{avatar_url}_{round(target_w_mm, 1)}_{round(target_h_mm, 1)}"
    if cache_key in _AVATAR_CACHE:
        return _AVATAR_CACHE[cache_key]

    try:
        if avatar_url.startswith("data:image"):
            _, b64 = avatar_url.split(",", 1)
            raw_bytes = base64.b64decode(b64)
            img = Image.open(io.BytesIO(raw_bytes))
        elif avatar_url.startswith("http://") or avatar_url.startswith("https://"):
            import urllib.request
            req = urllib.request.Request(avatar_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                img = Image.open(io.BytesIO(resp.read()))
        elif os.path.exists(avatar_url):
            img = Image.open(avatar_url)
        else:
            return None

        # Auto-orient based on EXIF tag
        img = ImageOps.exif_transpose(img)

        # Convert to RGB (for JPEG compression)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Compute 300 DPI target resolution in pixels
        target_px_w = max(32, int(round(target_w_mm / 25.4 * 300)))
        target_px_h = max(32, int(round(target_h_mm / 25.4 * 300)))

        # Center-crop & fit to preserve aspect ratio (object-fit: cover)
        fitted_img = ImageOps.fit(
            img,
            (target_px_w, target_px_h),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )

        # Compress to high-quality lightweight JPEG buffer
        buf = io.BytesIO()
        fitted_img.save(buf, format="JPEG", quality=82, optimize=True)
        buf.seek(0)

        reader = ImageReader(buf)
        _AVATAR_CACHE[cache_key] = reader
        return reader
    except Exception as e:
        logger.warning(f"Error optimizing avatar: {e}")
        return None


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
        c.setFont(get_pdf_font(None, True), 7)
        c.setFillColor(HexColor("#0F172A"))
        if label_pos == "bottom":
            c.drawCentredString(x + w / 2.0, y + 2, label.upper())
        else:
            c.drawCentredString(x + w / 2.0, y + h - 8, label.upper())

    c.restoreState()


def resolve_competitor_task(entry: Dict[str, Any], comp: Optional[Dict[str, Any]]) -> str:
    if not comp or entry.get("isBreak"):
        return ""
    assignments = comp.get("assignments")
    if not assignments or not isinstance(assignments, dict):
        return ""

    code = str(entry.get("code") or "").lower()
    event_name = str(entry.get("event") or "").lower()

    event_id = None
    if "333oh" in code or "one-handed" in event_name or "3x3 oh" in event_name:
        event_id = "333oh"
    elif "333bf" in code or "3x3 bf" in event_name or "blindfolded" in event_name:
        event_id = "333bf"
    elif "333fm" in code or "fewest moves" in event_name or "3x3 fm" in event_name:
        event_id = "333fm"
    elif "333mbf" in code or "multi-blind" in event_name or "3x3 mbf" in event_name:
        event_id = "333mbf"
    elif "333" in code or "3x3x3" in event_name or "3x3" in event_name:
        event_id = "333"
    elif "222" in code or "2x2x2" in event_name or "2x2" in event_name:
        event_id = "222"
    elif "444" in code or "4x4x4" in event_name or "4x4" in event_name:
        event_id = "444"
    elif "555" in code or "5x5x5" in event_name or "5x5" in event_name:
        event_id = "555"
    elif "666" in code or "6x6x6" in event_name or "6x6" in event_name:
        event_id = "666"
    elif "777" in code or "7x7x7" in event_name or "7x7" in event_name:
        event_id = "777"
    elif "clock" in code or "clock" in event_name:
        event_id = "clock"
    elif "minx" in code or "megaminx" in event_name or "mega" in event_name:
        event_id = "minx"
    elif "pyram" in code or "pyraminx" in event_name or "pyra" in event_name:
        event_id = "pyram"
    elif "skewb" in code or "skewb" in event_name:
        event_id = "skewb"
    elif "sq1" in code or "square-1" in event_name or "sq-1" in event_name:
        event_id = "sq1"

    if not event_id or event_id not in assignments:
        return ""

    ev_assign = assignments[event_id]
    comp_groups = [str(g) for g in ev_assign.get("comp", [])]
    scr_groups = [str(g) for g in ev_assign.get("scr", [])]
    judge_groups = [str(g) for g in ev_assign.get("judge", [])]
    runner_groups = [str(g) for g in ev_assign.get("runner", [])]

    g_match = re.search(r"-g(\d+)", code) or re.search(
        r"(?:^|\s|-|G)(?:roup\s*|G)(\d+)(?:\s|$|-)", event_name, re.IGNORECASE
    )
    if g_match:
        g_num = str(g_match.group(1))
        if g_num in comp_groups:
            return "C"
        if g_num in scr_groups:
            return "S"
        if g_num in judge_groups:
            return "J"
        if g_num in runner_groups:
            return "R"
        return ""

    if comp_groups:
        return "C"
    if scr_groups:
        return "S"
    if judge_groups:
        return "J"
    if runner_groups:
        return "R"

    return ""


def draw_schedule_table(
    c: canvas.Canvas,
    title: Optional[str],
    x: float,
    y: float,
    w: float,
    h: float,
    opacity: float = 1.0,
    schedule_data: Optional[Dict[str, Any]] = None,
    competitor: Optional[Dict[str, Any]] = None,
):
    c.saveState()
    c.setFillAlpha(opacity)

    # Schedule box background & border
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.5)
    c.rect(x, y, w, h, fill=1, stroke=1)

    # Use real schedule days if provided
    days = (schedule_data or {}).get("days", [])
    if not days:
        # High quality default WCA schedule
        days = [
            {
                "dayName": "Friday",
                "entries": [
                    {"time": "08:30", "event": "Check-in", "task": "", "roomColor": "#C2F5D5", "isBreak": True},
                    {"time": "09:00", "event": "6x6x6 R1", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "10:00", "event": "7x7x7 R1", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "11:00", "event": "3x3 MBF", "task": "C", "roomColor": "#FB9DB0"},
                    {"time": "12:30", "event": "LUNCH", "task": "", "roomColor": "#E2E8F0", "isBreak": True},
                    {"time": "13:30", "event": "3x3 FM", "task": "C", "roomColor": "#FB9DB0"},
                    {"time": "15:00", "event": "Clock R1", "task": "J", "roomColor": "#C2F5D5"},
                    {"time": "16:30", "event": "Megaminx", "task": "C", "roomColor": "#C2F5D5"},
                ]
            },
            {
                "dayName": "Saturday",
                "entries": [
                    {"time": "08:30", "event": "Check-in", "task": "", "roomColor": "#C2F5D5", "isBreak": True},
                    {"time": "09:00", "event": "Opening", "task": "", "roomColor": "#C2F5D5", "isBreak": True},
                    {"time": "09:30", "event": "5x5x5 R1", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "11:00", "event": "Pyraminx", "task": "J", "roomColor": "#C2F5D5"},
                    {"time": "12:30", "event": "LUNCH", "task": "", "roomColor": "#E2E8F0", "isBreak": True},
                    {"time": "13:30", "event": "2x2x2 R1", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "15:00", "event": "3x3x3 R1", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "17:30", "event": "Skewb R1", "task": "S", "roomColor": "#C2F5D5"},
                ]
            },
            {
                "dayName": "Sunday",
                "entries": [
                    {"time": "09:00", "event": "4x4x4 R2", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "10:30", "event": "3x3x3 R2", "task": "C", "roomColor": "#C2F5D5"},
                    {"time": "12:00", "event": "Pyra Final", "task": "QR", "roomColor": "#C2F5D5"},
                    {"time": "12:45", "event": "LUNCH", "task": "", "roomColor": "#E2E8F0", "isBreak": True},
                    {"time": "13:45", "event": "2x2x2 Final", "task": "QR", "roomColor": "#C2F5D5"},
                    {"time": "14:45", "event": "3x3 BF Final", "task": "QR", "roomColor": "#FB9DB0"},
                    {"time": "15:45", "event": "3x3x3 Final", "task": "QR", "roomColor": "#C2F5D5"},
                    {"time": "17:15", "event": "AWARDS", "task": "", "roomColor": "#FEF3C7", "isBreak": True},
                ]
            }
        ]

    num_cols = max(1, min(len(days), 4))
    col_w = w / float(num_cols)
    header_h = min(11.0, h * 0.14)

    for i, day in enumerate(days[:num_cols]):
        col_x = x + i * col_w
        day_name = str(day.get("dayName") or f"Day {i+1}").upper()

        # Day column header
        c.setFillColor(HexColor("#334155"))
        c.rect(col_x, y + h - header_h, col_w, header_h, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont(get_pdf_font(None, True), 6)
        c.drawCentredString(col_x + col_w / 2.0, y + h - header_h + 3, day_name[:4])

        # Column divider
        if i > 0:
            c.setStrokeColor(HexColor("#E2E8F0"))
            c.setLineWidth(0.5)
            c.line(col_x, y, col_x, y + h - header_h)

        entries = day.get("entries", [])
        row_count = min(len(entries), 18)
        if row_count == 0:
            continue
        row_h = (h - header_h) / float(row_count)

        for r_idx, entry in enumerate(entries[:row_count]):
            r_y = y + h - header_h - (r_idx + 1) * row_h
            t_time = str(entry.get("time", ""))
            t_ev = str(entry.get("event", ""))
            t_task = str(entry.get("task", ""))
            if competitor and competitor.get("assignments"):
                t_task = resolve_competitor_task(entry, competitor)
            is_break = entry.get("isBreak", False)
            room_color = entry.get("roomColor")

            # Room color tint or background
            if room_color:
                c.saveState()
                c.setFillColor(hex_to_color(room_color))
                c.setFillAlpha(0.25)
                c.rect(col_x + 0.5, r_y + 0.5, col_w - 1.0, row_h - 1.0, fill=1, stroke=0)
                c.restoreState()

            if is_break:
                c.setFont(get_pdf_font(None, True), 4.5)
                c.setFillColor(HexColor("#475569"))
                c.drawCentredString(col_x + col_w / 2.0, r_y + (row_h / 2.0) - 1.5, t_ev.upper()[:16])
            else:
                c.setFont(get_pdf_font(None, False), 4.5)
                c.setFillColor(HexColor("#64748B"))
                c.drawString(col_x + 1.2, r_y + (row_h / 2.0) - 1.5, t_time)

                c.setFont(get_pdf_font(None, True), 4.5)
                c.setFillColor(HexColor("#1E293B"))
                c.drawString(col_x + col_w * 0.35, r_y + (row_h / 2.0) - 1.5, t_ev[:12])

                if t_task == "C":
                    c.setFillColor(HexColor("#FFE4E6"))
                    c.roundRect(col_x + col_w - 7.5, r_y + 1, 6.5, row_h - 2, 0.8, fill=1, stroke=0)
                    c.setFillColor(HexColor("#9F1239"))
                    c.setFont(get_pdf_font(None, True), 4)
                    c.drawCentredString(col_x + col_w - 4.2, r_y + (row_h / 2.0) - 1.4, "C")
                elif t_task == "J":
                    c.setFillColor(HexColor("#DBEAFE"))
                    c.roundRect(col_x + col_w - 7.5, r_y + 1, 6.5, row_h - 2, 0.8, fill=1, stroke=0)
                    c.setFillColor(HexColor("#1E40AF"))
                    c.setFont(get_pdf_font(None, True), 4)
                    c.drawCentredString(col_x + col_w - 4.2, r_y + (row_h / 2.0) - 1.4, "J")
                elif t_task:
                    c.setFillColor(HexColor("#F1F5F9"))
                    c.roundRect(col_x + col_w - 9.0, r_y + 1, 8.0, row_h - 2, 0.8, fill=1, stroke=0)
                    c.setFillColor(HexColor("#475569"))
                    c.setFont(get_pdf_font(None, True), 3.8)
                    c.drawCentredString(col_x + col_w - 5.0, r_y + (row_h / 2.0) - 1.4, t_task[:3])

    c.restoreState()


def draw_badge_contents(
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
    schedule_data: Optional[Dict[str, Any]] = None,
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

        # Handle element rotation
        rot_deg = float(pos.get("rotation_deg", 0.0) or 0.0)
        if rot_deg != 0.0:
            cx = pt_x + (pt_w / 2.0)
            cy = pt_y + (pt_h / 2.0)
            c.translate(cx, cy)
            c.rotate(-rot_deg)
            c.translate(-cx, -cy)

        # Role styling or element background
        if elem_type == "role":
            bg_hex = role_style.get("background_color", "#2563EB")
            c.setFillColor(hex_to_color(bg_hex, "#2563EB"))
            radius_mm = float(role_style.get("border_radius", 4.0))
            radius_pt = min(radius_mm * mm, min(pt_w, pt_h) / 2.0)
            if radius_pt > 0:
                c.roundRect(pt_x, pt_y, pt_w, pt_h, radius_pt, fill=1, stroke=0)
            else:
                c.rect(pt_x, pt_y, pt_w, pt_h, fill=1, stroke=0)
        elif style.get("has_background", False):
            bg_color = hex_to_color(style.get("background_color", "#FFFFFF"))
            c.setFillColor(bg_color)
            border_w = float(style.get("border_width", 0.0))
            radius_mm = float(style.get("border_radius", 0.0))
            radius_pt = min(radius_mm * mm, min(pt_w, pt_h) / 2.0)
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
            draw_flag_image_or_vector(c, comp.get("country_iso2", "UA"), pt_x, pt_y, pt_w, pt_h, opacity)
            c.restoreState()
            continue

        # Avatar / Photo (Preserve proportion with object-fit: cover & compress to ~300 DPI JPEG)
        if elem_type == "avatar":
            avatar_url = comp.get("avatar_url")
            if not avatar_url:
                c.restoreState()
                continue

            av_reader = get_optimized_avatar(avatar_url, w_mm, h_mm)
            if not av_reader:
                c.restoreState()
                continue

            rad_mm = elem.get("border_radius_mm", 4.0)
            rad_pt = rad_mm * mm
            if rad_pt > 0:
                path = c.beginPath()
                path.roundRect(pt_x, pt_y, pt_w, pt_h, min(rad_pt, min(pt_w, pt_h) / 2.0))
                c.clipPath(path, stroke=0)

            c.drawImage(av_reader, pt_x, pt_y, width=pt_w, height=pt_h, mask="auto")
            c.restoreState()
            continue

        # QR Code (Multiple QR codes supported)
        if elem_type == "qr_code":
            qr_text = elem.get("qr_content")
            if not qr_text:
                wca_id = comp.get("wca_id")
                if wca_id:
                    qr_text = f"https://www.worldcubeassociation.org/persons/{wca_id}"
                else:
                    qr_text = "https://live.worldcubeassociation.org"
            qr_label = elem.get("qr_label")
            qr_label_pos = elem.get("qr_label_position", "top")
            draw_qr_code(c, qr_text, qr_label, qr_label_pos, pt_x, pt_y, pt_w, pt_h, opacity)
            c.restoreState()
            continue

        # Schedule Table
        if elem_type == "schedule":
            draw_schedule_table(
                c,
                elem.get("schedule_title"),
                pt_x,
                pt_y,
                pt_w,
                pt_h,
                opacity,
                schedule_data=schedule_data or elem.get("schedule_data") or comp.get("schedule_data"),
                competitor=comp,
            )
            c.restoreState()
            continue

        # Text Element (name, wca_id, competition_id, role)
        text_content = ""
        font_weight = "600"
        font_size = 14.0
        text_color = HexColor("#111827")
        align = "center"
        font_family = style.get("font_family")

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
            raw_id = comp.get("wca_id")
            if not raw_id or not str(raw_id).strip():
                # User requirement: If no WCA ID, do not write "Newcomer", leave empty
                c.restoreState()
                continue

            raw_id = str(raw_id).strip()
            fmt = elem.get("format_mode", "prefix_label")
            if fmt == "prefix_label":
                prefix = elem.get("format_prefix", "WCA ID: ")
                text_content = f"{prefix}{raw_id}"
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
            font_family = role_style.get("font_family")

        if style.get("uppercase", False):
            text_content = text_content.upper()

        is_bold = str(font_weight) in ["700", "800", "bold"]
        font_name = get_pdf_font(font_family, is_bold)

        c.setFont(font_name, font_size)
        c.setFillColor(text_color)

        # Character/letter spacing
        char_space_mm = float(style.get("letter_spacing_mm", 0.0) or 0.0)
        char_space_pt = char_space_mm * mm
        if char_space_pt > 0:
            c._charSpace = char_space_pt

        pad_pt = (float(style.get("padding_mm", 0.0)) or 1.5) * mm
        max_w = pt_w - (2 * pad_pt)

        # Correct string width measurement taking _charSpace into account
        base_w = c.stringWidth(text_content, font_name, font_size)
        total_w = base_w + (max(0, len(text_content) - 1) * char_space_pt if char_space_pt > 0 else 0)

        if total_w > max_w and max_w > 0:
            scale_ratio = max_w / total_w
            font_size = max(5.0, font_size * scale_ratio)
            c.setFont(font_name, font_size)
            if char_space_pt > 0:
                char_space_pt = char_space_pt * scale_ratio
                c._charSpace = char_space_pt
            base_w = c.stringWidth(text_content, font_name, font_size)
            total_w = base_w + (max(0, len(text_content) - 1) * char_space_pt if char_space_pt > 0 else 0)

        # Accurate optical baseline alignment (0.35 * font_size below center)
        mid_y = pt_y + (pt_h / 2.0)
        text_y = mid_y - (font_size * 0.35)

        if align == "left":
            c.drawString(pt_x + pad_pt, text_y, text_content)
        elif align == "right":
            c.drawString(pt_x + pt_w - pad_pt - total_w, text_y, text_content)
        else:
            # Perfectly centered
            c.drawString(pt_x + (pt_w - total_w) / 2.0, text_y, text_content)

        c.restoreState()

    c.restoreState()


def draw_single_badge(
    c: canvas.Canvas,
    comp: Dict[str, Any],
    role_data: Dict[str, Any],
    side_name: str,
    side_def: Dict[str, Any],
    origin_x: float,
    origin_y: float,
    cell_w_pt: float,
    cell_h_pt: float,
    badge_w_pt: float,
    badge_h_pt: float,
    badge_h_mm: float,
    bg_params: Optional[Dict[str, Any]],
    rotate_badge_deg: float = 0.0,
    crop_marks: bool = True,
    schedule_data: Optional[Dict[str, Any]] = None,
):
    c.saveState()

    # Clip to cell boundary
    clip_p = c.beginPath()
    clip_p.rect(origin_x, origin_y, cell_w_pt, cell_h_pt)
    c.clipPath(clip_p, stroke=0)

    # Base white fill of cell
    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(origin_x, origin_y, cell_w_pt, cell_h_pt, fill=1, stroke=0)

    # Apply rotation around center of cell if rotated
    if rotate_badge_deg != 0.0:
        cx = origin_x + (cell_w_pt / 2.0)
        cy = origin_y + (cell_h_pt / 2.0)
        c.translate(cx, cy)
        c.rotate(rotate_badge_deg)
        c.translate(-badge_w_pt / 2.0, -badge_h_pt / 2.0)
        badge_origin_x = 0.0
        badge_origin_y = 0.0
    else:
        badge_origin_x = origin_x + (cell_w_pt - badge_w_pt) / 2.0
        badge_origin_y = origin_y + (cell_h_pt - badge_h_pt) / 2.0

    draw_badge_contents(
        c=c,
        comp=comp,
        role_data=role_data,
        side_name=side_name,
        side_def=side_def,
        origin_x=badge_origin_x,
        origin_y=badge_origin_y,
        badge_w_pt=badge_w_pt,
        badge_h_pt=badge_h_pt,
        badge_h_mm=badge_h_mm,
        bg_params=bg_params,
        schedule_data=schedule_data,
    )

    c.restoreState()

    # Draw dashed crop mark / border around cell
    if crop_marks:
        c.saveState()
        c.setStrokeColor(HexColor("#94A3B8"))
        c.setLineWidth(0.5)
        c.setDash([2, 2])
        c.rect(origin_x, origin_y, cell_w_pt, cell_h_pt, fill=0, stroke=1)
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
    schedule_data: Optional[Dict[str, Any]] = None,
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
        cell_w_pt = badge_w_pt
        cell_h_pt = badge_h_pt
        should_rotate = False
    else:
        paper_dims = PAPER_SIZES.get(paper_size, (210.0, 297.0))
        paper_w_mm, paper_h_mm = paper_dims

        # Evaluate 0° orientation (Tolerance 1mm for clean A6 105x148 fitting on A4 210x297)
        cols_0 = max(1, int((paper_w_mm + 1.0) // badge_w_mm))
        rows_0 = max(1, int((paper_h_mm + 1.0) // badge_h_mm))
        count_0 = cols_0 * rows_0

        # Evaluate 90° rotated orientation
        cols_90 = max(1, int((paper_w_mm + 1.0) // badge_h_mm))
        rows_90 = max(1, int((paper_h_mm + 1.0) // badge_w_mm))
        count_90 = cols_90 * rows_90

        # Choose packing orientation to maximize badges per sheet (e.g. 2 rotated on A5 vs 1)
        should_rotate = count_90 > count_0

        if should_rotate:
            cols = cols_90
            rows = rows_90
            cell_w_mm = badge_h_mm
            cell_h_mm = badge_w_mm
        else:
            cols = cols_0
            rows = rows_0
            cell_w_mm = badge_w_mm
            cell_h_mm = badge_h_mm

        badges_per_sheet = cols * rows
        cell_w_pt = cell_w_mm * mm
        cell_h_pt = cell_h_mm * mm

        total_grid_w_mm = cols * cell_w_mm
        total_grid_h_mm = rows * cell_h_mm
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
            c.saveState()
            c.setFillColor(HexColor("#FFFFFF"))
            c.rect(0, 0, sheet_w_pt, sheet_h_pt, fill=1, stroke=0)
            c.restoreState()

            side_def = sides_config.get(target_side, {})
            bg_params = side_bg_draw_params.get(target_side)

            for idx, comp in enumerate(chunk):
                col = idx % cols
                row = idx // cols

                # Duplex horizontal column mirroring for back side
                if target_side == "back" and not is_single:
                    col = cols - 1 - col

                origin_x = margin_x_pt + (col * cell_w_pt)
                origin_y = margin_y_pt + ((rows - 1 - row) * cell_h_pt)

                role_id = comp.get("role_id")
                role_data = roles.get(role_id, {}) if role_id else {}

                # Rotation angle for badge within cell:
                # If packing rotated by 90°:
                # Front side is rotated +90°
                # Back side is rotated -90° (270°) so flipped horizontally on long edge, top & bottom align identically!
                if should_rotate and not is_single:
                    rotate_deg = 90.0 if target_side == "front" else -90.0
                else:
                    rotate_deg = 0.0

                draw_single_badge(
                    c=c,
                    comp=comp,
                    role_data=role_data,
                    side_name=target_side,
                    side_def=side_def,
                    origin_x=origin_x,
                    origin_y=origin_y,
                    cell_w_pt=cell_w_pt,
                    cell_h_pt=cell_h_pt,
                    badge_w_pt=badge_w_pt,
                    badge_h_pt=badge_h_pt,
                    badge_h_mm=badge_h_mm,
                    bg_params=bg_params,
                    rotate_badge_deg=rotate_deg,
                    crop_marks=crop_marks and not is_single,
                    schedule_data=schedule_data or comp.get("schedule_data"),
                )

        if side_to_export == "both":
            if parity == "front_even":
                # Back side is odd pages (1, 3, 5...), Front side is even pages (2, 4, 6...)
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
