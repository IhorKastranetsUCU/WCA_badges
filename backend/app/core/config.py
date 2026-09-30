import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "WCA Badge Generator"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = (
        "sqlite+aiosqlite:////tmp/badges.db"
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        else "postgresql+asyncpg://spry_user:spry_password@postgres:5432/spry_badges"
    )
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://v0-wcabadgegenerator3.vercel.app,*"

    # Official WCA OAuth Application Credentials
    WCA_CLIENT_ID: str = "6AZttc60ofQv3kaUSGgdS0lkgjh06fcsZtjgz32oFDk"
    WCA_CLIENT_SECRET: str = "5YhFlPIOy-zS8IP8JI_w7mY9UeLB8TPq8zeuJkus6OE"
    WCA_OAUTH_REDIRECT_URI: str = "https://d3genjzo563rwc.cloudfront.net/"
    WCA_OAUTH_AUTHORIZE_URL: str = "https://www.worldcubeassociation.org/oauth/authorize"
    WCA_OAUTH_TOKEN_URL: str = "https://www.worldcubeassociation.org/oauth/token"
    WCA_API_URL: str = "https://www.worldcubeassociation.org/api/v0"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def effective_database_url(self) -> str:
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            return "sqlite+aiosqlite:////tmp/badges.db"
        return self.DATABASE_URL

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
