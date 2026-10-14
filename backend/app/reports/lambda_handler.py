import json
import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import boto3

from app.reports.weekly import build_weekly_report

# Configure root logger with standard format
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("report-builder")
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")


def parse_event(event: dict[str, Any]) -> tuple[str, str | None]:
    """
    Detects trigger source and requested week from incoming Lambda event.
    Handles:
    - Direct invocation / EventBridge Scheduler: {"source": "schedule", "week": "..."}
    - SQS Queue invocation: event["Records"][0]["body"]
    """
    if not isinstance(event, dict):
        return "direct", None

    # Check SQS event
    records = event.get("Records")
    if records and isinstance(records, list) and len(records) > 0:
        first_record = records[0]
        if first_record.get("eventSource") == "aws:sqs":
            body_str = first_record.get("body", "{}")
            try:
                body = json.loads(body_str)
                week = body.get("week")
                # If body specifically says source: schedule, preserve that or mark as sqs
                source = body.get("source")
                trigger = "sqs" if source != "schedule" else "sqs"
                return trigger, week
            except Exception:
                return "sqs", None

    # Direct / EventBridge Scheduler
    source = event.get("source")
    if source == "schedule" or event.get("detail-type") == "Scheduled Event":
        return "schedule", event.get("week")

    return source or "direct", event.get("week")


def get_default_previous_week() -> str:
    now = datetime.now(UTC)
    prev = now - timedelta(days=7)
    iso = prev.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    trigger, week = parse_event(event)
    if not week:
        week = get_default_previous_week()

    # Step 7 DLQ testing hook: if week is 'FAIL_TEST' or '2026-W99', simulate builder failure
    if (
        week in ("FAIL_TEST", "2026-W99")
        or os.environ.get("SIMULATE_FAILURE", "").lower() == "true"
    ):
        logger.error(
            f"report-builder triggered trigger={trigger} week={week} status=simulated_failure"
        )
        raise RuntimeError(
            f"Simulated transient error building report for week {week} to test DLQ redrive."
        )

    # Lab requirement: explicitly log trigger and week in standard CloudWatch line
    logger.info(f"report-builder triggered trigger={trigger} week={week}")

    # Generate CSV bytes idempotently
    csv_bytes = build_weekly_report(week)

    bucket_name = os.environ.get("REPORTS_BUCKET_NAME")
    if not bucket_name:
        account_id = os.environ.get("AWS_ACCOUNT_ID", "297580066889")
        project_name = os.environ.get("PROJECT_NAME", "wca-badges")
        bucket_name = f"{project_name}-reports-{account_id}"

    key = f"reports/{week}.csv"

    logger.info(f"Uploading weekly report to S3: s3://{bucket_name}/{key} ({len(csv_bytes)} bytes)")
    s3_client.put_object(
        Bucket=bucket_name,
        Key=key,
        Body=csv_bytes,
        ContentType="text/csv",
    )
    logger.info(f"Report successfully uploaded to s3://{bucket_name}/{key}")

    return {
        "statusCode": 200,
        "trigger": trigger,
        "week": week,
        "bucket": bucket_name,
        "key": key,
        "size_bytes": len(csv_bytes),
    }
