import React, { useRef, useState, useEffect } from "react";
import { BadgeDimensions, BadgeElement } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { CountryFlag } from "@/utils/svgFlags";

interface CanvasProps {
  dimensions: BadgeDimensions;
  elements: BadgeElement[];
  backgroundUrl: string | null;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElementPosition: (id: string, patch: { x_mm: number; y_mm: number; width_mm: number; height_mm: number }) => void;
  onDeleteElement: (id: string) => void;
  currentCompetitor?: Competitor;
  roles: Role[];
}

export const Canvas: React.FC<CanvasProps> = ({
  dimensions,
  elements,
  backgroundUrl,
  selectedElementId,
  onSelectElement,
  onUpdateElementPosition,
  onDeleteElement,
  currentCompetitor,
  roles,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(4.2); // Pixels per millimeter

  // Dragging and resizing interaction state
  const [interactionState, setInteractionState] = useState<{
    mode: "idle" | "drag" | "resize";
    elementId: string;
    handle?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({ mode: "idle", elementId: "", startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 });

  // Compute responsive canvas scale so badge fits gracefully in viewport
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const margin = 100;
      const maxAvailableW = Math.max(200, clientWidth - margin);
      const maxAvailableH = Math.max(200, clientHeight - margin);

      const scaleW = maxAvailableW / dimensions.width_mm;
      const scaleH = maxAvailableH / dimensions.height_mm;
      const fitScale = Math.min(scaleW, scaleH, 6.0); // max 6px/mm
      setScale(Math.max(2.5, fitScale));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [dimensions.width_mm, dimensions.height_mm]);

  // Pixel measurements
  const badgeWidthPx = dimensions.width_mm * scale;
  const badgeHeightPx = dimensions.height_mm * scale;

  // Global mouse move and mouse up listeners for smooth Figma-like manipulation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (interactionState.mode === "idle") return;

      const deltaXmm = (e.clientX - interactionState.startX) / scale;
      const deltaYmm = (e.clientY - interactionState.startY) / scale;

      if (interactionState.mode === "drag") {
        let newX = interactionState.origX + deltaXmm;
        let newY = interactionState.origY + deltaYmm;

        // Clamp inside badge area
        newX = Math.max(0, Math.min(dimensions.width_mm - interactionState.origW, newX));
        newY = Math.max(0, Math.min(dimensions.height_mm - interactionState.origH, newY));

        onUpdateElementPosition(interactionState.elementId, {
          x_mm: parseFloat(newX.toFixed(1)),
          y_mm: parseFloat(newY.toFixed(1)),
          width_mm: interactionState.origW,
          height_mm: interactionState.origH,
        });
      } else if (interactionState.mode === "resize" && interactionState.handle) {
        let newX = interactionState.origX;
        let newY = interactionState.origY;
        let newW = interactionState.origW;
        let newH = interactionState.origH;

        if (interactionState.handle.includes("r")) {
          newW = Math.max(10, Math.min(dimensions.width_mm - newX, interactionState.origW + deltaXmm));
        }
        if (interactionState.handle.includes("b")) {
          newH = Math.max(5, Math.min(dimensions.height_mm - newY, interactionState.origH + deltaYmm));
        }
        if (interactionState.handle.includes("l")) {
          const possibleW = interactionState.origW - deltaXmm;
          if (possibleW >= 10 && interactionState.origX + deltaXmm >= 0) {
            newX = interactionState.origX + deltaXmm;
            newW = possibleW;
          }
        }
        if (interactionState.handle.includes("t")) {
          const possibleH = interactionState.origH - deltaYmm;
          if (possibleH >= 5 && interactionState.origY + deltaYmm >= 0) {
            newY = interactionState.origY + deltaYmm;
            newH = possibleH;
          }
        }

        onUpdateElementPosition(interactionState.elementId, {
          x_mm: parseFloat(newX.toFixed(1)),
          y_mm: parseFloat(newY.toFixed(1)),
          width_mm: parseFloat(newW.toFixed(1)),
          height_mm: parseFloat(newH.toFixed(1)),
        });
      }
    };

    const handleMouseUp = () => {
      if (interactionState.mode !== "idle") {
        setInteractionState((prev) => ({ ...prev, mode: "idle" }));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [interactionState, scale, dimensions.width_mm, dimensions.height_mm, onUpdateElementPosition]);

  // Keyboard shortcut: Delete or Backspace to "throw the piece"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        // Prevent deleting while typing in an input field
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
        e.preventDefault();
        onDeleteElement(selectedElementId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, onDeleteElement]);

  const rolesMap = new Map(roles.map((r) => [r.id, r]));
  const compRole = currentCompetitor?.role_id ? rolesMap.get(currentCompetitor.role_id) : roles[0];
  const roleName = compRole?.name || "Participant";

  return (
    <main
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className="flex-1 bg-slate-200/70 h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden select-none p-6"
    >
      {/* Dimension Label in Top-Left Corner */}
      <div className="absolute top-6 left-8 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-300/80 shadow-sm text-xs font-bold text-slate-700">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span>
          {dimensions.width_mm.toFixed(1)} mm × {dimensions.height_mm.toFixed(1)} mm
        </span>
        <span className="text-[10px] text-slate-400 font-mono">({Math.round(scale)} px/mm)</span>
      </div>

      {/* Main Badge Outline / Canvas */}
      <div
        style={{
          width: `${badgeWidthPx}px`,
          height: `${badgeHeightPx}px`,
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl relative border-2 border-slate-300 overflow-hidden transition-all duration-200"
      >
        {/* Render Enabled Elements */}
        {elements
          .filter((elem) => elem.enabled)
          .sort((a, b) => a.position.z_index - b.position.z_index)
          .map((elem) => {
            const isSelected = selectedElementId === elem.id;
            const pos = elem.position;
            const style = elem.style;

            const elemXPx = pos.x_mm * scale;
            const elemYPx = pos.y_mm * scale;
            const elemWPx = pos.width_mm * scale;
            const elemHPx = pos.height_mm * scale;

            // Content generator
            let contentText = "";
            if (elem.type === "name") {
              if (elem.name_display === "local_only" && currentCompetitor?.name_local) {
                contentText = currentCompetitor.name_local;
              } else if (elem.name_display === "both" && currentCompetitor?.name_local) {
                contentText = `${currentCompetitor.name_latin} (${currentCompetitor.name_local})`;
              } else {
                contentText = currentCompetitor?.name_latin || "Participant Name";
              }
            } else if (elem.type === "wca_id") {
              const raw = currentCompetitor?.wca_id || "2024EXAM01";
              if (elem.format_mode === "prefix_label") {
                contentText = `WCA ID: ${raw}`;
              } else if (elem.format_mode === "custom") {
                contentText = `${elem.format_prefix || ""}${raw}${elem.format_suffix || ""}`;
              } else {
                contentText = raw;
              }
            } else if (elem.type === "competition_id") {
              const raw = String(currentCompetitor?.csv_index || 1);
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

            return (
              <div
                key={elem.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(elem.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectElement(elem.id);
                  setInteractionState({
                    mode: "drag",
                    elementId: elem.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: pos.x_mm,
                    origY: pos.y_mm,
                    origW: pos.width_mm,
                    origH: pos.height_mm,
                  });
                }}
                style={{
                  position: "absolute",
                  left: `${elemXPx}px`,
                  top: `${elemYPx}px`,
                  width: `${elemWPx}px`,
                  height: `${elemHPx}px`,
                  transform: `rotate(${pos.rotation_deg}deg)`,
                  zIndex: pos.z_index,
                  opacity: elem.type === "flag" ? elem.opacity : style?.opacity ?? 1.0,
                  backgroundColor:
                    elem.type === "role"
                      ? compRole?.style.background_color || "#2563EB"
                      : style?.has_background
                      ? style.background_color
                      : "transparent",
                  borderRadius:
                    elem.type === "role"
                      ? `${(compRole?.style.border_radius || 4) * scale * 0.25}px`
                      : style?.has_background
                      ? `${style.border_radius * scale * 0.25}px`
                      : undefined,
                  borderWidth: style?.has_background && style.border_width > 0 ? `${style.border_width}px` : undefined,
                  borderColor: style?.has_background ? style.border_color : undefined,
                  padding: style?.has_background ? `${style.padding_mm * scale * 0.25}px` : undefined,
                }}
                className={`group cursor-move transition-shadow ${
                  isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:ring-1 hover:ring-blue-300"
                }`}
              >
                {/* Element Content */}
                {elem.type === "flag" ? (
                  <div className="w-full h-full pointer-events-none">
                    <CountryFlag iso2={currentCompetitor?.country_iso2 || "UA"} opacity={elem.opacity} />
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily:
                        elem.type === "role"
                          ? compRole?.style.font_family || "Inter"
                          : style?.font_family || "Inter",
                      fontSize: `${
                        (elem.type === "role" ? compRole?.style.font_size || 12 : style?.font_size || 14) *
                        (scale / 4.0)
                      }px`,
                      fontWeight:
                        elem.type === "role"
                          ? compRole?.style.font_weight || "600"
                          : style?.font_weight || "600",
                      fontStyle:
                        (elem.type === "role" ? compRole?.style.italic : style?.italic) ? "italic" : "normal",
                      color:
                        elem.type === "role"
                          ? compRole?.style.text_color || "#FFFFFF"
                          : style?.text_color || "#111827",
                      textAlign:
                        elem.type === "role"
                          ? compRole?.style.text_align || "center"
                          : style?.text_align || "center",
                      letterSpacing: style?.letter_spacing_mm ? `${style.letter_spacing_mm * scale}px` : undefined,
                    }}
                    className="w-full h-full flex items-center justify-center truncate pointer-events-none select-none px-1"
                  >
                    {contentText}
                  </div>
                )}

                {/* Figma-like Resize Handles when selected */}
                {isSelected && (
                  <>
                    {(["tl", "tr", "bl", "br"] as const).map((handle) => (
                      <div
                        key={handle}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setInteractionState({
                            mode: "resize",
                            elementId: elem.id,
                            handle,
                            startX: e.clientX,
                            startY: e.clientY,
                            origX: pos.x_mm,
                            origY: pos.y_mm,
                            origW: pos.width_mm,
                            origH: pos.height_mm,
                          });
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
    </main>
  );
};
