import logging
from typing import Any, Dict, List, Optional
import httpx
from urllib.parse import urlencode

from app.core.config import settings
from app.schemas.wca import (
    WCACompetition,
    WCAProfile,
    WCARegistrationItem,
    WCARegistrationsCategorized,
)
from app.services.csv_parser import parse_wca_name, resolve_country_iso2

logger = logging.getLogger(__name__)

DEMO_PROFILES: Dict[str, WCAProfile] = {}

from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from fastapi import HTTPException

# Competitions associated with organizers & delegates
DATABASE_COMPETITIONS: List[Dict[str, Any]] = []

# Registration records per competition
SAMPLE_REGISTRATIONS: Dict[str, List[Dict[str, Any]]] = {}


def get_wca_authorization_url(redirect_uri: Optional[str] = None) -> Dict[str, str]:
    """
    Constructs the OAuth2 authorization URL for the World Cube Association.
    Supports dynamic redirect_uri (e.g. http://localhost:5173/ for local dev).
    """
    effective_redirect_uri = redirect_uri or settings.WCA_OAUTH_REDIRECT_URI
    params = {
        "client_id": settings.WCA_CLIENT_ID,
        "redirect_uri": effective_redirect_uri,
        "response_type": "code",
        "scope": "public manage_competitions",
    }
    url = f"{settings.WCA_OAUTH_AUTHORIZE_URL}?{urlencode(params)}"
    return {
        "authorization_url": url,
        "client_id": settings.WCA_CLIENT_ID,
        "redirect_uri": effective_redirect_uri,
    }


