from pydantic import BaseModel


class WCAProfile(BaseModel):
    id: int | str = 1
    wca_id: str | None = None
    name: str
    avatar_url: str | None = None
    country_iso2: str = "UA"
    delegate_status: str | None = None  # "delegate", "candidate_delegate", "senior_delegate", None
    is_delegate: bool = False
    is_organizer: bool = True
    email: str | None = None
    auth_provider: str | None = "wca"  # "wca" or "google"
    needs_wca_link: bool | None = False


class WCACompetition(BaseModel):
    id: str
    name: str
    city: str
    country_iso2: str
    start_date: str
    end_date: str
    delegates: list[str] = []
    organizers: list[str] = []
    user_roles: list[str] = []  # ["Delegate"], ["Organizer"], or ["Delegate", "Organizer"]
    is_delegate: bool = False
    is_organizer: bool = False


class WCARegistrationItem(BaseModel):
    id: str
    user_id: int | None = None
    name_latin: str
    name_local: str | None = None
    name_raw: str
    wca_id: str | None = None
    country_iso2: str
    country_name: str
    status: str  # "accepted", "pending", "deleted", "rejected"
    selected: bool = True
    competition_id: str
    avatar_url: str | None = None


class WCARegistrationsCategorized(BaseModel):
    competition_id: str
    competition_name: str
    approved: list[WCARegistrationItem]
    pending: list[WCARegistrationItem]
    cancelled: list[WCARegistrationItem]
    total_count: int


class WCAImportRequest(BaseModel):
    competition_id: str
    selected_registrations: list[WCARegistrationItem]


class WCAOAuthUrlResponse(BaseModel):
    authorization_url: str
    client_id: str
    redirect_uri: str


class WCAOAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str | None = None


class WCATokenLoginRequest(BaseModel):
    token: str | None = None
    demo_role: str | None = None  # "delegate", "organizer", "both"


class WCAAuthResponse(BaseModel):
    access_token: str
    profile: WCAProfile
    competitions: list[WCACompetition]
    provider: str | None = "wca"  # "wca" or "google"
    needs_wca_link: bool | None = False


class GoogleAuthUrlResponse(BaseModel):
    authorization_url: str
    client_id: str
    redirect_uri: str
    provider: str = "google"
    cognito_url: str | None = None


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str | None = None
    wca_id: str | None = None


class LinkWcaRequest(BaseModel):
    user_email: str
    wca_id: str | None = None
    wca_code: str | None = None
    redirect_uri: str | None = None
    wca_token: str | None = None


class ManualCompetitorCreate(BaseModel):
    name_latin: str
    name_local: str | None = None
    wca_id: str | None = None
    country_iso2: str = "UA"
    country_name: str = "Ukraine"
    role_id: str | None = "r-participant"
    custom_role_name: str | None = None
    avatar_url: str | None = None
