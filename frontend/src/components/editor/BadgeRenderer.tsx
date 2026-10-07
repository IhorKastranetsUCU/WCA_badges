import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { User } from "lucide-react";
import { BadgeDimensions, BadgeElement } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { CountryFlag } from "@/utils/svgFlags";
import { ScheduleTable } from "./ScheduleTable";

export interface BadgeRendererProps {
  dimensions: BadgeDimensions;
  elements: BadgeElement[];
  backgroundUrl?: string | null;
  competitor?: Competitor;
  role?: Role;
  rolesMap?: Map<string, Role>;
  scale: number; // Pixels per millimeter
  className?: string;
  style?: React.CSSProperties;
  isInteractive?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onStartDrag?: (elemId: string, e: React.MouseEvent) => void;
  onStartResize?: (elemId: string, handle: string, e: React.MouseEvent) => void;
  scheduleData?: any;
}

function getFittedFontSizePx(
  text: string,
  maxWidthPx: number,
  initialFontSizePx: number,
  fontFamily: string = "Inter",
  fontWeight: string = "600"
): number {
  if (!text || maxWidthPx <= 0 || initialFontSizePx <= 0) return initialFontSizePx;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return initialFontSizePx;
    let size = initialFontSizePx;
    ctx.font = `${fontWeight} ${size}px "${fontFamily}", sans-serif`;
    const measured = ctx.measureText(text).width;
    if (measured <= maxWidthPx) return size;
    const ratio = maxWidthPx / measured;
    return Math.max(6.0, size * ratio * 0.96);
  } catch {
    return initialFontSizePx;
  }
}

