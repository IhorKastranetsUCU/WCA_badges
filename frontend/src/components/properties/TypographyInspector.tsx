import React from "react";
import { AlignLeft, AlignCenter, AlignRight, Italic, Type } from "lucide-react";
import { ElementStyle, ElementType, FormatMode, NameDisplayMode } from "@/types/badge";

interface TypographyInspectorProps {
  elementType: ElementType;
  style: ElementStyle;
  nameDisplay?: NameDisplayMode;
  formatMode?: FormatMode;
  formatPrefix?: string;
  formatSuffix?: string;
  onChangeStyle: (patch: Partial<ElementStyle>) => void;
  onChangeNameDisplay?: (mode: NameDisplayMode) => void;
  onChangeFormatMode?: (mode: FormatMode) => void;
  onChangeFormatPrefix?: (prefix: string) => void;
  onChangeFormatSuffix?: (suffix: string) => void;
}

const FONT_FAMILIES = ["Inter", "Roboto", "Montserrat", "Open Sans", "Arial", "Impact", "Georgia"];
const FONT_WEIGHTS = [
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "SemiBold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extra Bold (800)", value: "800" },
];

export const TypographyInspector: React.FC<TypographyInspectorProps> = ({
  elementType,
  style,
  nameDisplay = "latin_only",
  formatMode = "prefix_label",
  formatPrefix = "",
  formatSuffix = "",
  onChangeStyle,
  onChangeNameDisplay,
  onChangeFormatMode,
  onChangeFormatPrefix,
  onChangeFormatSuffix,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Name Display mode or Format mode */}
      {elementType === "name" && onChangeNameDisplay && (
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Name Display</label>
          <select
            value={nameDisplay}
            onChange={(e) => onChangeNameDisplay(e.target.value as NameDisplayMode)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="latin_only">Latin Only (Standard)</option>
            <option value="local_only">Local Only (e.g. Cyrillic / Asian)</option>
            <option value="both">Both: Latin (Local)</option>
          </select>
        </div>
      )}

      {(elementType === "wca_id" || elementType === "competition_id") && onChangeFormatMode && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Format</label>
          <select
            value={formatMode}
            onChange={(e) => onChangeFormatMode(e.target.value as FormatMode)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            {elementType === "wca_id" ? (
              <>
                <option value="prefix_label">WCA ID: [WCA ID]</option>
                <option value="raw">WCA ID (Value Only)</option>
                <option value="custom">Custom (Prefix / Suffix)</option>
              </>
            ) : (
              <>
                <option value="prefix_label">ID: [ID]</option>
                <option value="raw">ID (Value Only)</option>
                <option value="custom">Custom (Prefix / Suffix)</option>
              </>
            )}
          </select>

          {formatMode === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. Competitor #"
                  value={formatPrefix}
                  onChange={(e) => onChangeFormatPrefix?.(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Suffix</label>
                <input
                  type="text"
                  placeholder="e.g. - 2026"
                  value={formatSuffix}
                  onChange={(e) => onChangeFormatSuffix?.(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Font Family & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Font Family</label>
          <select
            value={style.font_family}
            onChange={(e) => onChangeStyle({ font_family: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Weight</label>
          <select
            value={style.font_weight}
            onChange={(e) => onChangeStyle({ font_weight: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {FONT_WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Font Size & Styling toggles */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Size (pt)</label>
          <input
            type="number"
            min="6"
            max="72"
            value={style.font_size}
            onChange={(e) => onChangeStyle({ font_size: parseInt(e.target.value) || 12 })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Style & Case</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeStyle({ italic: !style.italic })}
              className={`p-2 rounded-lg border text-xs flex items-center justify-center flex-1 transition-all ${
                style.italic
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeStyle({ uppercase: !style.uppercase })}
              className={`p-2 rounded-lg border text-xs flex items-center justify-center flex-1 font-bold transition-all ${
                style.uppercase
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Text Alignment */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Text Alignment</label>
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(["left", "center", "right"] as const).map((align) => {
            const isActive = style.text_align === align;
            return (
              <button
                key={align}
                type="button"
                onClick={() => onChangeStyle({ text_align: align })}
                className={`py-1.5 flex items-center justify-center rounded-md transition-all ${
                  isActive ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {align === "left" && <AlignLeft className="w-4 h-4" />}
                {align === "center" && <AlignCenter className="w-4 h-4" />}
                {align === "right" && <AlignRight className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Letter Spacing */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500">Letter Spacing (mm)</label>
          <span className="text-[10px] font-mono text-slate-400">{style.letter_spacing_mm.toFixed(1)} mm</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={style.letter_spacing_mm}
            onChange={(e) => onChangeStyle({ letter_spacing_mm: parseFloat(e.target.value) || 0 })}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="3"
            step="0.1"
            value={style.letter_spacing_mm}
            onChange={(e) => onChangeStyle({ letter_spacing_mm: parseFloat(e.target.value) || 0 })}
            className="w-16 text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center"
          />
        </div>
      </div>

      {/* 6. Text Color (Figma-like) */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Text Color</label>
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <input
            type="color"
            value={style.text_color}
            onChange={(e) => onChangeStyle({ text_color: e.target.value })}
            className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={style.text_color.toUpperCase()}
            onChange={(e) => onChangeStyle({ text_color: e.target.value })}
            className="flex-1 text-xs font-mono font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg p-1.5 uppercase"
          />
        </div>
      </div>
    </div>
  );
};
