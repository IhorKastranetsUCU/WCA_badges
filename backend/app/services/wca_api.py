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

# Profiles for quick login / demo / test
DEMO_PROFILES: Dict[str, WCAProfile] = {
    "delegate": WCAProfile(
        id=18942,
        wca_id="2018SHEV01",
        name="Ihor Shevchenko",
        avatar_url="https://avatars.githubusercontent.com/u/45145803?v=4",
        country_iso2="UA",
        delegate_status="delegate",
        is_delegate=True,
        is_organizer=True,
        email="ishevchenko@worldcubeassociation.org",
    ),
    "organizer": WCAProfile(
        id=21450,
        wca_id="2019MAZU01",
        name="Oleksandr Mazur",
        avatar_url="https://avatars.githubusercontent.com/u/9919?v=4",
        country_iso2="UA",
        delegate_status=None,
        is_delegate=False,
        is_organizer=True,
        email="omazur@example.com",
    ),
}

# Competitions associated with organizers & delegates
DATABASE_COMPETITIONS: List[Dict[str, Any]] = [
    {
        "id": "KyivSpring2026",
        "name": "Kyiv Spring Cubing 2026",
        "city": "Kyiv",
        "country_iso2": "UA",
        "start_date": "2026-04-18",
        "end_date": "2026-04-19",
        "delegates": ["Ihor Shevchenko"],
        "organizers": ["Oleksandr Mazur", "Ihor Shevchenko"],
    },
    {
        "id": "UkrainianNationals2026",
        "name": "Ukrainian Championship 2026",
        "city": "Lviv",
        "country_iso2": "UA",
        "start_date": "2026-08-22",
        "end_date": "2026-08-24",
        "delegates": ["Ihor Shevchenko", "Artem Melikyan"],
        "organizers": ["Lviv Speedcubing Club"],
    },
    {
        "id": "PodillyaOpen2026",
        "name": "Podillya Open 2026",
        "city": "Vinnytsia",
        "country_iso2": "UA",
        "start_date": "2026-06-13",
        "end_date": "2026-06-14",
        "delegates": ["Ihor Shevchenko"],
        "organizers": ["Vinnytsia Cube Team"],
    },
    {
        "id": "DniproCubeCup2026",
        "name": "Dnipro Cube Cup 2026",
        "city": "Dnipro",
        "country_iso2": "UA",
        "start_date": "2026-07-04",
        "end_date": "2026-07-05",
        "delegates": ["Artem Melikyan"],
        "organizers": ["Oleksandr Mazur"],
    },
    {
        "id": "WarsawOpen2026",
        "name": "Warsaw Speedcube Open 2026",
        "city": "Warsaw",
        "country_iso2": "PL",
        "start_date": "2026-05-09",
        "end_date": "2026-05-10",
        "delegates": ["Jan Kowalski"],
        "organizers": ["Ihor Shevchenko"],
    },
]

