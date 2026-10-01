import React from "react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";
import { PositionInspector } from "./PositionInspector";

interface ScheduleInspectorProps {
  position: ElementPosition;
  opacity: number;
  scheduleTitle?: string;
  badgeDimensions: BadgeDimensions;
  onChangePosition: (patch: Partial<ElementPosition>) => void;
  onChangeOpacity: (opacity: number) => void;
  onChangeTitle: (title: string) => void;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
}

export const ScheduleInspector: React.FC<ScheduleInspectorProps> = ({
  position,
  opacity,
  scheduleTitle = "Competition Schedule & Assignments",
  badgeDimensions,
  onChangePosition,
  onChangeOpacity,
  onChangeTitle,
  onLayerChange,
}) => {
  return (
    <div className="space-y-4 select-none">
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">Scalable Schedule Grid:</span> Displays 4-column multi-day timetable with automatic task badges (<span className="text-rose-700 font-bold">C</span>: Compete, <span className="text-blue-700 font-bold">J</span>: Judge, <span className="text-amber-700 font-bold">S</span>: Scrambler, <span className="text-emerald-700 font-bold">R</span>: Runner). Resizes seamlessly to fit any badge dimensions.
      </div>

      {/* Schedule Table Header/Title */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Schedule Header Title</label>
        <input
          type="text"
          value={scheduleTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="e.g. Schedule & Assignments..."
          className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
        />
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
