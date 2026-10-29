import React, { useRef, useState, useEffect } from "react";
import { Sparkles, RotateCcw, Save, Check, X } from "lucide-react";
import { BadgeDimensions, BadgeElement } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { BadgeRenderer } from "./BadgeRenderer";

export interface AiLayoutBannerMeta {
  summary: string;
  model: string;
  latencyMs: number;
  costUsd: number;
  visualStyle?: string | null;
  primaryFont?: string | null;
  secondaryFont?: string | null;
  swatches?: string[];
  saved?: boolean;
}

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
  scheduleData?: any;
  aiSuggestedElementIds?: Set<string>;
  aiLayoutMeta?: AiLayoutBannerMeta | null;
  onUndoAiLayout?: () => void;
  onSaveAiLayout?: () => void;
  onDismissAiLayout?: () => void;
  isSavingLayout?: boolean;
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
  scheduleData,
  aiSuggestedElementIds,
  aiLayoutMeta,
  onUndoAiLayout,
  onSaveAiLayout,
  onDismissAiLayout,
  isSavingLayout = false,
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

  return (
    <main
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className="flex-1 bg-slate-200/70 h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden select-none p-6"
    >
      {/* Dimension Label in Top-Left Corner */}
      <div className="absolute top-6 left-8 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-300/80 shadow-sm text-xs font-bold text-slate-700 z-20">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span>
          {dimensions.width_mm.toFixed(1)} mm × {dimensions.height_mm.toFixed(1)} mm
        </span>
        <span className="text-[10px] text-slate-400 font-mono">({Math.round(scale)} px/mm)</span>
      </div>

      {/* Floating Human-in-the-Loop AI Layout Review Banner */}
      {aiLayoutMeta && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-5 right-8 max-w-md bg-white/95 backdrop-blur-md border border-violet-200 rounded-xl shadow-lg px-3.5 py-2.5 z-20 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
              <span>AI Auto-Layout пропозиція</span>
              <span className="text-[10px] font-mono font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {aiLayoutMeta.model} • {(aiLayoutMeta.latencyMs / 1000).toFixed(1)}s • $
                {aiLayoutMeta.costUsd.toFixed(5)}
              </span>
            </div>
            {onDismissAiLayout && (
              <button
                type="button"
                onClick={onDismissAiLayout}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-600 leading-snug">{aiLayoutMeta.summary}</p>

          {(aiLayoutMeta.primaryFont || (aiLayoutMeta.swatches && aiLayoutMeta.swatches.length > 0)) && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
              {aiLayoutMeta.primaryFont && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-700">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">Шрифт:</span>
                  <span
                    style={{ fontFamily: `"${aiLayoutMeta.primaryFont}", sans-serif` }}
                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-800 shadow-2xs"
                  >
                    Aa {aiLayoutMeta.primaryFont}
                  </span>
                  {aiLayoutMeta.secondaryFont && aiLayoutMeta.secondaryFont !== aiLayoutMeta.primaryFont && (
                    <span
                      style={{ fontFamily: `"${aiLayoutMeta.secondaryFont}", sans-serif` }}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-600"
                    >
                      {aiLayoutMeta.secondaryFont}
                    </span>
                  )}
                </div>
              )}

              {aiLayoutMeta.swatches && aiLayoutMeta.swatches.length > 0 && (
                <div className="flex items-center gap-1" title="Підібрана кольорова палітра з шаблону">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
                    Палітра:
                  </span>
                  {aiLayoutMeta.swatches.slice(0, 6).map((hex) => (
                    <span
                      key={hex}
                      title={hex}
                      style={{ backgroundColor: hex }}
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[10px] text-slate-400">
              Перевірте або підсуньте елементи мишкою перед збереженням
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {onUndoAiLayout && (
                <button
                  type="button"
                  onClick={onUndoAiLayout}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              {onSaveAiLayout && (
                <button
                  type="button"
                  disabled={isSavingLayout || aiLayoutMeta.saved}
                  onClick={onSaveAiLayout}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    aiLayoutMeta.saved
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                  }`}
                >
                  {aiLayoutMeta.saved ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      <span>{isSavingLayout ? "Saving..." : "Save Layout"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Badge Outline / Canvas with synchronized BadgeRenderer */}
      <BadgeRenderer
        dimensions={dimensions}
        elements={elements}
        backgroundUrl={backgroundUrl}
        competitor={currentCompetitor}
        rolesMap={rolesMap}
        scale={scale}
        isInteractive={true}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
        scheduleData={scheduleData}
        aiSuggestedElementIds={aiSuggestedElementIds}
        onStartDrag={(elemId, e) => {
          const el = elements.find((x) => x.id === elemId);
          if (!el) return;
          setInteractionState({
            mode: "drag",
            elementId: elemId,
            startX: e.clientX,
            startY: e.clientY,
            origX: el.position.x_mm,
            origY: el.position.y_mm,
            origW: el.position.width_mm,
            origH: el.position.height_mm,
          });
        }}
        onStartResize={(elemId, handle, e) => {
          const el = elements.find((x) => x.id === elemId);
          if (!el) return;
          setInteractionState({
            mode: "resize",
            elementId: elemId,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            origX: el.position.x_mm,
            origY: el.position.y_mm,
            origW: el.position.width_mm,
            origH: el.position.height_mm,
          });
        }}
        className="rounded-lg shadow-2xl border-2 border-slate-300 transition-all duration-200"
      />
    </main>
  );
};
