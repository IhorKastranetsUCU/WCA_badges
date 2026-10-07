import React from "react";
import { Plus, QrCode } from "lucide-react";
import { BadgeDimensions, ElementPosition } from "@/types/badge";
import { PositionInspector } from "./PositionInspector";

interface QrCodeInspectorProps {
  position: ElementPosition;
  opacity: number;
  qrContent?: string;
  qrLabel?: string;
  qrLabelPosition?: "top" | "bottom" | "none";
  qrColor?: string;
  qrBgColor?: string;
  qrFontFamily?: string;
  qrFontSize?: number;
  qrTextColor?: string;
  badgeDimensions: BadgeDimensions;
  onChangePosition: (patch: Partial<ElementPosition>) => void;
  onChangeOpacity: (opacity: number) => void;
  onChangeQr: (patch: {
    qr_content?: string;
    qr_label?: string;
    qr_label_position?: "top" | "bottom" | "none";
    qr_color?: string;
    qr_bg_color?: string;
    qr_font_family?: string;
    qr_font_size?: number;
    qr_text_color?: string;
  }) => void;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
  onAddAdditionalQrCode?: () => void;
}

const PRESET_URLS = [
  { label: "WCA Live Results", url: "https://live.worldcubeassociation.org" },
  { label: "Competition Groups", url: "https://competitiongroups.com" },
  { label: "WCA Website", url: "https://www.worldcubeassociation.org" },
];

const FONT_FAMILIES = ["Inter", "Roboto", "DejaVu Sans", "Montserrat", "Arial", "Impact"];

export const QrCodeInspector: React.FC<QrCodeInspectorProps> = ({
  position,
  opacity,
  qrContent = "https://live.worldcubeassociation.org",
  qrLabel = "LIVE RESULTS",
  qrLabelPosition = "top",
  qrColor = "#000000",
  qrBgColor = "#FFFFFF",
  qrFontFamily = "Inter",
  qrFontSize = 10,
  qrTextColor = "#1E293B",
  badgeDimensions,
  onChangePosition,
  onChangeOpacity,
  onChangeQr,
  onLayerChange,
  onAddAdditionalQrCode,
}) => {
  return (
    <div className="space-y-4 select-none">
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">Customizable QR Code:</span> Adjust QR module color, background, and label typography.
      </div>

      {/* Button to add an additional QR code */}
      {onAddAdditionalQrCode && (
        <button
          type="button"
          onClick={onAddAdditionalQrCode}
          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Additional QR Code</span>
        </button>
      )}

      {/* QR Content / URL */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Target URL / Content</label>
        <input
          type="text"
          value={qrContent}
          onChange={(e) => onChangeQr({ qr_content: e.target.value })}
          placeholder="https://live.worldcubeassociation.org..."
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {PRESET_URLS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChangeQr({ qr_content: p.url })}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* QR Code Colors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">QR Module Color</label>
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <input
              type="color"
              value={qrColor}
              onChange={(e) => onChangeQr({ qr_color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-slate-300 bg-transparent p-0"
            />
            <input
              type="text"
              value={qrColor.toUpperCase()}
              onChange={(e) => onChangeQr({ qr_color: e.target.value })}
              className="w-full text-[11px] font-mono font-semibold bg-white border border-slate-200 rounded px-1.5 py-0.5 uppercase"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">QR Background</label>
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <input
              type="color"
              value={qrBgColor}
              onChange={(e) => onChangeQr({ qr_bg_color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-slate-300 bg-transparent p-0"
            />
            <input
              type="text"
              value={qrBgColor.toUpperCase()}
              onChange={(e) => onChangeQr({ qr_bg_color: e.target.value })}
              className="w-full text-[11px] font-mono font-semibold bg-white border border-slate-200 rounded px-1.5 py-0.5 uppercase"
            />
          </div>
        </div>
      </div>

      {/* QR Label & Position */}
      <div className="space-y-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">QR Label Text</label>
          <input
            type="text"
            value={qrLabel}
            onChange={(e) => onChangeQr({ qr_label: e.target.value })}
            placeholder="e.g. LIVE RESULTS, GROUPS:..."
            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Label Position</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["top", "bottom", "none"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChangeQr({ qr_label_position: pos })}
                className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${
                  qrLabelPosition === pos
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Label Typography Adjustments */}
        {qrLabelPosition !== "none" && (
          <div className="grid grid-cols-3 gap-2 pt-1 animate-fadeIn">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Font Family</label>
              <select
                value={qrFontFamily}
                onChange={(e) => onChangeQr({ qr_font_family: e.target.value })}
                className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1.5 cursor-pointer"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Size (pt)</label>
              <input
                type="number"
                min="6"
                max="24"
                value={qrFontSize}
                onChange={(e) => onChangeQr({ qr_font_size: parseInt(e.target.value) || 10 })}
                className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1.5"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Text Color</label>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-200">
                <input
                  type="color"
                  value={qrTextColor}
                  onChange={(e) => onChangeQr({ qr_text_color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={qrTextColor.toUpperCase()}
                  onChange={(e) => onChangeQr({ qr_text_color: e.target.value })}
                  className="w-full text-[10px] font-mono bg-white border border-slate-200 rounded px-1 uppercase"
                />
              </div>
            </div>
          </div>
        )}
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
