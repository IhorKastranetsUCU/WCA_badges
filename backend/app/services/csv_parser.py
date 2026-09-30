import csv
import io
import re
from typing import Any, Dict, List, Tuple


COUNTRY_ISO_MAP = {
    "ukraine": "UA",
    "united states": "US",
    "poland": "PL",
    "germany": "DE",
    "france": "FR",
    "united kingdom": "GB",
    "great britain": "GB",
    "canada": "CA",
    "spain": "ES",
    "italy": "IT",
    "japan": "JP",
    "korea": "KR",
    "china": "CN",
    "brazil": "BR",
    "australia": "AU",
    "netherlands": "NL",
    "sweden": "SE",
    "norway": "NO",
    "czech republic": "CZ",
    "czechia": "CZ",
    "slovakia": "SK",
    "hungary": "HU",
    "austria": "AT",
    "switzerland": "CH",
    "belgium": "BE",
    "denmark": "DK",
    "finland": "FI",
    "portugal": "PT",
    "ireland": "IE",
    "india": "IN",
}


def parse_wca_name(raw_name: str) -> Tuple[str, str | None]:
    cleaned = raw_name.strip()
    match = re.search(r"^(.*?)\s*\((.*?)\)$", cleaned)
    if match:
        latin = match.group(1).strip()
        local = match.group(2).strip()
        return latin, local
    return cleaned, None


def resolve_country_iso2(country_str: str) -> Tuple[str, str]:
    if not country_str:
        return ("UA", "Ukraine")
    normalized = country_str.strip()
    if len(normalized) == 2 and normalized.isalpha():
        return (normalized.upper(), normalized.upper())
    iso = COUNTRY_ISO_MAP.get(normalized.lower())
    if iso:
        return (iso, normalized)
    return (normalized[:2].upper(), normalized)


def parse_wca_csv(content_bytes: bytes) -> List[Dict[str, Any]]:
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1", errors="replace")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []

    header = [col.strip().lower() for col in rows[0]]
    col_map = {}
    status_indices = []
    for idx, col in enumerate(header):
        if "name" in col and "competitor" not in col_map:
            col_map["name"] = idx
        elif "wca id" in col or col == "wcaid" or "wca_id" in col:
            col_map["wca_id"] = idx
        elif "country" in col or "citizen" in col or "nationality" in col:
            col_map["country"] = idx
        elif "role" in col or "role(s)" in col:
            col_map["role"] = idx

        if "status" in col or "registration" in col or "competing" in col:
            status_indices.append(idx)

    if "name" not in col_map and len(header) >= 1:
        col_map["name"] = 0

    EXCLUDED_STATUSES = {
        "d", "del", "deleted", "rejected", "cancelled", "canceled",
        "withdrawn", "declined", "dropped", "false", "no", "0"
    }

    parsed_competitors = []
    seq_index = 1

    for row in rows[1:]:
        if not row or not any(row):
            continue

        raw_name = row[col_map["name"]].strip() if "name" in col_map and col_map["name"] < len(row) else ""
        if not raw_name:
            continue

        is_cancelled = False
        for s_idx in status_indices:
            if s_idx < len(row):
                st_val = row[s_idx].strip().lower()
                if st_val in EXCLUDED_STATUSES:
                    is_cancelled = True
                    break
        if is_cancelled:
            continue

        latin, local = parse_wca_name(raw_name)

        wca_id = None
        if "wca_id" in col_map and col_map["wca_id"] < len(row):
            val = row[col_map["wca_id"]].strip()
            if val and val.lower() != "null":
                wca_id = val

        country_name = "Ukraine"
        if "country" in col_map and col_map["country"] < len(row):
            country_name = row[col_map["country"]].strip() or "Ukraine"
        iso2, full_country = resolve_country_iso2(country_name)

        parsed_competitors.append({
            "csv_index": seq_index,
            "name_latin": latin,
            "name_local": local,
            "name_raw": raw_name,
            "wca_id": wca_id,
            "country_iso2": iso2,
            "country_name": full_country,
        })
        seq_index += 1

    return parsed_competitors
