import pytest
from app.services.csv_parser import parse_wca_name, resolve_country_iso2, parse_wca_csv
from app.services.wca_api import get_competition_registrations_categorized, get_competitions_for_user, DEMO_PROFILES


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
    csv_sample = (
        "Name,WCA ID,Country,Status\n"
        "Ihor Shevchenko (Ігор Шевченко),2018SHEV01,Ukraine,Accepted\n"
        "John Doe,,United States,Accepted\n"
        "Cancelled Person,,Ukraine,Deleted\n"
    ).encode("utf-8")
    records = parse_wca_csv(csv_sample)
    assert len(records) == 2
    assert records[0]["name_latin"] == "Ihor Shevchenko"
    assert records[0]["name_local"] == "Ігор Шевченко"
    assert records[0]["country_iso2"] == "UA"
    assert records[1]["name_latin"] == "John Doe"
    assert records[1]["wca_id"] is None


@pytest.mark.asyncio
async def test_wca_competitions_listing():
    from app.schemas.wca import WCAProfile
    profile = WCAProfile(id=1, name="Test Delegate", country_iso2="UA", is_delegate=True, is_organizer=True)
    comps = await get_competitions_for_user(profile, None)
    assert isinstance(comps, list)


@pytest.mark.asyncio
async def test_wca_registrations_categorized():
    from app.services.wca_api import _WCIF_CACHE
    _WCIF_CACHE["TestComp2026"] = {
        "id": "TestComp2026",
        "name": "Test Competition 2026",
        "persons": [
            {
                "name": "John Doe",
                "wcaId": "2020DOEJ01",
                "countryIso2": "US",
                "registrantId": 1,
                "registration": {"status": "accepted", "isCompeting": True},
            },
            {
                "name": "Jane Smith",
                "wcaId": None,
                "countryIso2": "CA",
                "registrantId": 2,
                "registration": {"status": "pending", "isCompeting": True},
            },
            {
                "name": "Cancelled Person",
                "countryIso2": "US",
                "registrantId": 3,
                "registration": {"status": "cancelled", "isCompeting": True},
            },
        ],
    }
    data = await get_competition_registrations_categorized("TestComp2026", None)
    assert data.competition_id == "TestComp2026"
    assert len(data.approved) == 1
    assert len(data.pending) == 1
    assert len(data.cancelled) == 1
    assert data.approved[0].status == "accepted"
    assert data.pending[0].status == "pending"
    assert data.cancelled[0].status == "cancelled"


def test_render_badges_pdf_multiple_competitors():
    from app.services.pdf_generator import render_badges_pdf

    sample_50 = [
        {
            "csv_index": i,
            "name_latin": f"Competitor {i}",
            "name_local": f"Учасник {i}",
            "wca_id": f"2024TEST{i:02d}" if i % 2 == 0 else None,
            "country_iso2": "UA",
            "country_name": "Ukraine",
            "role_id": "r-participant",
        }
        for i in range(1, 55)
    ]
    roles = {
        "r-participant": {
            "name": "Participant",
            "style": {
                "background_color": "#2563EB",
                "text_color": "#FFFFFF",
                "border_radius": 4.0,
                "font_size": 12,
                "text_align": "center",
            },
        }
    }
    dims = {"preset": "100x70", "width_mm": 100.0, "height_mm": 70.0}
    sides = {
        "front": {
            "elements": [
                {
                    "type": "name",
                    "enabled": True,
                    "name_display": "both",
                    "position": {"x_mm": 5.0, "y_mm": 22.0, "width_mm": 90.0, "height_mm": 14.0, "z_index": 2},
                    "style": {"font_size": 18, "text_align": "center", "has_background": True, "background_color": "#EEEEEE", "border_radius": 2.0},
                },
                {
                    "type": "wca_id",
                    "enabled": True,
                    "format_mode": "prefix_label",
                    "position": {"x_mm": 50.0, "y_mm": 38.0, "width_mm": 40.0, "height_mm": 6.0, "z_index": 3},
                    "style": {"font_size": 11, "text_align": "right"},
                },
                {
                    "type": "role",
                    "enabled": True,
                    "position": {"x_mm": 20.0, "y_mm": 52.0, "width_mm": 60.0, "height_mm": 9.0, "z_index": 4},
                },
                {
                    "type": "flag",
                    "enabled": True,
                    "position": {"x_mm": 42.0, "y_mm": 5.0, "width_mm": 16.0, "height_mm": 11.0, "z_index": 1},
                },
            ]
        }
    }

    # Testing Single paper size: 1 badge per page = 54 pages
    pdf_bytes_single = render_badges_pdf(sample_50, roles, dims, sides, "front", paper_size="Single")
    assert len(pdf_bytes_single) > 1000
    assert pdf_bytes_single.count(b"/Type /Page\n") == 54 or pdf_bytes_single.count(b"/Type /Page") >= 54

    # Testing A4 sheet layout: 8 badges per sheet = 7 sheets
    pdf_bytes_a4 = render_badges_pdf(sample_50, roles, dims, sides, "front", paper_size="A4")
    assert len(pdf_bytes_a4) > 1000
    assert pdf_bytes_a4.count(b"/Type /Page\n") == 7 or pdf_bytes_a4.count(b"/Type /Page") >= 7


@pytest.mark.asyncio
async def test_delete_competitor_endpoint():
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.services.csv_parser import parse_wca_csv

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a competitor via manual
        res = await ac.post("/api/competitors/manual", json={"name_latin": "Delete Me", "country_iso2": "UA"})
        assert res.status_code == 201
        comp_id = res.json()["id"]

        # Delete it
        del_res = await ac.delete(f"/api/competitors/{comp_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # Deleting again should 404
        del_res2 = await ac.delete(f"/api/competitors/{comp_id}")
        assert del_res2.status_code == 404

