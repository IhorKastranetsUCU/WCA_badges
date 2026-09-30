import React from "react";
import { ElementStyle } from "@/types/badge";

interface AppearanceInspectorProps {
  style: ElementStyle;
  onChangeStyle: (patch: Partial<ElementStyle>) => void;
}

export const AppearanceInspector: React.FC<AppearanceInspectorProps> = ({ style, onChangeStyle }) => {
  return (
    <div className="space-y-4">
      {/* 1. Has Background toggle */}
      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <div className="text-xs font-semibold text-slate-800">Has Background</div>
          <div className="text-[10px] text-slate-400">Fill container background</div>
        </div>
        <button
          type="button"
          onClick={() => onChangeStyle({ has_background: !style.has_background })}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
            style.has_background ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 ${
              style.has_background ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* When Has Background is enabled */}
      {style.has_background && (
        <div className="space-y-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200 animate-fadeIn">
          {/* Background Color Picker */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Background Color</label>
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
              <input
                type="color"
                value={style.background_color}
                onChange={(e) => onChangeStyle({ background_color: e.target.value })}
                className="w-7 h-7 rounded border border-slate-300 p-0 cursor-pointer"
              />
              <input
                type="text"
                value={style.background_color.toUpperCase()}
                onChange={(e) => onChangeStyle({ background_color: e.target.value })}
                className="flex-1 text-xs font-mono font-semibold text-slate-800 uppercase focus:outline-none"
              />
            </div>
          </div>

          {/* Border Radius & Border Width */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Border Radius (mm)</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={style.border_radius}
                onChange={(e) => onChangeStyle({ border_radius: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Border Width (px)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={style.border_width}
                onChange={(e) => onChangeStyle({ border_width: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Border Color (appears if border_width > 0) */}
          {style.border_width > 0 && (
            <div className="animate-fadeIn">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Border Color</label>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                <input
                  type="color"
                  value={style.border_color}
                  onChange={(e) => onChangeStyle({ border_color: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-300 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={style.border_color.toUpperCase()}
                  onChange={(e) => onChangeStyle({ border_color: e.target.value })}
                  className="flex-1 text-xs font-mono font-semibold text-slate-800 uppercase focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Padding */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Padding (mm)</label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={style.padding_mm}
              onChange={(e) => onChangeStyle({ padding_mm: parseFloat(e.target.value) || 0 })}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500">Opacity</label>
          <span className="text-[10px] font-mono text-slate-400">{Math.round(style.opacity * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={style.opacity}
            onChange={(e) => onChangeStyle({ opacity: parseFloat(e.target.value) || 0 })}
            className="flex-1 accent-blue-600 cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={style.opacity}
            onChange={(e) => onChangeStyle({ opacity: parseFloat(e.target.value) || 0 })}
            className="w-16 text-xs bg-slate-50 border border-slate-200 rounded p-1 text-center"
          />
        </div>
      </div>
    </div>
  );
};
