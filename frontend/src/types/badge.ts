export type ElementType = "name" | "wca_id" | "flag" | "competition_id" | "role" | "avatar" | "qr_code" | "schedule";

export type NameDisplayMode = "latin_only" | "local_only" | "both";
export type FormatMode = "raw" | "prefix_label" | "custom";
export type BadgePreset = "A6" | "100x70" | "90x70" | "Custom";

export interface ElementPosition {
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
  rotation_deg: number;
  z_index: number;
}

export interface ElementStyle {
  font_family: string;
  font_size: number;
  font_weight: string;
  italic: boolean;
  uppercase: boolean;
  text_align: "left" | "center" | "right";
  letter_spacing_mm: number;
  text_color: string;
  has_background: boolean;
  background_color: string;
  border_radius: number;
  border_width: number;
  border_color: string;
  opacity: number;
  padding_mm: number;
}

export interface BadgeElement {
  id: string;
  type: ElementType;
  enabled: boolean;
  position: ElementPosition;
  style?: ElementStyle;
  name_display?: NameDisplayMode;
  format_mode?: FormatMode;
  format_prefix?: string;
  format_suffix?: string;
  opacity?: number;
  border_radius_mm?: number;
  border_width_mm?: number;
  border_color?: string;
  qr_content?: string;
  qr_label?: string;
  qr_label_position?: "top" | "bottom" | "none";
  qr_color?: string;
  qr_bg_color?: string;
  qr_font_family?: string;
  qr_font_size?: number;
  qr_text_color?: string;
  schedule_title?: string;
  schedule_data?: any;
}

export interface BadgeDimensions {
  preset: BadgePreset;
  width_mm: number;
  height_mm: number;
}

export interface BadgeSideConfig {
  background_url: string | null;
  elements: BadgeElement[];
}

export interface BadgeSides {
  front: BadgeSideConfig;
  back: BadgeSideConfig;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  is_active: boolean;
  dimensions: BadgeDimensions;
  sides: BadgeSides;
}

export const SUPPORTED_FONT_FAMILIES = [
  "Inter",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Oswald",
  "Playfair Display",
  "JetBrains Mono",
  "Georgia",
  "DejaVu Sans",
  "Impact",
  "Arial",
] as const;

export type SupportedFontFamily = (typeof SUPPORTED_FONT_FAMILIES)[number];

export interface SuggestedBrandPalette {
  primary_font_family: string;
  secondary_font_family: string;
  primary_text_color: string;
  secondary_text_color: string;
  accent_color: string;
  sampled_swatches?: string[];
}

export interface SuggestedRoleStyle {
  background_color: string;
  text_color: string;
  font_family: string;
  font_weight: string;
  font_size: number;
  italic?: boolean;
  border_radius: number;
  border_width?: number;
  border_color?: string | null;
}

export interface SuggestedElementPlacement {
  id: string;
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
  z_index?: number;
  font_family?: string | null;
  font_weight?: string | null;
  font_size?: number | null;
  italic?: boolean | null;
  uppercase?: boolean | null;
  letter_spacing_mm?: number | null;
  text_align?: "left" | "center" | "right" | null;
  text_color?: string | null;
  has_background?: boolean | null;
  background_color?: string | null;
  border_radius?: number | null;
  border_width?: number | null;
  border_color?: string | null;
  qr_color?: string | null;
  qr_bg_color?: string | null;
  qr_text_color?: string | null;
  reasoning?: string | null;
}

export interface BadgeLayoutSuggestion {
  detected_theme: "light" | "dark" | "mixed";
  visual_style?: string | null;
  palette?: SuggestedBrandPalette | null;
  role_style?: SuggestedRoleStyle | null;
  layout_summary: string;
  elements: SuggestedElementPlacement[];
  warnings?: string[];
}

export interface BadgeLayoutResponse {
  suggestion: BadgeLayoutSuggestion;
  model: string;
  prompt_version: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  cost_usd: number;
  latency_ms: number;
}