export const BadgeRenderer: React.FC<BadgeRendererProps> = ({
  dimensions,
  elements,
  backgroundUrl,
  competitor,
  role,
  rolesMap,
  scale,
  className = "",
  style: containerStyle = {},
  isInteractive = false,
  selectedElementId = null,
  onSelectElement,
  onStartDrag,
  onStartResize,
  scheduleData,
}) => {
  const badgeWidthPx = dimensions.width_mm * scale;
  const badgeHeightPx = dimensions.height_mm * scale;

  const compRole =
    role ||
    (competitor?.role_id && rolesMap ? rolesMap.get(competitor.role_id) : undefined);
  const roleName = compRole?.name || "Participant";
  const roleStyle = compRole?.style;

  return (
    <div
      style={{
        width: `${badgeWidthPx}px`,
        height: `${badgeHeightPx}px`,
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...containerStyle,
      }}
      onClick={(e) => {
        if (isInteractive && onSelectElement) {
          e.stopPropagation();
          onSelectElement(null);
        }
      }}
      className={`bg-white relative border border-slate-300 overflow-hidden select-none ${className}`}
    >
      {elements
        .filter((elem) => elem.enabled)
        .sort((a, b) => a.position.z_index - b.position.z_index)
        .map((elem) => {
          const isSelected = isInteractive && selectedElementId === elem.id;
          const pos = elem.position;
          const style = elem.style;

          const elemXPx = pos.x_mm * scale;
          const elemYPx = pos.y_mm * scale;
          const elemWPx = pos.width_mm * scale;
          const elemHPx = pos.height_mm * scale;

          // Content resolution
          let contentText = "";
          if (elem.type === "name") {
            if (elem.name_display === "local_only" && competitor?.name_local) {
              contentText = competitor.name_local;
            } else if (elem.name_display === "both" && competitor?.name_local) {
              contentText = `${competitor.name_latin} (${competitor.name_local})`;
            } else {
              contentText = competitor?.name_latin || "Participant Name";
            }
          } else if (elem.type === "wca_id") {
            const raw = competitor ? competitor.wca_id : "2024EXAM01";
            if (!raw || !raw.trim()) {
              // User requirement: Do not write "Newcomer", leave empty
              contentText = "";
            } else if (elem.format_mode === "prefix_label") {
              contentText = `WCA ID: ${raw}`;
            } else if (elem.format_mode === "custom") {
              contentText = `${elem.format_prefix || ""}${raw}${elem.format_suffix || ""}`;
            } else {
              contentText = raw;
            }
          } else if (elem.type === "competition_id") {
            const raw = String(competitor?.registrant_id ?? competitor?.csv_index ?? 1);
            if (elem.format_mode === "prefix_label") {
              contentText = `ID: ${raw}`;
            } else if (elem.format_mode === "custom") {
              contentText = `${elem.format_prefix || ""}${raw}${elem.format_suffix || ""}`;
            } else {
              contentText = raw;
            }
          } else if (elem.type === "role") {
            contentText = roleName;
          }

          if (style?.uppercase) {
            contentText = contentText.toUpperCase();
          }

          const textAlign =
            elem.type === "role"
              ? roleStyle?.text_align || "center"
              : style?.text_align || "center";

          // Precise font scaling: 1 point (pt) = (25.4 / 72) mm
          const rawFontSizePt =
            elem.type === "role"
              ? roleStyle?.font_size || 12
              : style?.font_size || 14;
          const fontSizePx = rawFontSizePt * (25.4 / 72) * scale;

          // Precise border radius scaling: border_radius_mm * scale
          const borderRadiusPx =
            elem.type === "role"
              ? `${(roleStyle?.border_radius ?? 4) * scale}px`
              : elem.type === "avatar"
              ? elem.border_radius_mm !== undefined
                ? `${elem.border_radius_mm * scale}px`
                : `${4 * scale}px`
              : style?.has_background
              ? `${(style.border_radius || 0) * scale}px`
              : undefined;

          // Precise padding: padding_mm * scale (fallback to 1.5mm for clean baseline)
          const padMm = style?.has_background
            ? style.padding_mm || 0
            : 1.5;
          const padPx = padMm * scale;

          // If non-interactive and data is absent, omit entirely (user requirement)
          if (elem.type === "wca_id" && !contentText.trim() && !isInteractive) {
            return null;
          }
          if (elem.type === "avatar" && !competitor?.avatar_url && !isInteractive) {
            return null;
          }

          return (
            <div
              key={elem.id}
              onClick={(e) => {
                if (isInteractive && onSelectElement) {
                  e.stopPropagation();
                  onSelectElement(elem.id);
                }
              }}
              onMouseDown={(e) => {
                if (isInteractive && onStartDrag) {
                  e.stopPropagation();
                  onStartDrag(elem.id, e);
                }
              }}
              style={{
                position: "absolute",
                left: `${elemXPx}px`,
                top: `${elemYPx}px`,
                width: `${elemWPx}px`,
                height: `${elemHPx}px`,
                transform: `rotate(${pos.rotation_deg}deg)`,
                zIndex: pos.z_index,
                opacity:
                  elem.type === "flag" ||
                  elem.type === "avatar" ||
                  elem.type === "qr_code" ||
                  elem.type === "schedule"
                    ? elem.opacity ?? 1.0
                    : style?.opacity ?? 1.0,
                backgroundColor:
                  elem.type === "role"
                    ? roleStyle?.background_color || "#2563EB"
                    : style?.has_background
                    ? style.background_color
                    : "transparent",
                borderRadius: borderRadiusPx,
                borderWidth:
                  elem.type === "avatar" && elem.border_width_mm
                    ? `${elem.border_width_mm * scale}px`
                    : style?.has_background && style.border_width > 0
                    ? `${style.border_width}px`
                    : undefined,
                borderColor:
                  elem.type === "avatar" && elem.border_color
                    ? elem.border_color
                    : style?.has_background
                    ? style.border_color
                    : undefined,
              }}
              className={`transition-shadow ${
                isInteractive
                  ? isSelected
                    ? "ring-2 ring-blue-500 ring-offset-1 cursor-move"
                    : "hover:ring-1 hover:ring-blue-300 cursor-move"
                  : "pointer-events-none"
              }`}
            >
              {elem.type === "flag" ? (
                <div className="w-full h-full pointer-events-none overflow-hidden">
                  <CountryFlag iso2={competitor?.country_iso2 || "UA"} opacity={elem.opacity} />
                </div>
              ) : elem.type === "avatar" ? (
                <div className="w-full h-full pointer-events-none overflow-hidden flex items-center justify-center rounded-[inherit]">
                  {competitor?.avatar_url ? (
                    <img
                      src={competitor.avatar_url}
                      alt={competitor.name_latin}
                      className="w-full h-full object-cover rounded-[inherit]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center w-full h-full border border-dashed border-slate-300 rounded-[inherit] bg-slate-50/70">
                      <User className="w-1/3 h-1/3 stroke-[1.5] text-slate-400" />
                      <span className="text-[8px] font-semibold text-slate-400 mt-0.5 truncate max-w-full px-1">
                        Photo slot
                      </span>
                    </div>
                  )}
                </div>
              ) : elem.type === "qr_code" ? (
                <div
                  style={{
                    backgroundColor: elem.qr_bg_color || "#FFFFFF",
                  }}
                  className="w-full h-full pointer-events-none flex flex-col items-center justify-center p-1 rounded shadow-sm border border-slate-200"
                >
                  {elem.qr_label && elem.qr_label_position !== "bottom" && (
                    <div
                      style={{
                        fontFamily: elem.qr_font_family || "Inter",
                        fontSize: elem.qr_font_size
                          ? `${elem.qr_font_size * (25.4 / 72) * scale}px`
                          : `${Math.max(6, Math.min(10, elemWPx * 0.11))}px`,
                        color: elem.qr_text_color || "#0F172A",
                      }}
                      className="font-bold tracking-wider text-center truncate mb-0.5 uppercase"
                    >
                      {elem.qr_label}
                    </div>
                  )}
                  <div className="flex-1 flex items-center justify-center w-full min-h-0">
                    <QRCodeSVG
                      value={
                        elem.qr_content ||
                        (competitor?.wca_id
                          ? `https://www.worldcubeassociation.org/persons/${competitor.wca_id}`
                          : "https://live.worldcubeassociation.org")
                      }
                      fgColor={elem.qr_color || "#000000"}
                      bgColor={elem.qr_bg_color || "#FFFFFF"}
                      size={Math.max(10, Math.min(elemWPx - 8, elemHPx - (elem.qr_label ? 16 : 8)))}
                      level="M"
                    />
                  </div>
                  {elem.qr_label && elem.qr_label_position === "bottom" && (
                    <div
                      style={{
                        fontFamily: elem.qr_font_family || "Inter",
                        fontSize: elem.qr_font_size
                          ? `${elem.qr_font_size * (25.4 / 72) * scale}px`
                          : `${Math.max(6, Math.min(10, elemWPx * 0.11))}px`,
                        color: elem.qr_text_color || "#0F172A",
                      }}
                      className="font-bold tracking-wider text-center truncate mt-0.5 uppercase"
                    >
                      {elem.qr_label}
                    </div>
                  )}
                </div>
              ) : elem.type === "schedule" ? (
                <div className="w-full h-full pointer-events-none">
                  <ScheduleTable
                    widthPx={elemWPx}
                    heightPx={elemHPx}
                    scale={scale}
                    competitor={competitor}
                    title={elem.schedule_title}
                    customData={elem.schedule_data || scheduleData}
                  />
                </div>
              ) : (
                (() => {
                  const fontFamily =
                    elem.type === "role"
                      ? roleStyle?.font_family || "Inter"
                      : style?.font_family || "Inter";
                  const fontWeight =
                    elem.type === "role"
                      ? roleStyle?.font_weight || "600"
                      : style?.font_weight || "600";
                  const maxTextW = Math.max(10, elemWPx - 2 * padPx);
                  const effectiveFontSizePx = getFittedFontSizePx(
                    contentText,
                    maxTextW,
                    fontSizePx,
                    fontFamily,
                    String(fontWeight)
                  );

                  return (
                    <div
                      style={{
                        fontFamily,
                        fontSize: `${effectiveFontSizePx}px`,
                        fontWeight,
                        fontStyle:
                          (elem.type === "role" ? roleStyle?.italic : style?.italic) ? "italic" : "normal",
                        color:
                          elem.type === "role"
                            ? roleStyle?.text_color || "#FFFFFF"
                            : style?.text_color || "#111827",
                        textAlign,
                        justifyContent:
                          textAlign === "left"
                            ? "flex-start"
                            : textAlign === "right"
                            ? "flex-end"
                            : "center",
                        letterSpacing: style?.letter_spacing_mm
                          ? `${style.letter_spacing_mm * scale}px`
                          : undefined,
                        paddingLeft: `${padPx}px`,
                        paddingRight: `${padPx}px`,
                        whiteSpace: "nowrap",
                      }}
                      className="w-full h-full flex items-center truncate pointer-events-none select-none"
                    >
                      {contentText}
                    </div>
                  );
                })()
              )}

              {/* Resize handles when selected */}
              {isSelected && onStartResize && (
                <>
                  {(["tl", "tr", "bl", "br"] as const).map((handle) => (
                    <div
                      key={handle}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onStartResize(elem.id, handle, e);
                      }}
                      className={`w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-sm absolute z-50 ${
                        handle === "tl"
                          ? "-top-1.5 -left-1.5 cursor-nwse-resize"
                          : handle === "tr"
                          ? "-top-1.5 -right-1.5 cursor-nesw-resize"
                          : handle === "bl"
                          ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                          : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                      }`}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
};
