import React, { useRef } from "react";
import { Upload, FileText, RefreshCw, CheckCircle2 } from "lucide-react";
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
  onUploadAssignmentsPdf?: (file: File) => void;
  isUploadingAssignments?: boolean;
  assignmentStatusMessage?: string | null;
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
  onUploadAssignmentsPdf,
  isUploadingAssignments = false,
  assignmentStatusMessage,
}) => {
  const pdfInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 select-none">
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">Scalable Schedule Grid:</span> Displays multi-day timetable with automatic task badges (<span className="text-blue-700 font-bold">C</span>: Compete [Blue], <span className="text-amber-700 font-bold">J</span>: Judge [Yellow], <span className="text-red-700 font-bold">S</span>: Scrambler [Red], <span className="text-emerald-700 font-bold">R</span>: Runner [Green]).
      </div>

      {/* Upload Groupifier Competitor Cards PDF */}
      {onUploadAssignmentsPdf && (
        <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Competitor Cards PDF</span>
            </span>
            <span className="text-[10px] bg-purple-200/80 text-purple-800 px-1.5 py-0.2 rounded font-bold">
              Groupifier
            </span>
          </div>
          <p className="text-[11px] text-purple-800 leading-snug">
            Upload the official competitor cards PDF to automatically parse roles (Comp, Judge, Scr, Runner) and assign them to each competitor's badge.
          </p>
          {assignmentStatusMessage && (
            <div className="text-[11px] font-bold text-purple-900 bg-purple-100/80 border border-purple-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{assignmentStatusMessage}</span>
            </div>
          )}
          <input
            type="file"
            ref={pdfInputRef}
            onChange={(e) => e.target.files?.[0] && onUploadAssignmentsPdf(e.target.files[0])}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            disabled={isUploadingAssignments}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploadingAssignments ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing PDF Cards...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{assignmentStatusMessage ? "Upload New Cards PDF (.pdf)" : "Upload Cards PDF (.pdf)"}</span>
              </>
            )}
          </button>
        </div>
      )}

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
