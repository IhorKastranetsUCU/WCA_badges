export interface WCAProfile {
  id: number | string;
  wca_id?: string | null;
  name: string;
  avatar_url?: string | null;
  country_iso2: string;
  delegate_status?: string | null;
  is_delegate: boolean;
  is_organizer: boolean;
  email?: string | null;
  auth_provider?: "wca" | "google" | string;
  needs_wca_link?: boolean;
}

export interface WCACompetition {
  id: string;
  name: string;
  city: string;
  country_iso2: string;
  start_date: string;
  end_date: string;
  delegates: string[];
  organizers: string[];
  user_roles?: string[];
  is_delegate: boolean;
  is_organizer: boolean;
}

export interface WCARegistrationItem {
  id: string;
  user_id?: number | null;
  name_latin: string;
  name_local?: string | null;
  name_raw: string;
  wca_id?: string | null;
  country_iso2: string;
  country_name: string;
  status: "accepted" | "pending" | "deleted" | "rejected" | string;
  selected: boolean;
  competition_id: string;
  avatar_url?: string | null;
}

export interface WCARegistrationsCategorized {
  competition_id: string;
  competition_name: string;
  approved: WCARegistrationItem[];
  pending: WCARegistrationItem[];
  cancelled: WCARegistrationItem[];
  total_count: number;
}

export interface ManualCompetitorInput {
  name_latin: string;
  name_local?: string;
  wca_id?: string;
  country_iso2: string;
  country_name: string;
  role_id: string;
}
