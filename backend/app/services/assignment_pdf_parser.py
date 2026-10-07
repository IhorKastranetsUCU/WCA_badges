import io
import re
import logging
from typing import Any, Dict, List, Optional
import pypdf

logger = logging.getLogger(__name__)

EVENT_NAME_MAP: Dict[str, str] = {
    "3x3x3 Cube": "333",
    "2x2x2 Cube": "222",
    "4x4x4 Cube": "444",
    "5x5x5 Cube": "555",
    "6x6x6 Cube": "666",
    "7x7x7 Cube": "777",
    "3x3x3 One-Handed": "333oh",
    "3x3x3 Blindfolded": "333bf",
    "3x3x3 Fewest Moves": "333fm",
    "3x3x3 Multi-Blind": "333mbf",
    "4x4x4 Blindfolded": "444bf",
    "5x5x5 Blindfolded": "555bf",
    "Clock": "clock",
    "Megaminx": "minx",
    "Pyraminx": "pyram",
    "Skewb": "skewb",
    "Square-1": "sq1",
}


def normalize_name(name: str) -> str:
    """Removes parenthesis, punctuation, and extra whitespace for fuzzy matching."""
    cleaned = re.sub(r"[\(\)\[\],]", " ", name or "")
    return " ".join(cleaned.lower().split())


