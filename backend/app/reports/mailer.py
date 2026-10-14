import logging
import os
from email.message import EmailMessage
from typing import Any
from urllib.parse import unquote_plus

import boto3

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("report-mailer")
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
ses_client = boto3.client("sesv2")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    records = event.get("Records", [])
    if not records:
        logger.warning("No records found in event.")
        return {"statusCode": 400, "body": "No records in event"}

    first_record = records[0]
    s3_data = first_record.get("s3", {})
    bucket = s3_data.get("bucket", {}).get("name")
    raw_key = s3_data.get("object", {}).get("key", "")
    key = unquote_plus(raw_key)

    # Required deliverable format: CloudWatch log line with trigger=s3
    logger.info(f"report-mailer triggered trigger=s3 bucket={bucket} key={key}")

    # Enforce safety rule: mailer MUST NEVER write back to reports/
    if not key.startswith("reports/") or not key.endswith(".csv"):
        logger.info(f"Skipping key {key}: does not match reports/*.csv prefix/suffix.")
        return {"statusCode": 200, "message": "Ignored non-report key"}

    logger.info(f"Downloading report from s3://{bucket}/{key}")
    s3_response = s3_client.get_object(Bucket=bucket, Key=key)
    csv_bytes = s3_response["Body"].read()

    sender = os.environ.get("SENDER_EMAIL", "kastranets.pn@ucu.edu.ua")
    recipient_env = os.environ.get("RECIPIENT_EMAILS", "kastranets.pn@ucu.edu.ua")
    recipients = [r.strip() for r in recipient_env.split(",") if r.strip()]

    filename = key.split("/")[-1]
    week_label = filename.replace(".csv", "")

    # Build RFC 5322 compliant message with attachment
    msg = EmailMessage()
    msg["Subject"] = f"Spry Weekly Report — {week_label}"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.set_content(
        f"Hi there,\n\n"
        f"The Spry Weekly Meetings Report for {week_label} has been compiled and is attached.\n\n"
        f"Storage Location: s3://{bucket}/{key}\n"
        f"File Size: {len(csv_bytes)} bytes\n\n"
        f"Best regards,\n"
        f"Spry Automated Reports Engine"
    )

    msg.add_attachment(
        csv_bytes,
        maintype="text",
        subtype="csv",
        filename=filename,
    )

    logger.info(f"Dispatching report email via Amazon SES to {recipients} from {sender}")
    ses_response = ses_client.send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": recipients},
        Content={"Raw": {"Data": msg.as_bytes()}},
    )

    message_id = ses_response.get("MessageId")
    logger.info(f"Email successfully delivered to SES queue. MessageId={message_id}")

    return {
        "statusCode": 200,
        "trigger": "s3",
        "bucket": bucket,
        "key": key,
        "messageId": message_id,
        "recipients": recipients,
    }
