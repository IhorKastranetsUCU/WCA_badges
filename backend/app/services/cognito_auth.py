import logging
import uuid
import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.wca import WCAProfile

logger = logging.getLogger(__name__)


def get_cognito_idp_client():
    return boto3.client("cognito-idp", region_name=settings.COGNITO_REGION)


def register_cognito_user(username: str, email: str, password: str) -> dict:
    """
    Registers a new user in AWS Cognito User Pool with email, username (login), and password.
    Cognito automatically triggers sending an email confirmation code to the user's inbox.
    """
    client = get_cognito_idp_client()
    clean_email = email.strip().lower()
    clean_username = username.strip()

    try:
        response = client.sign_up(
            ClientId=settings.COGNITO_USER_POOL_CLIENT_ID,
            Username=clean_email,
            Password=password,
            UserAttributes=[
                {"Name": "email", "Value": clean_email},
                {"Name": "name", "Value": clean_username},
                {"Name": "preferred_username", "Value": clean_username},
            ],
        )
        logger.info(
            "Cognito user signed up: email=%s, user_sub=%s, confirmed=%s",
            clean_email,
            response.get("UserSub"),
            response.get("UserConfirmed"),
        )
        return {
            "status": "CONFIRMATION_PENDING",
            "email": clean_email,
            "username": clean_username,
            "user_sub": response.get("UserSub"),
            "user_confirmed": response.get("UserConfirmed", False),
            "message": f"Код підтвердження надіслано на вашу пошту {clean_email}. Перевірте вхідні або папку спам.",
        }
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.warning("Cognito sign_up error: code=%s, msg=%s", error_code, error_msg)

        if error_code == "UsernameExistsException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Користувач із такою електронною поштою вже зареєстрований.",
            )
        elif error_code == "InvalidPasswordException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пароль має містити щонайменше 8 символів, цифри, а також великі та малі літери.",
            )
        elif error_code == "InvalidParameterException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Некоректні параметри: {error_msg}",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Помилка реєстрації в Cognito: {error_msg}",
            )


def confirm_cognito_registration(email: str, code: str) -> dict:
    """
    Confirms user registration using the 6-digit confirmation code received by email.
    """
    client = get_cognito_idp_client()
    clean_email = email.strip().lower()
    clean_code = code.strip()

    try:
        client.confirm_sign_up(
            ClientId=settings.COGNITO_USER_POOL_CLIENT_ID,
            Username=clean_email,
            ConfirmationCode=clean_code,
        )
        logger.info("Cognito user registration confirmed: email=%s", clean_email)
        return {
            "status": "CONFIRMED",
            "email": clean_email,
            "message": "Електронну пошту успішно підтверджено! Тепер ви можете увійти до системи.",
        }
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.warning("Cognito confirm_sign_up error: code=%s, msg=%s", error_code, error_msg)

        if error_code == "CodeMismatchException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Невірний код підтвердження. Перевірте лист на пошті та введіть код знову.",
            )
        elif error_code == "ExpiredCodeException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Термін дії коду підтвердження минув. Натисніть 'Надіслати код повторно'.",
            )
        elif error_code == "UserNotFoundException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача з такою поштою не знайдено.",
            )
        elif error_code == "NotAuthorizedException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Користувач уже підтверджений або не потребує підтвердження.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Помилка підтвердження: {error_msg}",
            )


def resend_cognito_code(email: str) -> dict:
    """
    Resends confirmation code to user's email.
    """
    client = get_cognito_idp_client()
    clean_email = email.strip().lower()

    try:
        client.resend_confirmation_code(
            ClientId=settings.COGNITO_USER_POOL_CLIENT_ID,
            Username=clean_email,
        )
        logger.info("Cognito confirmation code resent to: email=%s", clean_email)
        return {
            "status": "CODE_RESENT",
            "email": clean_email,
            "message": f"Новий код підтвердження надіслано на {clean_email}.",
        }
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.warning("Cognito resend_confirmation_code error: code=%s, msg=%s", error_code, error_msg)

        if error_code == "UserNotFoundException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Користувача з такою поштою не знайдено.",
            )
        elif error_code == "InvalidParameterException":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Користувач уже підтверджений.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Не вдалося надіслати код: {error_msg}",
            )


def login_cognito_password(email: str, password: str) -> dict:
    """
    Authenticates user with email and password via Cognito ADMIN_USER_PASSWORD_AUTH.
    Returns access token, id token, and user attributes.
    """
    client = get_cognito_idp_client()
    clean_email = email.strip().lower()

    try:
        auth_resp = client.admin_initiate_auth(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            ClientId=settings.COGNITO_USER_POOL_CLIENT_ID,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": clean_email,
                "PASSWORD": password,
            },
        )
        auth_result = auth_resp.get("AuthenticationResult", {})
        access_token = auth_result.get("AccessToken", "")
        id_token = auth_result.get("IdToken", "")

        # Fetch user attributes
        user_resp = client.admin_get_user(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Username=clean_email,
        )
        attrs = {a["Name"]: a["Value"] for a in user_resp.get("UserAttributes", [])}
        name = attrs.get("name") or attrs.get("preferred_username") or clean_email.split("@")[0]
        sub = attrs.get("sub", "")

        return {
            "email": clean_email,
            "name": name,
            "sub": sub,
            "access_token": access_token,
            "id_token": id_token,
        }
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_msg = e.response["Error"]["Message"]
        logger.warning("Cognito admin_initiate_auth error: code=%s, msg=%s", error_code, error_msg)

        if error_code == "UserNotConfirmedException":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Обліковий запис ще не підтверджено. Будь ласка, введіть код із листа.",
            )
        elif error_code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невірний email або пароль.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Помилка авторизації: {error_msg}",
            )
