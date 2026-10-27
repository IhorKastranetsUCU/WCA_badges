import re
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64, description="User login / username")
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters)")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class UserConfirmRequest(BaseModel):
    email: str = Field(..., description="User email to confirm")
    code: str = Field(..., min_length=4, max_length=16, description="Verification confirmation code")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class UserResendCodeRequest(BaseModel):
    email: str = Field(..., description="User email to resend code to")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class UserLoginPasswordRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class AuthMessageResponse(BaseModel):
    status: str
    message: str
    email: str | None = None
