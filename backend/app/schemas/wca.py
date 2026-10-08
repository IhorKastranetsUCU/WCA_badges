from typing import Any, List, Optional, Union
from pydantic import BaseModel


class WCAProfile(BaseModel):
    id: Union[int, str] = 1
    wca_id: Optional[str] = None
    name: str
    avatar_url: Optional[str] = None
    country_iso2: str = "UA"
    delegate_status: Optional[str] = None  # "delegate", "candidate_delegate", "senior_delegate", None
    is_delegate: bool = False
    is_organizer: bool = True
    email: Optional[str] = None
    auth_provider: Optional[str] = "wca"  # "wca" or "google"
    needs_wca_link: Optional[bool] = False


class WCACompetition(BaseModel):
    id: str
    name: str
    city: str
    country_iso2: str
    start_date: str
    end_date: str
    delegates: List[str] = []
    organizers: List[str] = []
    user_roles: List[str] = []  # ["Delegate"], ["Organizer"], or ["Delegate", "Organizer"]
    is_delegate: bool = False
    is_organizer: bool = False


class WCARegistrationItem(BaseModel):
    id: str
    user_id: Optional[int] = None
    name_latin: str
    name_local: Optional[str] = None
    name_raw: str
    wca_id: Optional[str] = None
    country_iso2: str
    country_name: str
    status: str  # "accepted", "pending", "deleted", "rejected"
    selected: bool = True
    competition_id: str
    avatar_url: Optional[str] = None


class WCARegistrationsCategorized(BaseModel):
    competition_id: str
    competition_name: str
    approved: List[WCARegistrationItem]
    pending: List[WCARegistrationItem]
    cancelled: List[WCARegistrationItem]
    total_count: int


class WCAImportRequest(BaseModel):
    competition_id: str
    selected_registrations: List[WCARegistrationItem]


class WCAOAuthUrlResponse(BaseModel):
    authorization_url: str
    client_id: str
    redirect_uri: str


class WCAOAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class WCATokenLoginRequest(BaseModel):
    token: Optional[str] = None
    demo_role: Optional[str] = None  # "delegate", "organizer", "both"


class WCAAuthResponse(BaseModel):
    access_token: str
    profile: WCAProfile
    competitions: List[WCACompetition]
    provider: Optional[str] = "wca"  # "wca" or "google"
    needs_wca_link: Optional[bool] = False


class GoogleAuthUrlResponse(BaseModel):
    authorization_url: str
    client_id: str
    redirect_uri: str
    provider: str = "google"
    cognito_url: Optional[str] = None


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    wca_id: Optional[str] = None


class LinkWcaRequest(BaseModel):
    user_email: str
    wca_id: Optional[str] = None
    wca_code: Optional[str] = None
    redirect_uri: Optional[str] = None
    wca_token: Optional[str] = None


class ManualCompetitorCreate(BaseModel):
    name_latin: str
    name_local: Optional[str] = None
    wca_id: Optional[str] = None
    country_iso2: str = "UA"
    country_name: str = "Ukraine"
    role_id: Optional[str] = "r-participant"
    custom_role_name: Optional[str] = None
    avatar_url: Optional[str] = None
