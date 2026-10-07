import os
import pytest
from app.services.assignment_pdf_parser import parse_competitor_cards_pdf


def test_parse_competitor_cards_pdf():
    # Test path in repo or container
    sample_paths = [
        "UkrainianNationals2026-competitor-cards.pdf",
        os.path.join(os.path.dirname(__file__), "..", "..", "UkrainianNationals2026-competitor-cards.pdf"),
        os.path.join(os.path.dirname(__file__), "..", "UkrainianNationals2026-competitor-cards.pdf"),
    ]
    pdf_path = next((p for p in sample_paths if os.path.exists(p)), None)
    assert pdf_path is not None, "Sample competitor cards PDF not found"

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    result = parse_competitor_cards_pdf(pdf_bytes)
    assert result["total_cards"] == 70
    assert len(result["cards"]) == 70
    assert len(result["assignments_by_reg_id"]) == 70

    # Test Anastasia Kartashova (ID 58, 2023KANA06)
    c58 = next(c for c in result["cards"] if c["registrant_id"] == 58)
    assert c58["wca_id"] == "2023KANA06"
    assert "Anastasia" in c58["name"]
    assert c58["assignments"]["333"]["comp"] == ["3"]
    assert c58["assignments"]["222"]["comp"] == ["2"]
    assert c58["assignments"]["pyram"]["comp"] == ["2"]
    assert c58["assignments"]["skewb"]["comp"] == ["1"]

    # Test Denys Matviievskyi (ID 13, newcomer without WCA ID)
    c13 = next(c for c in result["cards"] if c["registrant_id"] == 13)
    assert c13["wca_id"] is None
    assert "Denys" in c13["name"]
    assert c13["assignments"]["333"]["comp"] == ["1"]
    assert c13["assignments"]["333"]["judge"] == ["2", "3", "5"]
    assert c13["assignments"]["444"]["comp"] == ["1"]
    assert c13["assignments"]["444"]["judge"] == ["2"]
    assert c13["assignments"]["555"]["comp"] == []
    assert c13["assignments"]["555"]["judge"] == ["1", "2"]
    assert c13["assignments"]["minx"]["judge"] == ["1", "2"]

    # Test Daniel Tsyporin (ID 9, 2022TSYP01)
    c9 = next(c for c in result["cards"] if c["registrant_id"] == 9)
    assert c9["wca_id"] == "2022TSYP01"
    assert c9["assignments"]["333"]["comp"] == ["4"]
    assert c9["assignments"]["333"]["judge"] == ["5"]
    assert c9["assignments"]["333oh"]["comp"] == ["2"]
    assert c9["assignments"]["333oh"]["scr"] == ["3"]
    assert c9["assignments"]["333oh"]["judge"] == ["1"]
