import React, { useRef, useState, useEffect } from "react";
import { BadgeDimensions, BadgeElement } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { BadgeRenderer } from "./BadgeRenderer";

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
      <div className="absolute top-6 left-8 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-300/80 shadow-sm text-xs font-bold text-slate-700">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span>
          {dimensions.width_mm.toFixed(1)} mm × {dimensions.height_mm.toFixed(1)} mm
        </span>
        <span className="text-[10px] text-slate-400 font-mono">({Math.round(scale)} px/mm)</span>
      </div>

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
