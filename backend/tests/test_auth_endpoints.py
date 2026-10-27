from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_register_user_endpoint_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.auth.register_cognito_user") as mock_reg:
            mock_reg.return_value = {
                "status": "CONFIRMATION_PENDING",
                "email": "student@ucu.edu.ua",
                "username": "student_login",
                "message": "Код підтвердження надіслано на вашу пошту student@ucu.edu.ua.",
            }

            resp = await client.post(
                "/api/auth/register",
                json={
                    "username": "student_login",
                    "email": "student@ucu.edu.ua",
                    "password": "SecurePassword123!",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "CONFIRMATION_PENDING"
            assert data["email"] == "student@ucu.edu.ua"
            assert "підтвердження" in data["message"]


@pytest.mark.asyncio
async def test_confirm_registration_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.auth.confirm_cognito_registration") as mock_confirm:
            mock_confirm.return_value = {
                "status": "CONFIRMED",
                "email": "student@ucu.edu.ua",
                "message": "Електронну пошту успішно підтверджено!",
            }

            resp = await client.post(
                "/api/auth/confirm",
                json={
                    "email": "student@ucu.edu.ua",
                    "code": "123456",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_resend_code_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.auth.resend_cognito_code") as mock_resend:
            mock_resend.return_value = {
                "status": "CODE_RESENT",
                "email": "student@ucu.edu.ua",
                "message": "Новий код надіслано.",
            }

            resp = await client.post(
                "/api/auth/resend-code",
                json={"email": "student@ucu.edu.ua"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "CODE_RESENT"


@pytest.mark.asyncio
async def test_login_password_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.auth.login_cognito_password") as mock_login:
            mock_login.return_value = {
                "email": "student@ucu.edu.ua",
                "name": "Ihor",
                "sub": "mock-sub-123",
                "access_token": "mock-access-token",
                "id_token": "mock-id-token",
            }

            resp = await client.post(
                "/api/auth/login-password",
                json={
                    "email": "student@ucu.edu.ua",
                    "password": "SecurePassword123!",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["provider"] == "cognito"
            assert data["profile"]["email"] == "student@ucu.edu.ua"
