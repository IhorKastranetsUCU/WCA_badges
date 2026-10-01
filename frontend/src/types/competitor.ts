export interface Competitor {
  id: string;
  csv_index: number;
  name_latin: string;
  name_local?: string | null;
  name_raw: string;
  wca_id?: string | null;
  country_iso2?: string | null;
  country_name?: string | null;
  role_id?: string | null;
  avatar_url?: string | null;
  registrant_id?: number | null;
  created_at?: string;
}

export interface RoleStyle {
  font_family: string;
  font_size: number;
  font_weight: string;
  italic: boolean;
  text_align: "left" | "center" | "right";
  text_color: string;
  background_color: string;
  border_radius: number;
  border_width: number;
  border_color: string;
  opacity: number;
}

export interface Role {
  id: string;
  name: string;
  is_default: boolean;
  style: RoleStyle;
  assigned_competitor_ids?: string[];
  created_at?: string;
}
