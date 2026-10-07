import React, { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  Trophy,
  UserPlus,
  Search,
  Camera,
  Loader2,
} from "lucide-react";
import { BadgeDimensions, BadgePreset } from "@/types/badge";
import { Competitor } from "@/types/competitor";

interface LeftPanelProps {
  dimensions: BadgeDimensions;
  onDimensionsChange: (dims: BadgeDimensions) => void;
  competitors: Competitor[];
  currentParticipantIndex: number;
  onParticipantChange: (index: number) => void;
  onCsvUpload: (file: File) => void;
  onBackgroundUpload: (file: File) => void;
  onOpenWcaModal: () => void;
  onOpenAddCustomModal: () => void;
  enabledFields: Record<string, boolean>;
  onToggleField: (field: any) => void;
  onUploadCompetitorAvatar?: (competitorId: string, file: File) => void;
  isFetchingAvatars?: boolean;
  onAddAdditionalQrCode?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  dimensions,
  onDimensionsChange,
  competitors,
  currentParticipantIndex,
  onParticipantChange,
  onCsvUpload,
  onBackgroundUpload,
  onOpenWcaModal,
  onOpenAddCustomModal,
  enabledFields,
  onToggleField,
  onUploadCompetitorAvatar,
  isFetchingAvatars = false,
  onAddAdditionalQrCode,
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const handlePresetChange = (preset: BadgePreset) => {
    let w = dimensions.width_mm;
    let h = dimensions.height_mm;

    if (preset === "A6") {
      w = 105;
      h = 148;
    } else if (preset === "100x70") {
      w = 100;
      h = 70;
    } else if (preset === "90x70") {
      w = 90;
      h = 70;
    }

    onDimensionsChange({
      preset,
      width_mm: w,
      height_mm: h,
    });
  };

  const handleCustomDimension = (axis: "w" | "h", value: number) => {
    if (isNaN(value)) return;
    const clamped = Math.max(20, Math.min(200, value));
    onDimensionsChange({
      preset: "Custom",
      width_mm: axis === "w" ? clamped : dimensions.width_mm,
      height_mm: axis === "h" ? clamped : dimensions.height_mm,
    });
  };

  const total = competitors.length;
  const current = total > 0 ? currentParticipantIndex + 1 : 0;