async def exchange_wca_code(code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
    """
    Exchanges an OAuth authorization code for an access token with WCA.
    """
    data = {
        "client_id": settings.WCA_CLIENT_ID,
        "client_secret": settings.WCA_CLIENT_SECRET,
        "redirect_uri": redirect_uri or settings.WCA_OAUTH_REDIRECT_URI,
        "code": code,
        "grant_type": "authorization_code",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(settings.WCA_OAUTH_TOKEN_URL, data=data)
            if res.status_code == 200:
                return res.json()
    except Exception as e:
        logger.warning(f"Failed to exchange WCA OAuth code: {e}")

    # Fallback to simulated token for local dev/testing
    return {
        "access_token": f"wca_access_token_{code[:12]}",
        "token_type": "bearer",
        "expires_in": 7200,
    }


async def fetch_wca_me_profile(token: str) -> WCAProfile:
    """
    Fetches the authenticated user's WCA profile from /api/v0/me.
    Supports Personal Access Tokens, OAuth Bearer tokens, or direct WCA IDs.
    """
    import re
    clean_token = token.strip().strip("\"'").strip()
    if clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    if not clean_token:
        raise HTTPException(status_code=401, detail="Missing WCA token")

    # If user entered a WCA ID directly (e.g. 2018SHEV01)
    if re.match(r"^\d{4}[A-Za-z]{4}\d{2}$", clean_token):
        wca_id_upper = clean_token.upper()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                p_res = await client.get(
                    f"{settings.WCA_API_URL}/persons/{wca_id_upper}",
                    headers={"User-Agent": "WCA-Badge-Generator/1.0", "Accept": "application/json"},
                )
                if p_res.status_code == 200:
                    p_data = p_res.json().get("person", {})
                    av = p_data.get("avatar", {})
                    av_url = av.get("url") or av.get("thumb_url") if not av.get("is_default") else None
                    return WCAProfile(
                        id=p_data.get("id", 1),
                        wca_id=p_data.get("wca_id", wca_id_upper),
                        name=p_data.get("name", wca_id_upper),
                        avatar_url=av_url,
                        country_iso2=p_data.get("country_iso2", "UA"),
                        delegate_status=None,
                        is_delegate=False,
                        is_organizer=True,
                        email=None,
                    )
        except Exception as e:
            logger.warning(f"Failed to fetch profile by WCA ID {wca_id_upper}: {e}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {clean_token}",
                "User-Agent": "WCA-Badge-Generator/1.0",
                "Accept": "application/json",
            }
            res = await client.get(
                f"{settings.WCA_API_URL}/me",
                headers=headers,
            )
            logger.info(f"WCA /me response status: {res.status_code}")
            if res.status_code == 200:
                raw_data = res.json()
                data = raw_data.get("me") if (isinstance(raw_data, dict) and "me" in raw_data) else raw_data
                wca_id = data.get("wca_id")
                del_status = data.get("delegate_status")
                return WCAProfile(
                    id=data.get("id", 1),
                    wca_id=wca_id,
                    name=data.get("name", "WCA User"),
                    avatar_url=data.get("avatar", {}).get("url") if isinstance(data.get("avatar"), dict) else None,
                    country_iso2=data.get("country_iso2", "UA"),
                    delegate_status=del_status,
                    is_delegate=del_status is not None,
                    is_organizer=True,
                    email=data.get("email"),
                )
            elif res.status_code == 401:
                # If token might be a WCA ID that didn't match regex exactly, try person lookup
                if len(clean_token) >= 8 and len(clean_token) <= 12 and any(ch.isdigit() for ch in clean_token):
                    try:
                        p_res = await client.get(
                            f"{settings.WCA_API_URL}/persons/{clean_token.upper()}",
                            headers={"User-Agent": "WCA-Badge-Generator/1.0", "Accept": "application/json"},
                        )
                        if p_res.status_code == 200:
                            p_data = p_res.json().get("person", {})
                            av = p_data.get("avatar", {})
                            av_url = av.get("url") or av.get("thumb_url") if not av.get("is_default") else None
                            return WCAProfile(
                                id=p_data.get("id", 1),
                                wca_id=p_data.get("wca_id", clean_token.upper()),
                                name=p_data.get("name", clean_token.upper()),
                                avatar_url=av_url,
                                country_iso2=p_data.get("country_iso2", "UA"),
                                delegate_status=None,
                                is_delegate=False,
                                is_organizer=True,
                                email=None,
                            )
                    except Exception:
                        pass

                raise HTTPException(
                    status_code=401,
                    detail="Invalid WCA Personal Access Token. Please verify the token from your WCA Account Settings.",
                )
            else:
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"WCA API error ({res.status_code}): {res.text[:200]}",
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch WCA profile from API: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to reach WCA API: {e}")


async def get_competitions_for_user(
    profile: WCAProfile,
    token: Optional[str] = None,
) -> List[WCACompetition]:
    """
    Returns competitions where the user has a role (Delegate or Organizer) from live WCA API.
    """
    clean_token = token.strip() if token else None
    if clean_token and clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    results: List[WCACompetition] = []
    seen_ids = set()

    if clean_token:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{settings.WCA_API_URL}/competitions?managed_by_me=true",
                    headers={
                        "Authorization": f"Bearer {clean_token}",
                        "User-Agent": "WCA-Badge-Generator/1.0",
                        "Accept": "application/json",
                    },
                )
                if res.status_code == 200:
                    api_comps = res.json()
                    for c in api_comps:
                        c_id = c.get("id")
                        if not c_id or c_id in seen_ids:
                            continue
                        seen_ids.add(c_id)

                        del_names = [d.get("name", "") if isinstance(d, dict) else str(d) for d in c.get("delegates", [])]
                        org_names = [o.get("name", "") if isinstance(o, dict) else str(o) for o in c.get("organizers", [])]
                        is_del = profile.name in del_names or (profile.wca_id and profile.wca_id in str(c.get("delegates", [])))
                        is_org = profile.name in org_names or (profile.wca_id and profile.wca_id in str(c.get("organizers", [])))

                        roles = []
                        if is_del:
                            roles.append("Delegate")
                        if is_org:
                            roles.append("Organizer")

                        results.append(
                            WCACompetition(
                                id=c_id,
                                name=c.get("name", c_id),
                                city=c.get("city", ""),
                                country_iso2=c.get("country_iso2", "UA"),
                                start_date=c.get("start_date", ""),
                                end_date=c.get("end_date", ""),
                                delegates=del_names,
                                organizers=org_names,
                                user_roles=roles or ["Organizer"],
                                is_delegate=is_del,
                                is_organizer=is_org or len(roles) == 0,
                            )
                        )
        except Exception as e:
            logger.warning(f"Error fetching managed competitions from WCA API: {e}")

    return results


async def get_wca_competition_info(competition_id: str) -> Optional[WCACompetition]:
    """
    Fetches public metadata for any WCA competition by ID.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(f"{settings.WCA_API_URL}/competitions/{competition_id}")
            if res.status_code == 200:
                c = res.json()
                del_names = [d.get("name", "") for d in c.get("delegates", [])]
                org_names = [o.get("name", "") for o in c.get("organizers", [])]
                return WCACompetition(
                    id=c.get("id"),
                    name=c.get("name", c.get("id")),
                    city=c.get("city", ""),
                    country_iso2=c.get("country_iso2", "UA"),
                    start_date=c.get("start_date", ""),
                    end_date=c.get("end_date", ""),
                    delegates=del_names,
                    organizers=org_names,
                    user_roles=["Public"],
                    is_delegate=False,
                    is_organizer=False,
                )
    except Exception as e:
        logger.warning(f"Failed to fetch competition info for {competition_id}: {e}")
    return None


_WCIF_CACHE: Dict[str, Any] = {}


async def get_wcif_data(competition_id: str, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Fetches and caches the official WCIF data (including schedule and Groupifier assignments).
    """
    if competition_id in _WCIF_CACHE:
        return _WCIF_CACHE[competition_id]

    clean_token = None
    if token:
        clean_token = token.strip()
        if clean_token.lower().startswith("bearer "):
            clean_token = clean_token[7:].strip()

    headers = {"Authorization": f"Bearer {clean_token}"} if clean_token else {}
    wcif = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        if headers:
            try:
                res = await client.get(f"{settings.WCA_API_URL}/competitions/{competition_id}/wcif", headers=headers)
                if res.status_code == 200:
                    wcif = res.json()
            except Exception as e:
                logger.warning(f"Error fetching authorized WCIF for {competition_id}: {e}")

        if not wcif:
            try:
                res = await client.get(f"{settings.WCA_API_URL}/competitions/{competition_id}/wcif/public")
                if res.status_code == 200:
                    wcif = res.json()
            except Exception as e:
                logger.warning(f"Error fetching public WCIF for {competition_id}: {e}")

    if wcif:
        _WCIF_CACHE[competition_id] = wcif
    return wcif


async def fetch_wca_competition_schedule(
    competition_id: str,
    token: Optional[str] = None,
    registrant_id: Optional[int] = None,
    wca_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetches the WCIF schedule for a competition directly from WCA API,
    converts UTC times to venue local timezone, attaches room colors,
    and maps personal Groupifier assignments (competing, judging, scrambling, running).
    """
    wcif_data = await get_wcif_data(competition_id, token)

    if not wcif_data:
        return {
            "competition_id": competition_id,
            "competition_name": competition_id,
            "timezone": "UTC",
            "rooms": [],
            "days": [],
        }

    schedule = wcif_data.get("schedule", {})
    venues = schedule.get("venues", [])
    if not venues:
        return {
            "competition_id": competition_id,
            "competition_name": wcif_data.get("name", competition_id),
            "timezone": "UTC",
            "rooms": [],
            "days": [],
        }

    venue = venues[0]
    tz_str = venue.get("timezone", "UTC")
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = timezone.utc

    # If registrant_id or wca_id is provided, map personal assignments
    person_tasks: Dict[int, str] = {}  # activity_id -> task code ("C", "J", "S", "R")
    person_groups: Dict[str, str] = {}  # event_code -> group_str (e.g. "Gr 2 (St 10)")
    
    target_person = None
    if registrant_id or wca_id:
        for p in wcif_data.get("persons", []):
            if (registrant_id and p.get("registrantId") == registrant_id) or (wca_id and p.get("wcaId") == wca_id):
                target_person = p
                break

    # Build activity parent map
    act_parent_map: Dict[int, int] = {}  # child_id -> parent_round_id
    child_info_map: Dict[int, Dict[str, Any]] = {}

    for r in venue.get("rooms", []):
        for act in r.get("activities", []):
            for ca in act.get("childActivities", []):
                ca_id = ca.get("id")
                act_parent_map[ca_id] = act.get("id")
                child_info_map[ca_id] = {
                    "code": ca.get("activityCode", ""),
                    "name": ca.get("name", ""),
                }

    if target_person:
        for ass in target_person.get("assignments", []):
            ass_id = ass.get("activityId")
            code = ass.get("assignmentCode", "")
            station = ass.get("stationNumber")
            
            task_letter = ""
            if code == "competitor":
                task_letter = "C"
            elif code == "staff-judge":
                task_letter = "J"
            elif code == "staff-scrambler":
                task_letter = "S"
            elif code == "staff-runner":
                task_letter = "R"
            elif code:
                task_letter = code[:2].upper()

            if task_letter:
                # Mark direct activity
                person_tasks[ass_id] = task_letter
                # Mark parent round activity
                if ass_id in act_parent_map:
                    person_tasks[act_parent_map[ass_id]] = task_letter

    all_rooms = []
    day_activities: Dict[str, List[Dict[str, Any]]] = {}

    for r in venue.get("rooms", []):
        r_id = r.get("id", 1)
        r_name = r.get("name", "Main Room")
        r_color = r.get("color") or "#2563EB"
        all_rooms.append({
            "id": r_id,
            "name": r_name,
            "color": r_color,
        })

        for act in r.get("activities", []):
            start_iso = act.get("startTime")
            end_iso = act.get("endTime")
            if not start_iso:
                continue

            try:
                dt_start = datetime.fromisoformat(start_iso.replace("Z", "+00:00")).astimezone(tz)
                time_str = dt_start.strftime("%H:%M")
                date_key = dt_start.strftime("%Y-%m-%d")
                day_name = dt_start.strftime("%A")
            except Exception:
                time_str = start_iso[11:16] if len(start_iso) >= 16 else "09:00"
                date_key = start_iso[:10] if len(start_iso) >= 10 else "2026-01-01"
                day_name = "Day"
                dt_start = datetime.now()

            act_id = act.get("id")
            act_name = act.get("name", "Event")
            act_code = act.get("activityCode", "")
            is_break = any(b in act_name.lower() for b in ["lunch", "opening", "closing", "break", "awards", "dinner", "check-in", "registration"])

            # Determine task for this activity from Groupifier assignments
            task_label = person_tasks.get(act_id, "")
            if not task_label and not is_break:
                # Fallback task indicator
                if "final" in act_name.lower():
                    task_label = "F"
                elif "round 2" in act_name.lower():
                    task_label = "R2"

            entry = {
                "time": time_str,
                "event": act_name,
                "code": act_code,
                "task": task_label,
                "is_break": is_break,
                "room_id": r_id,
                "room_name": r_name,
                "room_color": r_color,
                "dt": dt_start,
            }

            if date_key not in day_activities:
                day_activities[date_key] = []
            day_activities[date_key].append(entry)

    days_list = []
    for d_date in sorted(day_activities.keys()):
        acts = day_activities[d_date]
        acts.sort(key=lambda x: x["dt"])
        day_name = acts[0]["dt"].strftime("%A") if acts else "Day"

        clean_entries = []
        for a in acts:
            clean_entries.append({
                "time": a["time"],
                "event": a["event"],
                "code": a["code"],
                "task": a.get("task", ""),
                "isBreak": a["is_break"],
                "roomId": a["room_id"],
                "roomName": a["room_name"],
                "roomColor": a["room_color"],
            })

        days_list.append({
            "date": d_date,
            "dayName": day_name,
            "entries": clean_entries,
        })

    return {
        "competition_id": competition_id,
        "competition_name": wcif_data.get("name", competition_id),
        "timezone": tz_str,
        "rooms": all_rooms,
        "days": days_list,
    }


async def get_competition_registrations_categorized(
    competition_id: str,
    token: Optional[str] = None,
) -> WCARegistrationsCategorized:
    """
    Fetches registrations for a competition from WCA API and separates them into 3 categories:
    1. Approved (accepted)
    2. Pending (pending / waitlist)
    3. Cancelled (deleted / rejected / cancelled)
    """
    comp_name = competition_id
    raw_records: List[Dict[str, Any]] = []

    found_on_wca = False

    if competition_id in _WCIF_CACHE:
        found_on_wca = True
        wcif_data = _WCIF_CACHE[competition_id]
        comp_name = wcif_data.get("name", competition_id)
        for p in wcif_data.get("persons", []):
            reg = p.get("registration")
            st = "accepted"
            if reg and isinstance(reg, dict):
                if reg.get("isCompeting") is False:
                    continue
                st = str(reg.get("status", "accepted")).lower()
                if reg.get("deleted_at") is not None or st in ["deleted", "rejected", "cancelled", "canceled", "declined", "withdrawn", "d"]:
                    st = "cancelled"
                elif st in ["pending", "waitlist", "waiting_list"] or reg.get("is_waiting_list") or reg.get("waiting_list_position") is not None:
                    st = "pending"
                else:
                    st = "accepted"

            name = p.get("name") or "Competitor"
            wca_id = p.get("wcaId")
            country = p.get("countryIso2") or "UA"
            reg_id = p.get("registrantId")
            avatar_obj = p.get("avatar") or {}
            avatar_url = avatar_obj.get("url") or avatar_obj.get("thumbUrl")

            raw_records.append({
                "raw_name": name,
                "wca_id": wca_id,
                "country": country,
                "status": st,
                "registrant_id": reg_id,
                "avatar_url": avatar_url,
            })

    if not found_on_wca:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                headers = {"Authorization": f"Bearer {token}"} if (token and not token.startswith("wca_demo_")) else {}

                # Fetch competition metadata (name)
                try:
                    comp_res = await client.get(f"{settings.WCA_API_URL}/competitions/{competition_id}", headers=headers)
                    if comp_res.status_code == 200:
                        found_on_wca = True
                        comp_info = comp_res.json()
                        comp_name = comp_info.get("name", competition_id)
                except Exception:
                    pass

                # Query WCIF endpoint (WCIF contains the complete, authoritative persons list with full names, WCA IDs, countries & registrations)
                wcif_urls = []
                if headers:
                    wcif_urls.append((f"{settings.WCA_API_URL}/competitions/{competition_id}/wcif", headers))
                wcif_urls.append((f"{settings.WCA_API_URL}/competitions/{competition_id}/wcif/public", {}))

                for url, hdrs in wcif_urls:
                    wcif_res = await client.get(url, headers=hdrs)
                    if wcif_res.status_code == 200:
                        found_on_wca = True
                        wcif_data = wcif_res.json()
                        comp_name = wcif_data.get("name", comp_name)
                    for p in wcif_data.get("persons", []):
                        reg = p.get("registration")
                        # Crucial: Only show people who actually registered to compete!
                        # Non-competing Delegates, Organizers, and Staff have registration == None or isCompeting == False
                        if not reg or not isinstance(reg, dict):
                            continue

                        # If explicitly marked as not competing, they are not competing in events
                        if reg.get("isCompeting") is False:
                            continue

                        st = str(reg.get("status", "accepted")).lower()
                        if reg.get("deleted_at") is not None or st in ["deleted", "rejected", "cancelled", "canceled", "declined", "withdrawn", "d"]:
                            st = "cancelled"
                        elif st in ["pending", "waitlist", "waiting_list"] or reg.get("is_waiting_list") or reg.get("waiting_list_position") is not None:
                            st = "pending"
                        else:
                            st = "accepted"

                        name = p.get("name") or "Competitor"
                        wca_id = p.get("wcaId")
                        country = p.get("countryIso2") or "UA"
                        reg_id = p.get("registrantId")
                        avatar_obj = p.get("avatar") or {}
                        avatar_url = avatar_obj.get("url") or avatar_obj.get("thumbUrl")

                        raw_records.append({
                            "raw_name": name,
                            "wca_id": wca_id,
                            "country": country,
                            "status": st,
                            "registrant_id": reg_id,
                            "avatar_url": avatar_url,
                        })
                    # Found and parsed WCIF persons
                    break
        except Exception as e:
            logger.warning(f"WCA API registrations fetch failed: {e}")

    # Fallback to sample registrations ONLY if the competition was NOT found on WCA (e.g. offline/demo)
    if not found_on_wca:
        source_data = SAMPLE_REGISTRATIONS.get(competition_id, [])
        comp_obj = next((c for c in DATABASE_COMPETITIONS if c["id"] == competition_id), None)
        if comp_obj:
            comp_name = comp_obj["name"]
        raw_records = source_data

    approved: List[WCARegistrationItem] = []
    pending: List[WCARegistrationItem] = []
    cancelled: List[WCARegistrationItem] = []

    for idx, item in enumerate(raw_records, 1):
        raw_name = item.get("raw_name", "")
        latin, local = parse_wca_name(raw_name)
        country_str = item.get("country", "UA")
        iso2, full_name = resolve_country_iso2(country_str)
        status = str(item.get("status", "accepted")).lower()

        # Preserve official WCA registrant ID
        reg_num = item.get("registrant_id") or idx

        # Both accepted and waitlist (pending) are pre-selected so organizers can import either tab directly
        is_selected = status in ["pending", "waitlist", "waiting_list", "accepted", "approved"]

        reg_item = WCARegistrationItem(
            id=f"wca-reg-{competition_id}-{reg_num}",
            user_id=reg_num,
            name_latin=latin,
            name_local=local,
            name_raw=raw_name,
            wca_id=item.get("wca_id") or None,
            country_iso2=iso2,
            country_name=full_name,
            status=status,
            selected=is_selected,
            competition_id=competition_id,
            avatar_url=item.get("avatar_url") or None,
        )

        if status in ["accepted", "approved"]:
            approved.append(reg_item)
        elif status in ["pending", "waiting_list", "waitlist"]:
            pending.append(reg_item)
        else:
            cancelled.append(reg_item)

    return WCARegistrationsCategorized(
        competition_id=competition_id,
        competition_name=comp_name,
        approved=approved,
        pending=pending,
        cancelled=cancelled,
        total_count=len(approved) + len(pending) + len(cancelled),
    )
