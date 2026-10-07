import React, { useRef } from "react";
import { Upload, Trash2, RefreshCw, User, Image as ImageIcon } from "lucide-react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";
import { Competitor } from "@/types/competitor";
import { PositionInspector } from "./PositionInspector";

interface AvatarInspectorProps {
  position: ElementPosition;
  opacity: number;
  borderRadiusMm?: number;
  borderWidthMm?: number;
  borderColor?: string;
  badgeDimensions: BadgeDimensions;
  currentCompetitor?: Competitor;
  onUploadPhoto?: (file: File) => void;
  onRemovePhoto?: () => void;
  onFetchWcaAvatar?: () => void;
  isFetchingAvatar?: boolean;
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
  currentCompetitor,
  onUploadPhoto,
  onRemovePhoto,
  onFetchWcaAvatar,
  isFetchingAvatar = false,
  onChangePosition,
  onChangeOpacity,
  onChangeRadius,
  onChangeBorder,
  onLayerChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 select-none">
      {/* Competitor Photo Management Card */}
      {currentCompetitor && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Current Attendee</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentCompetitor.wca_id || "No WCA ID"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {currentCompetitor.avatar_url ? (
                <img
                  src={currentCompetitor.avatar_url}
                  alt={currentCompetitor.name_latin}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentCompetitor.name_latin}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {currentCompetitor.avatar_url
                  ? "Photo ready for badge"
                  : "No photo (badge space left blank)"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadPhoto) {
                  onUploadPhoto(file);
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {currentCompetitor.avatar_url ? "Change Photo" : "Upload Photo"}
            </button>

            {currentCompetitor.avatar_url && onRemovePhoto && (
              <button
                type="button"
                onClick={onRemovePhoto}
                title="Remove photo"
                className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {currentCompetitor.wca_id && onFetchWcaAvatar && (
              <button
                type="button"
                onClick={onFetchWcaAvatar}
                disabled={isFetchingAvatar}
                title="Fetch / Refresh from WCA"
                className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAvatar ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">WCA Competitor Photo:</span> Automatically loaded from each competitor's official WCA avatar. If an attendee has no photo on their WCA profile, the badge is left cleanly without photo. You can also upload custom photos for any participant (JPG, PNG, WEBP, etc.).
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
