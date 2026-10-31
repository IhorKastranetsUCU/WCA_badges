import json, os, logging, boto3
from email.message import EmailMessage
from urllib.parse import unquote_plus

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("report-mailer")
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
ses_client = boto3.client("sesv2")

def handler(event, context):
    records = event.get("Records", [])
    if not records:
        return {"statusCode": 400}
    s3_data = records[0].get("s3", {})
    bucket = s3_data.get("bucket", {}).get("name")
    raw_key = s3_data.get("object", {}).get("key", "")
    key = unquote_plus(raw_key)

    # CloudWatch log required line format
    logger.info(f"report-mailer triggered trigger=s3 bucket={bucket} key={key}")

    if not key.startswith("reports/") or not key.endswith(".csv"):
        logger.info("Ignoring non-csv report key")
        return {"statusCode": 200, "message": "Ignored"}

    logger.info(f"Downloading s3://{bucket}/{key}")
    s3_resp = s3_client.get_object(Bucket=bucket, Key=key)
    csv_bytes = s3_resp["Body"].read()

    sender = os.environ.get("SENDER_EMAIL", "kastranets.pn@ucu.edu.ua")
    recipient_env = os.environ.get("RECIPIENT_EMAILS", "kastranets.pn@ucu.edu.ua")
    recipients = [r.strip() for r in recipient_env.split(",") if r.strip()]

    filename = key.split("/")[-1]
    week_label = filename.replace(".csv", "")

    msg = EmailMessage()
    msg["Subject"] = f"Spry Weekly Report — {week_label}"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.set_content(
        f"Hi there,\n\n"
        f"The Spry Weekly Meetings Report for {week_label} has been generated and is attached.\n\n"
        f"S3 Object: s3://{bucket}/{key}\n"
        f"Payload Size: {len(csv_bytes)} bytes\n\n"
        f"Best regards,\n"
        f"Spry Automated Reports Engine"
    )
    msg.add_attachment(csv_bytes, maintype="text", subtype="csv", filename=filename)

    logger.info(f"Sending email via SES to {recipients} from {sender}")
    res = ses_client.send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": recipients},
        Content={"Raw": {"Data": msg.as_bytes()}},
    )
    logger.info(f"Email sent successfully. MessageId={res.get('MessageId')}")
    return {"statusCode": 200, "trigger": "s3", "key": key}
