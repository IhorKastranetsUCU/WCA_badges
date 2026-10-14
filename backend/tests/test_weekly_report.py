from app.reports.weekly import build_weekly_report, parse_iso_week


def test_parse_iso_week_valid():
    start_curr, end_curr, start_prev, end_prev = parse_iso_week("2026-W40")
    # 2026-W40 Monday is 2026-09-28
    assert start_curr.year == 2026
    assert start_curr.month == 9
    assert start_curr.day == 28
    assert (end_curr - start_curr).days == 7
    assert (start_curr - start_prev).days == 7
    assert end_prev == start_curr


def test_build_weekly_report_structure_and_idempotency():
    week = "2026-W40"
    report_bytes_1 = build_weekly_report(week)
    report_bytes_2 = build_weekly_report(week)

    # Idempotency rule: same week produces identical output
    assert report_bytes_1 == report_bytes_2

    csv_text = report_bytes_1.decode("utf-8")
    assert f"# Spry Weekly Meetings Report,{week}" in csv_text
    assert "SECTION 1: WEEKLY SUMMARY & MOMENTUM COMPARISON" in csv_text
    assert "Total Meetings Count" in csv_text
    assert "Total Duration (Hours)" in csv_text
    assert "SECTION 2: TOP 5 LONGEST MEETINGS" in csv_text
    assert "SECTION 3: BREAKDOWN PER ORGANIZER / MEMBER" in csv_text
