import pytest
from app.services.csv_parser import parse_wca_name, resolve_country_iso2, parse_wca_csv
from app.services.wca_api import get_competition_registrations_categorized, get_user_managed_competitions


def test_parse_wca_name_split():
    latin, local = parse_wca_name("Ihor Shevchenko (Ігор Шевченко)")
    assert latin == "Ihor Shevchenko"
    assert local == "Ігор Шевченко"

    latin_single, local_single = parse_wca_name("Tymon Kolasinski")
    assert latin_single == "Tymon Kolasinski"
    assert local_single is None


def test_resolve_country_iso2():
    iso, name = resolve_country_iso2("Ukraine")
    assert iso == "UA"

    iso_pl, name_pl = resolve_country_iso2("Poland")
    assert iso_pl == "PL"


def test_parse_wca_csv():
    csv_sample = b"Name,WCA ID,Country,Status\nIhor Shevchenko (Ігор Шевченко),2018SHEV01,Ukraine,Accepted\nJohn Doe,,United States,Accepted\n"
    records = parse_wca_csv(csv_sample)
    assert len(records) == 2
    assert records[0]["name_latin"] == "Ihor Shevchenko"
    assert records[0]["name_local"] == "Ігор Шевченко"
    assert records[0]["country_iso2"] == "UA"
    assert records[1]["name_latin"] == "John Doe"
    assert records[1]["wca_id"] is None


@pytest.mark.asyncio
async def test_wca_competitions_listing():
    comps = await get_user_managed_competitions(None)
    assert len(comps) > 0
    assert any(c.is_delegate or c.is_organizer for c in comps)


@pytest.mark.asyncio
async def test_wca_registrations_categorized():
    data = await get_competition_registrations_categorized("KyivSpring2026", None)
    assert data.competition_id == "KyivSpring2026"
    assert len(data.approved) > 0
    assert len(data.pending) > 0
    assert len(data.cancelled) > 0
    # Approved should have status accepted
    assert all(r.status == "accepted" for r in data.approved)
    assert all(r.status == "pending" for r in data.pending)