def parse_competitor_cards_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Parses a Groupifier competitor cards PDF sheet (3 cols x 4 rows per A4 page).
    Extracts competitor cards with:
      - name (Latin and local if present)
      - registrant_id (ID: X)
      - wca_id (WCA ID: X, if returnee)
      - assignments: event_id -> { 'comp': [...], 'scr': [...], 'judge': [...], 'runner': [...] }
    """
    stream = io.BytesIO(pdf_bytes)
    reader = pypdf.PdfReader(stream)

    all_cards: List[Dict[str, Any]] = []
    assignments_by_reg_id: Dict[str, Dict[str, Any]] = {}
    assignments_by_wca_id: Dict[str, Dict[str, Any]] = {}
    assignments_by_name: Dict[str, Dict[str, Any]] = {}

    # Coordinate boundaries for standard 3x4 Groupifier grid (A4: 595.28 x 841.89 pt)
    x_bounds = [(0.0, 198.0), (198.0, 395.0), (395.0, 600.0)]
    y_bounds = [(644.0, 855.0), (451.0, 644.0), (256.5, 451.0), (40.0, 256.5)]

    for page_idx, page in enumerate(reader.pages):
        items: List[tuple[float, float, str]] = []

        def visitor(text: str, cm: Any, tm: Any, font_dict: Any, font_size: Any) -> None:
            t = text.strip()
            if t:
                items.append((float(tm[4]), float(tm[5]), t))

        try:
            page.extract_text(visitor_text=visitor)
        except Exception as e:
            logger.warning(f"Error extracting text with visitor on page {page_idx + 1}: {e}")
            continue

        for r_idx, (y_min, y_max) in enumerate(y_bounds):
            for c_idx, (x_min, x_max) in enumerate(x_bounds):
                card_items = [it for it in items if x_min <= it[0] < x_max and y_min <= it[1] < y_max]
                if not card_items:
                    continue

                # A valid card must contain an "ID:" field
                has_id = any("ID:" in it[2] for it in card_items)
                if not has_id:
                    continue

                # Group tokens into lines by Y position (tokens within 3.5pt belong to same line)
                y_sorted = sorted(card_items, key=lambda it: (-it[1], it[0]))
                lines: List[List[tuple[float, float, str]]] = []
                cur_line: List[tuple[float, float, str]] = []
                cur_y: Optional[float] = None

                for it in y_sorted:
                    if cur_y is None or abs(it[1] - cur_y) < 3.5:
                        cur_line.append(it)
                        cur_y = it[1]
                    else:
                        lines.append(sorted(cur_line, key=lambda x: x[0]))
                        cur_line = [it]
                        cur_y = it[1]
                if cur_line:
                    lines.append(sorted(cur_line, key=lambda x: x[0]))

                # Find line with ID:
                id_line_idx = -1
                for idx, line in enumerate(lines):
                    if any("ID:" in it[2] for it in line):
                        id_line_idx = idx
                        break

                if id_line_idx == -1:
                    continue

                # Name consists of lines preceding the ID line
                name_tokens: List[str] = []
                for l in lines[:id_line_idx]:
                    name_tokens.extend([it[2] for it in l])
                name_str = " ".join(name_tokens).strip()

                # Parse ID line
                id_line = lines[id_line_idx]
                id_str = " ".join(it[2] for it in id_line)

                reg_id_match = re.search(r"ID:\s*(\d+)", id_str)
                wca_id_match = re.search(r"WCA ID:\s*([A-Za-z0-9]+)", id_str)

                registrant_id = int(reg_id_match.group(1)) if reg_id_match else None
                wca_id = wca_id_match.group(1).upper() if wca_id_match else None

                # Locate column header line: contains "Event"
                col_headers: List[tuple[str, float]] = []
                header_line_idx = -1
                for l_i, line in enumerate(lines[id_line_idx + 1 :], start=id_line_idx + 1):
                    line_txt = " ".join(it[2] for it in line)
                    if "Event" in line_txt:
                        header_line_idx = l_i
                        for it in line:
                            txt = it[2].lower()
                            if "comp" in txt:
                                col_headers.append(("comp", it[0]))
                            elif "scr" in txt:
                                col_headers.append(("scr", it[0]))
                            elif "judge" in txt:
                                col_headers.append(("judge", it[0]))
                            elif "run" in txt:
                                col_headers.append(("runner", it[0]))
                        col_headers.sort(key=lambda ch: ch[1])
                        break

                assignments: Dict[str, Dict[str, List[str]]] = {}

                if header_line_idx != -1 and col_headers:
                    min_col_x = col_headers[0][1] - 15.0

                    for line in lines[header_line_idx + 1 :]:
                        line_text = " ".join(it[2] for it in line)
                        matched_ev_id: Optional[str] = None
                        for ev_str, ev_id in EVENT_NAME_MAP.items():
                            if line_text.startswith(ev_str) or line_text.startswith(
                                ev_str.replace("3x3x3 One-Handed", "3x3x3 One- Handed")
                            ):
                                matched_ev_id = ev_id
                                break
                        if not matched_ev_id:
                            continue

                        event_assigns: Dict[str, List[str]] = {
                            "comp": [],
                            "scr": [],
                            "judge": [],
                            "runner": [],
                        }

                        for it in line:
                            t_x = it[0]
                            token = it[2].strip()
                            if t_x < min_col_x:
                                # Left side is event name text
                                continue

                            clean_nums = [
                                n.strip()
                                for n in token.replace(",", " ").split()
                                if n.strip().isdigit()
                            ]
                            if not clean_nums:
                                continue

                            # Assign to column interval based on adjacent midpoints
                            target_role: Optional[str] = None
                            for idx, (role, c_x) in enumerate(col_headers):
                                l_bound = -9999.0 if idx == 0 else (col_headers[idx - 1][1] + c_x) / 2.0
                                r_bound = (
                                    9999.0
                                    if idx == len(col_headers) - 1
                                    else (c_x + col_headers[idx + 1][1]) / 2.0
                                )
                                if l_bound <= t_x < r_bound:
                                    target_role = role
                                    break

                            if target_role:
                                event_assigns[target_role].extend(clean_nums)

                        # Deduplicate while preserving numeric order
                        for k in event_assigns:
                            event_assigns[k] = sorted(
                                list(dict.fromkeys(event_assigns[k])),
                                key=lambda x: int(x) if x.isdigit() else x,
                            )

                        assignments[matched_ev_id] = event_assigns

                card_data = {
                    "name": name_str,
                    "registrant_id": registrant_id,
                    "wca_id": wca_id,
                    "assignments": assignments,
                }
                all_cards.append(card_data)

                if registrant_id is not None:
                    assignments_by_reg_id[str(registrant_id)] = assignments
                if wca_id:
                    assignments_by_wca_id[wca_id] = assignments
                if name_str:
                    assignments_by_name[normalize_name(name_str)] = assignments

    return {
        "total_cards": len(all_cards),
        "cards": all_cards,
        "assignments_by_reg_id": assignments_by_reg_id,
        "assignments_by_wca_id": assignments_by_wca_id,
        "assignments_by_name": assignments_by_name,
    }
