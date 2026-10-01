import React from "react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";
import { PositionInspector } from "./PositionInspector";

interface AvatarInspectorProps {
  position: ElementPosition;
  opacity: number;
  borderRadiusMm?: number;
  borderWidthMm?: number;
  borderColor?: string;
  badgeDimensions: BadgeDimensions;
  onChangePosition: (patch: Partial<ElementPosition>) => void;
  onChangeOpacity: (opacity: number) => void;
  onChangeRadius: (radius: number) => void;
  onChangeBorder: (borderWidth: number, borderColor: string) => void;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
}

export const AvatarInspector: React.FC<AvatarInspectorProps> = ({
  position,
  opacity,
  borderRadiusMm = 4,
  borderWidthMm = 0,
  borderColor = "#cbd5e1",
  badgeDimensions,
  onChangePosition,
  onChangeOpacity,
  onChangeRadius,
  onChangeBorder,
  onLayerChange,
}) => {
  return (
    <div className="space-y-4 select-none">
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">WCA Competitor Photo:</span> Automatically loaded from each competitor's official WCA avatar. If an attendee has no photo on their WCA profile, a placeholder is rendered.
      </div>

      {/* Shape Presets */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">Corner Radius / Shape</label>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => onChangeRadius(0)}
            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              borderRadiusMm === 0
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Square
          </button>
          <button
            type="button"
            onClick={() => onChangeRadius(3)}
            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              borderRadiusMm > 0 && borderRadiusMm < 15
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Rounded
          </button>
          <button
            type="button"
            onClick={() => onChangeRadius(50)}
            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              borderRadiusMm >= 15
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Circular
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={borderRadiusMm}
            onChange={(e) => onChangeRadius(parseFloat(e.target.value) || 0)}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-600 w-12 text-right">{borderRadiusMm} mm</span>
        </div>
      </div>

      {/* Border Options */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Border Width</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={borderWidthMm}
            onChange={(e) => onChangeBorder(parseFloat(e.target.value) || 0, borderColor)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Border Color</label>
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <input
              type="color"
              value={borderColor}
              onChange={(e) => onChangeBorder(borderWidthMm, e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0"
            />
            <span className="text-[11px] font-mono uppercase text-slate-600">{borderColor}</span>
          </div>
        </div>
      </div>

      {/* Opacity */}
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
          <span className="text-xs font-mono text-slate-600 w-12 text-right">{Math.round(opacity * 100)}%</span>
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
