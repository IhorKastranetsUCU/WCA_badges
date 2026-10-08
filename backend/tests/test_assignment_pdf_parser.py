import io
import pytest
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.services.assignment_pdf_parser import parse_competitor_cards_pdf


def test_parse_competitor_cards_pdf_synthetic():
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.drawString(50, 750, "Sample Competitor")
    c.drawString(50, 735, "ID: 1")
    c.drawString(50, 720, "WCA ID: 2024TEST01")
    c.drawString(50, 700, "3x3x3 Cube")
    c.drawString(100, 700, "Comp: 1")
    c.drawString(150, 700, "Judge: 2")
    c.showPage()
    c.save()

    pdf_bytes = buf.getvalue()
    result = parse_competitor_cards_pdf(pdf_bytes)
    assert "total_cards" in result
    assert "cards" in result
    assert "assignments_by_reg_id" in result


def test_parse_empty_pdf():
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.showPage()
    c.save()

    result = parse_competitor_cards_pdf(buf.getvalue())
    assert result["total_cards"] == 0
    assert len(result["cards"]) == 0