# Registration records per competition
SAMPLE_REGISTRATIONS: Dict[str, List[Dict[str, Any]]] = {
    "KyivSpring2026": [
        {"raw_name": "Yurii Riabov (Юрій Рябов)", "wca_id": "2018RIAB01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Oleksandr Mazur (Олександр Мазур)", "wca_id": "2019MAZU01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Vladyslav Klymenko (Владислав Клименко)", "wca_id": "2021KLYM01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Mykhailo Moroz (Михайло Мороз)", "wca_id": "2017MORO03", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Andriy Bondarenko (Андрій Бондаренко)", "wca_id": "2019BOND02", "country": "Ukraine", "status": "accepted"},
        # Waiting list / pending competitors
        {"raw_name": "Artem Zhuravsky (Артем Журавський)", "wca_id": "2022ZHUR01", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Bohdan Koval (Богдан Коваль)", "wca_id": "2023KOVA02", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Sophia Miller", "wca_id": "2020MILL05", "country": "Germany", "status": "pending"},
        {"raw_name": "Denys Melnyk (Денис Мельник)", "wca_id": "2024MELN01", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Yaroslav Boyko (Ярослав Бойко)", "wca_id": "", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Anna Tkachenko (Анна Ткаченко)", "wca_id": "2023TKAC01", "country": "Ukraine", "status": "pending"},
        # Cancelled
        {"raw_name": "Dmytro Hordiyenko (Дмитро Гордієнко)", "wca_id": "2017HORD01", "country": "Ukraine", "status": "deleted"},
        {"raw_name": "Kamil Wisniewski", "wca_id": "2015WISN02", "country": "Poland", "status": "rejected"},
    ],
    "UkrainianNationals2026": [
        {"raw_name": "Yurii Riabov (Юрій Рябов)", "wca_id": "2018RIAB01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Vladyslav Hordiienko", "wca_id": "2018HORD01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Artem Melikyan (Артем Мелікян)", "wca_id": "2014MELI01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Lev Golub (Лев Голуб)", "wca_id": "2015GOLU01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Roman Ostapenko (Роман Остапенко)", "wca_id": "2018OSTA02", "country": "Ukraine", "status": "accepted"},
        # Waiting list / pending competitors
        {"raw_name": "Olena Bondar (Олена Бондар)", "wca_id": "2022BOND03", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Taras Shevchenko (Тарас Шевченко)", "wca_id": "", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Sevastian Ostrovskyi (Севастіян Островський)", "wca_id": "2026OSTR02", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Maksym Uhryna (Максим Угрина)", "wca_id": "2026UHRY01", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Roman Shmygelskyi (Роман Шмигельський)", "wca_id": "2023KROM01", "country": "Ukraine", "status": "pending"},
        {"raw_name": "Danylo Radzishevsky (Данило Радзішевський)", "wca_id": "2023RADZ02", "country": "Ukraine", "status": "pending"},
        # Cancelled
        {"raw_name": "Denys Kravchenko (Денис Кравченко)", "wca_id": "2019KRAV01", "country": "Ukraine", "status": "deleted"},
    ],
    "PodillyaOpen2026": [
        {"raw_name": "Yurii Riabov (Юрій Рябов)", "wca_id": "2018RIAB01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Ivan Petrenko (Іван Петренко)", "wca_id": "2021PETR02", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Nazar Boyko (Назар Бойко)", "wca_id": "2023BOYK01", "country": "Ukraine", "status": "pending"},
    ],
    "DniproCubeCup2026": [
        {"raw_name": "Oleksandr Mazur (Олександр Мазур)", "wca_id": "2019MAZU01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Pavlo Sydorenko (Павло Сидоренко)", "wca_id": "2017SYDO01", "country": "Ukraine", "status": "accepted"},
        {"raw_name": "Viktoria Tkachenko (Вікторія Ткаченко)", "wca_id": "", "country": "Ukraine", "status": "pending"},
    ],
    "WarsawOpen2026": [
        {"raw_name": "Jan Kowalski", "wca_id": "2014KOWA01", "country": "Poland", "status": "accepted"},
        {"raw_name": "Kamil Wisniewski", "wca_id": "2015WISN02", "country": "Poland", "status": "accepted"},
        {"raw_name": "Piotr Nowak", "wca_id": "2018NOWA03", "country": "Poland", "status": "accepted"},
        {"raw_name": "Magdalena Wisniewska", "wca_id": "", "country": "Poland", "status": "pending"},
    ],
}


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
    logger.info(f"Exchanging WCA code with redirect_uri={data['redirect_uri']}, client_id={data['client_id']}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(settings.WCA_OAUTH_TOKEN_URL, data=data)
            logger.info(f"WCA token response status: {res.status_code}")
            if res.status_code == 200:
                return res.json()
            else:
                logger.error(f"WCA token exchange error {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Failed to exchange WCA OAuth code: {e}")

    # Fallback to simulated token for local dev/testing
    return {
        "access_token": f"wca_access_token_{code[:12]}",
        "token_type": "bearer",
        "expires_in": 7200,
    }


async def fetch_wca_me_profile(token: str) -> WCAProfile:
    """
    Fetches the authenticated user's WCA profile from /api/v0/me.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(
                f"{settings.WCA_API_URL}/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            logger.info(f"WCA /me response status: {res.status_code}")
            if res.status_code == 200:
                data = res.json().get("me", {})
                wca_id = data.get("wca_id")
                del_status = data.get("delegate_status")
                return WCAProfile(
                    id=data.get("id", 1),
                    wca_id=wca_id,
                    name=data.get("name", "WCA User"),
                    avatar_url=data.get("avatar", {}).get("url"),
                    country_iso2=data.get("country_iso2", "UA"),
                    delegate_status=del_status,
                    is_delegate=del_status is not None,
                    is_organizer=True,
                    email=data.get("email"),
                )
            else:
                logger.error(f"WCA /me error {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Failed to fetch WCA profile from API: {e}")

    # Fallback to default delegate profile
    return DEMO_PROFILES["delegate"]


async def get_competitions_for_user(
    profile: WCAProfile,
    token: Optional[str] = None,
) -> List[WCACompetition]:
    """
    Returns only competitions where the user has a role (Delegate or Organizer).
    """
    # 1. Attempt live WCA API fetch if real token is provided
    if token and not token.startswith("wca_demo_"):
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{settings.WCA_API_URL}/competitions?managed_by_me=true",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if res.status_code == 200:
                    api_comps = res.json()
                    results = []
                    for c in api_comps:
                        del_names = [d.get("name", "") for d in c.get("delegates", [])]
                        org_names = [o.get("name", "") for o in c.get("organizers", [])]
                        is_del = profile.name in del_names or (profile.wca_id and profile.wca_id in str(c.get("delegates", [])))
                        is_org = profile.name in org_names or (profile.wca_id and profile.wca_id in str(c.get("organizers", [])))

                        roles = []
                        if is_del:
                            roles.append("Delegate")
                        if is_org:
                            roles.append("Organizer")

                        results.append(
                            WCACompetition(
                                id=c.get("id"),
                                name=c.get("name", c.get("id")),
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
                    if results:
                        return results
        except Exception as e:
            logger.warning(f"Error fetching managed competitions from WCA API: {e}")

    # 2. Filter database competitions based on user's identity and roles
    filtered: List[WCACompetition] = []
    user_name = profile.name
    user_wca_id = profile.wca_id

    for comp in DATABASE_COMPETITIONS:
        is_del = user_name in comp["delegates"] or (user_wca_id and user_wca_id in comp.get("delegate_wca_ids", []))
        is_org = user_name in comp["organizers"] or (user_wca_id and user_wca_id in comp.get("organizer_wca_ids", []))

        # Check if user matches delegate or organizer roles
        if is_del or is_org or profile.is_delegate:
            roles = []
            if is_del:
                roles.append("Delegate")
            if is_org:
                roles.append("Organizer")
            if not roles:
                roles = ["Delegate"] if profile.is_delegate else ["Organizer"]

            filtered.append(
                WCACompetition(
                    id=comp["id"],
                    name=comp["name"],
                    city=comp["city"],
                    country_iso2=comp["country_iso2"],
                    start_date=comp["start_date"],
                    end_date=comp["end_date"],
                    delegates=comp["delegates"],
                    organizers=comp["organizers"],
                    user_roles=roles,
                    is_delegate=is_del or profile.is_delegate,
                    is_organizer=is_org or profile.is_organizer,
                )
            )

    return filtered


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
                        # Non-competing Delegates, Organizers, and Staff have registration == None and must NOT be shown as competitors.
                        if not reg or not isinstance(reg, dict):
                            continue

                        # If explicitly marked as not competing and not on waiting list, skip
                        if reg.get("isCompeting") is False and reg.get("status") not in ["pending", "waitlist", "waiting_list", "accepted", "approved"]:
                            continue

                        st = str(reg.get("status", "accepted")).lower()
                        if st in ["pending", "waitlist", "waiting_list"] or reg.get("is_waiting_list") or reg.get("waiting_list_position") is not None:
                            st = "pending"
                        elif st in ["deleted", "rejected", "cancelled"]:
                            st = "cancelled"
                        else:
                            st = "accepted"

                        name = p.get("name") or "Competitor"
                        wca_id = p.get("wcaId")
                        country = p.get("countryIso2") or "UA"

                        raw_records.append({
                            "raw_name": name,
                            "wca_id": wca_id,
                            "country": country,
                            "status": st,
                        })
                    # Found and parsed WCIF persons
                    break
    except Exception as e:
        logger.warning(f"WCA API registrations fetch failed: {e}")

    # Fallback to sample registrations ONLY if the competition was NOT found on WCA (e.g. offline/demo)
    if not found_on_wca:
        source_data = SAMPLE_REGISTRATIONS.get(competition_id, SAMPLE_REGISTRATIONS["KyivSpring2026"])
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

        # Both accepted and waitlist (pending) are pre-selected so organizers can import either tab directly
        is_selected = status in ["pending", "waitlist", "waiting_list", "accepted", "approved"]

        reg_item = WCARegistrationItem(
            id=f"wca-reg-{competition_id}-{idx}",
            user_id=idx,
            name_latin=latin,
            name_local=local,
            name_raw=raw_name,
            wca_id=item.get("wca_id") or None,
            country_iso2=iso2,
            country_name=full_name,
            status=status,
            selected=is_selected,
            competition_id=competition_id,
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
