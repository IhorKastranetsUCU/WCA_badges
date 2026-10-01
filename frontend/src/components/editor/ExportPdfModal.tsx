import React, { useState } from "react";
import { X, Download, FileText, Sparkles, Check, Layers, Printer, Scissors } from "lucide-react";
import { BadgeDimensions } from "@/types/badge";
import { ExportPdfOptions } from "@/utils/pdfExport";

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportPdfOptions) => Promise<void>;
  dimensions: BadgeDimensions;
  totalCompetitors: number;
}

const PAPER_STANDARDS = [
  { id: "A4", label: "A4", dims: "210 × 297 mm", w: 210, h: 297, desc: "Standard International" },
  { id: "A5", label: "A5", dims: "148 × 210 mm", w: 148, h: 210, desc: "Compact Half-Sheet" },
  { id: "Letter", label: "Letter", dims: "8.5 × 11 in", w: 215.9, h: 279.4, desc: "North America Standard" },
  { id: "Legal", label: "Legal", dims: "8.5 × 14 in", w: 215.9, h: 355.6, desc: "Extended Sheet" },
  { id: "Single", label: "Single Badge", dims: "1 Badge / Page", w: 0, h: 0, desc: "Individual Badge Size" },
] as const;

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  onExport,
  dimensions,
  totalCompetitors,
}) => {
  const [paperSize, setPaperSize] = useState<"A4" | "A5" | "Letter" | "Legal" | "Single">("A4");
  const [side, setSide] = useState<"both" | "front" | "back">("both");
  const [parity, setParity] = useState<"front_even" | "front_odd">("front_even");
  const [cropMarks, setCropMarks] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Grid calculation to minimize paper waste
  const selectedPaper = PAPER_STANDARDS.find((p) => p.id === paperSize) || PAPER_STANDARDS[0];
  const isSingle = paperSize === "Single";

  let cols = 1;
  let rows = 1;
  let badgesPerSheet = 1;
  let totalSheets = Math.ceil(totalCompetitors / 1);
  let utilizationPct = 100;

  if (!isSingle) {
    const margin = 5.0; // mm
    const availW = Math.max(10, selectedPaper.w - 2 * margin);
    const availH = Math.max(10, selectedPaper.h - 2 * margin);

    cols = Math.max(1, Math.floor(availW / dimensions.width_mm));
    rows = Math.max(1, Math.floor(availH / dimensions.height_mm));
    badgesPerSheet = cols * rows;

    totalSheets = Math.max(1, Math.ceil(totalCompetitors / badgesPerSheet));
    const sheetArea = selectedPaper.w * selectedPaper.h;
    const usedArea = badgesPerSheet * (dimensions.width_mm * dimensions.height_mm);
    utilizationPct = Math.min(99, Math.round((usedArea / sheetArea) * 100));
  }

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await onExport({
        paper_size: paperSize,
        side,
        parity,
        crop_marks: cropMarks,
      });
      onClose();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Export Badges to PDF</h2>
              <p className="text-xs text-slate-500">
                Multi-paper tiling & duplex alignment for {totalCompetitors} attendee{totalCompetitors !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Paper Standard Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Paper Size Standard</label>
            <div className="grid grid-cols-2 gap-2">
              {PAPER_STANDARDS.map((p) => {
                const isSelected = paperSize === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaperSize(p.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.dims}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Side Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Badge Sides</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "both", label: "Both Sides", desc: "Duplex Printing" },
                { id: "front", label: "Front Only", desc: "1-sided badges" },
                { id: "back", label: "Back Only", desc: "Schedule/QRs" },
              ].map((opt) => {
                const isSelected = side === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSide(opt.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className={`text-[9px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Duplex Parity Options (when Both Sides selected) */}
          {side === "both" && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Page Parity (Double-Sided Duplex Order)</span>
              </label>

              <div className="space-y-1.5">
                <label
                  onClick={() => setParity("front_even")}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                    parity === "front_even"
                      ? "bg-blue-50/80 border-blue-300 text-blue-950 font-medium"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="parity"
                    checked={parity === "front_even"}
                    onChange={() => setParity("front_even")}
                    className="mt-0.5 text-blue-600 accent-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Front side is Even pages, Back side is Odd pages</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                        Requested
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Page 1: Back sheet • Page 2: Front sheet • Page 3: Back sheet • Page 4: Front sheet...
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setParity("front_odd")}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                    parity === "front_odd"
                      ? "bg-blue-50/80 border-blue-300 text-blue-950 font-medium"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="parity"
                    checked={parity === "front_odd"}
                    onChange={() => setParity("front_odd")}
                    className="mt-0.5 text-blue-600 accent-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-bold">Front side is Odd pages, Back side is Even pages</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Page 1: Front sheet • Page 2: Back sheet • Page 3: Front sheet • Page 4: Back sheet...
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* 4. Crop Marks Toggle */}
          {!isSingle && (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Dashed Cutting Guides</div>
                  <div className="text-[10px] text-slate-400">Light dashed borders around badges for paper trimmers</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={cropMarks}
                onChange={(e) => setCropMarks(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          )}

          {/* 5. Paper Optimization & Waste Minimization Card */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
            <div className="font-bold flex items-center justify-between">
              <span>Optimization: {isSingle ? "Individual Badges" : `${cols} × ${rows} Grid (${badgesPerSheet} badges/sheet)`}</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {isSingle ? "100% Fit" : `${utilizationPct}% Paper Used`}
              </span>
            </div>
            <div className="text-[11px] text-emerald-800">
              {isSingle
                ? `Exporting ${totalCompetitors} badges as individual pages (${dimensions.width_mm} × ${dimensions.height_mm} mm).`
                : `Fits ${badgesPerSheet} badges per ${paperSize} page with minimized waste. Total: ${totalSheets} ${
                    side === "both" ? `${totalSheets * 2} duplex pages` : "sheet(s)"
                  }.`}
            </div>
            {side === "both" && !isSingle && (
              <div className="text-[10px] text-emerald-700 italic pt-1 border-t border-emerald-200/60">
                ✨ Columns are automatically mirrored horizontally on the back page so double-sided long-edge printing aligns front & back badge cutouts.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Generating {paperSize} PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {paperSize} PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
