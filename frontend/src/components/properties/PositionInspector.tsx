import React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";

interface PositionInspectorProps {
  position: ElementPosition;
  badgeDimensions: BadgeDimensions;
  onChangePosition: (patch: Partial<ElementPosition>) => void;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
}

export const PositionInspector: React.FC<PositionInspectorProps> = ({
  position,
  badgeDimensions,
  onChangePosition,
  onLayerChange,
}) => {
  const handleAlignHorizontal = (align: "left" | "center" | "right") => {
    let x = 0;
    if (align === "left") x = 0;
    else if (align === "center") x = (badgeDimensions.width_mm - position.width_mm) / 2;
    else if (align === "right") x = badgeDimensions.width_mm - position.width_mm;
    onChangePosition({ x_mm: parseFloat(x.toFixed(1)) });
  };

  const handleAlignVertical = (align: "top" | "center" | "bottom") => {
    let y = 0;
    if (align === "top") y = 0;
    else if (align === "center") y = (badgeDimensions.height_mm - position.height_mm) / 2;
    else if (align === "bottom") y = badgeDimensions.height_mm - position.height_mm;
    onChangePosition({ y_mm: parseFloat(y.toFixed(1)) });
  };

  return (
    <div className="space-y-4">
      {/* 1. X & Y Coordinates in mm (0.1 precision) */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Position (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">X</span>
            <input
              type="number"
              step="0.1"
              value={position.x_mm}
              onChange={(e) => onChangePosition({ x_mm: parseFloat(e.target.value) || 0 })}
              className="w-full text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">Y</span>
            <input
              type="number"
              step="0.1"
              value={position.y_mm}
              onChange={(e) => onChangePosition({ y_mm: parseFloat(e.target.value) || 0 })}
              className="w-full text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Alignment Buttons: Horizontal & Vertical */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Align to Badge</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              title="Align Left"
              onClick={() => handleAlignHorizontal("left")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Align Center (H)"
              onClick={() => handleAlignHorizontal("center")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Align Right"
              onClick={() => handleAlignHorizontal("right")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              title="Align Top"
              onClick={() => handleAlignVertical("top")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignStartVertical className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Align Center (V)"
              onClick={() => handleAlignVertical("center")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignCenterVertical className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Align Bottom"
              onClick={() => handleAlignVertical("bottom")}
              className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
            >
              <AlignEndVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Width & Height (0.1 mm precision) */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Dimensions (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">W</span>
            <input
              type="number"
              step="0.1"
              min="5"
              value={position.width_mm}
              onChange={(e) => onChangePosition({ width_mm: parseFloat(e.target.value) || 10 })}
              className="w-full text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">H</span>
            <input
              type="number"
              step="0.1"
              min="3"
              value={position.height_mm}
              onChange={(e) => onChangePosition({ height_mm: parseFloat(e.target.value) || 5 })}
              className="w-full text-xs font-mono bg-transparent text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Rotation Slider & Numeric Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500">Rotation</label>
          <span className="text-[10px] font-mono text-slate-400">{Math.round(position.rotation_deg)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="360"
            value={position.rotation_deg}
            onChange={(e) => onChangePosition({ rotation_deg: parseFloat(e.target.value) || 0 })}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="360"
            value={position.rotation_deg}
            onChange={(e) => onChangePosition({ rotation_deg: parseFloat(e.target.value) || 0 })}
            className="w-16 text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center"
          />
        </div>
      </div>

      {/* 5. Layer Positioning Controls */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Layer Ordering</label>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            title="Bring to Front"
            onClick={() => onLayerChange("bring_to_front")}
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <BringToFront className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Bring Forward"
            onClick={() => onLayerChange("move_up")}
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Send Backward"
            onClick={() => onLayerChange("move_down")}
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Send to Back"
            onClick={() => onLayerChange("send_to_back")}
            className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <SendToBack className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
