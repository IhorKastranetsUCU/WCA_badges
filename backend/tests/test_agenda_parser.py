import json
from datetime import date
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.ai.agenda import (
    PROMPT_VERSION,
    ActionItem,
    AgendaItem,
    ParsedAgenda,
    cost_usd,
    parse_agenda,
)
from app.ai.agenda_lambda import handler
from app.main import app


def test_agenda_schema_validation():
    """Validates that ParsedAgenda strictly validates fields."""
    valid = ParsedAgenda(
        title="Weekly Sync",
        starts_at="2026-10-19T10:00:00+03:00",
        duration_minutes=45,
        items=[
            AgendaItem(topic="Pricing Updates", owner="Olena", minutes=15),
            AgendaItem(topic="Customer Feedback", owner="Taras", minutes=None),
        ],
        action_items=[
            ActionItem(task="Compile competitor matrix", owner="Taras", due=date(2026, 10, 23))
        ],
        language="en",
    )
    assert valid.title == "Weekly Sync"
    assert len(valid.items) == 2
    assert valid.action_items[0].due == date(2026, 10, 23)

    # Empty topic is invalid (min_length=1)
    with pytest.raises(ValidationError):
        AgendaItem(topic="")

    # Duration > 600 min is invalid
    with pytest.raises(ValidationError):
        ParsedAgenda(duration_minutes=999, items=[], language="en")


def test_cost_calculation():
    """Validates cost computation matching lab list prices."""
    usage = {"input_tokens": 1000, "output_tokens": 500}

    # Opus 5.5 ($4/M in, $20/M out): 1000 * 0.000004 + 500 * 0.000020 = 0.004 + 0.010 = 0.014
    assert cost_usd("anthropic.claude-opus-5-5", usage) == 0.014

    # Haiku 5.5 ($0.10/M in, $0.50/M out): 1000 * 0.0000001 + 500 * 0.0000005 = 0.0001 + 0.00025 = 0.00035
    assert cost_usd("anthropic.claude-haiku-5-5", usage) == 0.00035


@patch("app.ai.agenda._call_bedrock_converse")
def test_parse_agenda_mock(mock_converse):
    """Verifies parse_agenda successfully parses and returns ParsedAgenda."""
    mock_input = {
        "title": "Pricing Sync",
        "starts_at": "2026-10-19T10:00:00+03:00",
        "duration_minutes": 45,
        "items": [{"topic": "New Plans", "owner": "Olena", "minutes": 15}],
        "action_items": [],
        "language": "en",
    }
    mock_usage = {"input_tokens": 800, "output_tokens": 150}
    mock_converse.return_value = (mock_input, mock_usage, "tool-123", {})

    agenda, usage = parse_agenda(
        "test text", date(2026, 10, 19), "Europe/Kyiv", model="amazon.nova-pro-v1:0"
    )

    assert agenda.title == "Pricing Sync"
    assert agenda.duration_minutes == 45
    assert len(agenda.items) == 1
    assert usage["input_tokens"] == 800


def test_lambda_handler_auth_and_limits():
    """Ensures Lambda handler enforces 401 on missing auth and 413 on oversized text."""
    # 1. Missing auth
    res_no_auth = handler({"headers": {}, "body": "{}"}, None)
    assert res_no_auth["statusCode"] == 401

    # 2. Text too long (>10,000 characters)
    oversized = "a" * 10005
    res_large = handler(
        {"headers": {"authorization": "Bearer dev-token"}, "body": json.dumps({"text": oversized})},
        None,
    )
    assert res_large["statusCode"] == 413

    # 3. Preflight OPTIONS
    res_options = handler({"httpMethod": "OPTIONS"}, None)
    assert res_options["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in res_options["headers"]


@pytest.mark.asyncio
async def test_api_meetings_agenda_save():
    """Ensures main API POST /api/meetings/{id}/agenda saves agenda and ai_suggestion."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        meeting_id = "test-meeting-42"
        payload = {
            "agenda": {
                "title": "Board Meeting",
                "duration_minutes": 60,
                "items": [{"topic": "Budget Review", "owner": "CFO", "minutes": 30}],
                "action_items": [],
                "language": "en",
            },
            "ai_suggestion": {
                "agenda": {"title": "Raw Suggested Title"},
                "model": "anthropic.claude-opus-5-5",
                "prompt_version": PROMPT_VERSION,
            },
        }

        resp = await client.post(f"/api/meetings/{meeting_id}/agenda", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "saved"
        assert data["meeting_id"] == meeting_id
        assert data["has_ai_suggestion"] is True

        # Fetch meeting to verify persistence
        get_resp = await client.get(f"/api/meetings/{meeting_id}")
        assert get_resp.status_code == 200
        meeting_data = get_resp.json()
        assert meeting_data["title"] == "Board Meeting"
        assert meeting_data["agenda"]["items"][0]["owner"] == "CFO"
        assert meeting_data["ai_suggestion"]["model"] == "anthropic.claude-opus-5-5"
