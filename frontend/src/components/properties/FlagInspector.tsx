import React from "react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";
import { PositionInspector } from "./PositionInspector";

interface FlagInspectorProps {
  position: ElementPosition;
  opacity: number;
  badgeDimensions: BadgeDimensions;
  onChangePosition: (patch: Partial<ElementPosition>) => void;
  onChangeOpacity: (opacity: number) => void;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
}

export const FlagInspector: React.FC<FlagInspectorProps> = ({
  position,
  opacity,
  badgeDimensions,
  onChangePosition,
  onChangeOpacity,
  onLayerChange,
}) => {
  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800">
        <span className="font-bold">Vector SVG Flag:</span> Rendered natively from the competitor’s country code. Flags support position, dimensions, rotation, and opacity.
      </div>

      {/* Opacity Setting */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500">Opacity</label>
          <span className="text-[10px] font-mono text-slate-400">{Math.round(opacity * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => onChangeOpacity(parseFloat(e.target.value) || 0)}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => onChangeOpacity(parseFloat(e.target.value) || 0)}
            className="w-16 text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center"
          />
        </div>
      </div>

      {/* Position Settings */}
      <div className="border-t border-slate-100 pt-3">
        <PositionInspector
          position={position}
          badgeDimensions={badgeDimensions}
          onChangePosition={onChangePosition}
          onLayerChange={onLayerChange}
        />
      </div>
    </div>
  );
};