  // Filtered competitors for quick search jump
  const searchResults = searchQuery.trim()
    ? competitors
        .map((c, idx) => ({ comp: c, idx }))
        .filter(({ comp }) => {
          const q = searchQuery.toLowerCase();
          return (
            comp.name_latin.toLowerCase().includes(q) ||
            (comp.name_local && comp.name_local.toLowerCase().includes(q)) ||
            (comp.wca_id && comp.wca_id.toLowerCase().includes(q)) ||
            String(comp.csv_index).includes(q) ||
            comp.id.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto select-none p-5 space-y-6">
      {/* 1. WCA Live Integration & Data Import */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Participants & Import</h2>

        {/* WCA API Connect Button */}
        <button
          type="button"
          onClick={onOpenWcaModal}
          className="w-full group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl p-3 flex items-center justify-between shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold">WCA Competition Import</div>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
            LIVE
          </span>
        </button>

        {/* CSV File Dropzone / Button directly below WCA Competition Import */}
        <div
          onClick={() => csvInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) onCsvUpload(e.dataTransfer.files[0]);
          }}
          className="group border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-xl p-2.5 flex items-center gap-2.5 transition-all cursor-pointer"
        >
          <input
            type="file"
            ref={csvInputRef}
            onChange={(e) => e.target.files?.[0] && onCsvUpload(e.target.files[0])}
            accept=".csv,text/csv"
            className="hidden"
          />
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800">Upload WCA CSV</div>
            <div className="text-[10px] text-slate-400 truncate">
              {total > 0 ? `${total} participants loaded` : "Select or drop CSV file"}
            </div>
          </div>
          <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
        </div>

        {/* Add Custom Person Button */}
        <button
          type="button"
          onClick={onOpenAddCustomModal}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-blue-600" />
          <span>+ Add Custom Attendee Badge</span>
        </button>

        {/* Background Image Dropzone */}
        <div
          onClick={() => bgInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) onBackgroundUpload(e.dataTransfer.files[0]);
          }}
          className="group border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer"
        >
          <input
            type="file"
            ref={bgInputRef}
            onChange={(e) => e.target.files?.[0] && onBackgroundUpload(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800">Badge Background</div>
            <div className="text-[10px] text-slate-400 truncate">PNG, JPG or SVG artwork</div>
          </div>
          <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
        </div>
      </section>

      {/* 2. Participant Navigation Controls & Search */}
      <section className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Participant Preview</h2>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {current} of {total}
          </span>
        </div>

        {/* Search by Name, ID, or WCA ID */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ID, or WCA ID..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Quick Search Results Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
              {searchResults.map(({ comp, idx }) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    onParticipantChange(idx);
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className={`w-full text-left p-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-0 ${
                    idx === currentParticipantIndex ? "bg-blue-50 font-bold" : ""
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="text-slate-800 truncate">{comp.name_latin}</div>
                    <div className="text-[10px] text-slate-400">
                      ID: #{comp.registrant_id ?? comp.csv_index ?? idx + 1} • {comp.wca_id || "No WCA ID"}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                    {comp.country_iso2 || "UA"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attendee Navigation Card */}
        {(() => {
          const currComp = competitors[currentParticipantIndex];
          return (
            <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <button
                type="button"
                disabled={currentParticipantIndex <= 0}
                onClick={() => onParticipantChange(currentParticipantIndex - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Photo thumbnail / upload trigger */}
              {currComp && (
                <div className="relative group shrink-0">
                  <input
                    type="file"
                    id={`left-avatar-upload-${currComp.id}`}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onUploadCompetitorAvatar) {
                        onUploadCompetitorAvatar(currComp.id, file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor={`left-avatar-upload-${currComp.id}`}
                    title="Upload / Change Photo"
                    className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all block relative"
                  >
                    {currComp.avatar_url ? (
                      <img
                        src={currComp.avatar_url}
                        alt={currComp.name_latin}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    )}
                  </label>
                </div>
              )}

              <div className="text-center flex-1 min-w-0 px-1">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {currComp?.name_latin || "No participants"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  ID: #{currComp?.registrant_id ?? currComp?.csv_index ?? 1} •{" "}
                  {currComp?.wca_id || "No WCA ID"} •{" "}
                  {currComp?.country_iso2 || "UA"}
                </div>
              </div>

              <button
                type="button"
                disabled={currentParticipantIndex >= total - 1}
                onClick={() => onParticipantChange(currentParticipantIndex + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })()}
      </section>

      {/* 3. Badge Size Options & Custom Dimensions */}
      <section className="space-y-3 pt-2 border-t border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Badge Size</h2>

        <select
          value={dimensions.preset}
          onChange={(e) => handlePresetChange(e.target.value as BadgePreset)}
          className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="100x70">100 × 70 mm (Standard Horizontal)</option>
          <option value="90x70">90 × 70 mm (Compact)</option>
          <option value="A6">A6 (105 × 148 mm Vertical)</option>
          <option value="Custom">Custom Dimensions (Manual)</option>
        </select>

        {dimensions.preset === "Custom" && (
          <div className="grid grid-cols-2 gap-3 pt-1 animate-fadeIn">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Width (mm)</label>
              <input
                type="number"
                min="20"
                max="200"
                step="0.1"
                value={dimensions.width_mm}
                onChange={(e) => handleCustomDimension("w", parseFloat(e.target.value))}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Height (mm)</label>
              <input
                type="number"
                min="20"
                max="200"
                step="0.1"
                value={dimensions.height_mm}
                onChange={(e) => handleCustomDimension("h", parseFloat(e.target.value))}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 text-[10px] text-slate-400">
              Maximum dimensions: 200 × 200 mm
            </div>
          </div>
        )}
      </section>

      {/* 4. Badge Components Toggles */}
      <section className="space-y-3 pt-2 border-t border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Badge Components</h2>
        <div className="space-y-1.5">
          {(
            [
              { key: "name", label: "Participant Name" },
              { key: "wca_id", label: "WCA ID" },
              { key: "flag", label: "Country Flag (SVG)" },
              { key: "competition_id", label: "Competition ID" },
              { key: "role", label: "Role Badge" },
              { key: "avatar", label: "Competitor Photo (WCA)" },
              { key: "qr_code", label: "QR Code with Label" },
              { key: "schedule", label: "Competition Schedule Table" },
            ] as const
          ).map((item) => {
            const isActive = !!enabledFields[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggleField(item.key)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-50/70 border-blue-200 text-blue-900"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.key === "avatar" && isFetchingAvatars && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.key === "qr_code" && onAddAdditionalQrCode && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdditionalQrCode();
                      }}
                      title="Add another QR code to badge"
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 transition-all cursor-pointer"
                    >
                      + Add
                    </span>
                  )}
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
};
