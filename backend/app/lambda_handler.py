import logging
import subprocess
from mangum import Mangum
from app.main import app

logger = logging.getLogger(__name__)

# Standard ASGI adapter for AWS Lambda Function URL
asgi_handler = Mangum(app, lifespan="auto")


def handler(event, context):
    """
    AWS Lambda entrypoint.
    - If invoked directly with {"action": "migrate"}, runs Alembic migrations.
    - Otherwise, routes HTTP requests through Mangum to FastAPI.
    """
    if isinstance(event, dict) and event.get("action") == "migrate":
        logger.info("Executing database migrations via Alembic...")
        try:
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                check=True,
            )
            return {
                "statusCode": 200,
                "body": f"Migrations completed successfully:\n{result.stdout}",
            }
        except subprocess.CalledProcessError as e:
            return {
                "statusCode": 500,
                "body": f"Migration error:\n{e.stderr}",
            }

    return asgi_handler(event, context)
