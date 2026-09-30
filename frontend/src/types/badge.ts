export type ElementType = "name" | "wca_id" | "flag" | "competition_id" | "role";

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
