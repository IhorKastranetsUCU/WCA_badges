import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Printer,
  FileText,
  Layers,
  Scissors,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";
import { BadgeDimensions, BadgeTemplate } from "@/types/badge";
import { Competitor, Role } from "@/types/competitor";
import { ExportPdfOptions, PAPER_SIZES, generateBadgesPdfBlob } from "@/utils/pdfExport";
import { BadgeRenderer } from "./BadgeRenderer";

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportPdfOptions) => Promise<void>;
  dimensions: BadgeDimensions;
  totalCompetitors: number;
  template: BadgeTemplate;
  competitors: Competitor[];
  roles: Role[];
  scheduleData?: any;
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
  template,
  competitors,
  roles,
  scheduleData,
}) => {
  const [paperSize, setPaperSize] = useState<"A4" | "A5" | "Letter" | "Legal" | "Single">("A4");
  const [side, setSide] = useState<"both" | "front" | "back">("both");
  const [parity, setParity] = useState<"front_even" | "front_odd">("front_even");
  const [cropMarks, setCropMarks] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Preview Navigation & State
  const [previewTab, setPreviewTab] = useState<"sheet" | "pdf">("sheet");
  const [currentSheetIdx, setCurrentSheetIdx] = useState<number>(0);
  const [duplexViewSide, setDuplexViewSide] = useState<"front" | "back">("front");
  const [sheetZoom, setSheetZoom] = useState<number>(1.0); // zoom factor multiplier
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const prevPdfBlobUrlRef = useRef<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 700,
  });

  const rolesMap = new Map(roles.map((r) => [r.id, r]));

  // If competitors array is empty, provide preview attendees so the user can see layout
  const previewCompetitors: Competitor[] =
    competitors.length > 0
      ? competitors
      : [
          {
            id: "sample-preview-1",
            csv_index: 1,
            name_latin: "Ihor Shevchenko",
            name_local: "Ігор Шевченко",
            name_raw: "Ihor Shevchenko",
            wca_id: "2018SHEV01",
            country_iso2: "UA",
            country_name: "Ukraine",
            role_id: roles[0]?.id || "r-participant",
          },
          {
            id: "sample-preview-2",
            csv_index: 2,
            name_latin: "Feliks Zemdegs",
            name_local: "",
            name_raw: "Feliks Zemdegs",
            wca_id: "2009ZEMD01",
            country_iso2: "AU",
            country_name: "Australia",
            role_id: roles[0]?.id || "r-participant",
          },
        ];

  // Grid calculation to minimize paper waste
  const selectedPaper = PAPER_STANDARDS.find((p) => p.id === paperSize) || PAPER_STANDARDS[0];
  const isSingle = paperSize === "Single";

  const sheetWmm = isSingle ? dimensions.width_mm : selectedPaper.w;
  const sheetHmm = isSingle ? dimensions.height_mm : selectedPaper.h;

  let cols = 1;
  let rows = 1;
  let cellWmm = dimensions.width_mm;
  let cellHmm = dimensions.height_mm;
  let shouldRotate = false;
  let badgesPerSheet = 1;
  let totalSheets = Math.max(1, Math.ceil(previewCompetitors.length / 1));
  let utilizationPct = 100;
  let marginXmm = 0;
  let marginYmm = 0;

  if (!isSingle) {
    const cols_0 = Math.max(1, Math.floor((sheetWmm + 1.0) / dimensions.width_mm));
    const rows_0 = Math.max(1, Math.floor((sheetHmm + 1.0) / dimensions.height_mm));
    const count_0 = cols_0 * rows_0;

    const cols_90 = Math.max(1, Math.floor((sheetWmm + 1.0) / dimensions.height_mm));
    const rows_90 = Math.max(1, Math.floor((sheetHmm + 1.0) / dimensions.width_mm));
    const count_90 = cols_90 * rows_90;

    shouldRotate = count_90 > count_0;
    cols = shouldRotate ? cols_90 : cols_0;
    rows = shouldRotate ? rows_90 : rows_0;
    cellWmm = shouldRotate ? dimensions.height_mm : dimensions.width_mm;
    cellHmm = shouldRotate ? dimensions.width_mm : dimensions.height_mm;

    badgesPerSheet = cols * rows;
    totalSheets = Math.max(1, Math.ceil(previewCompetitors.length / badgesPerSheet));
    const totalGridW = cols * cellWmm;
    const totalGridH = rows * cellHmm;
    marginXmm = (sheetWmm - totalGridW) / 2.0;
    marginYmm = (sheetHmm - totalGridH) / 2.0;

    const sheetArea = sheetWmm * sheetHmm;
    const usedArea = badgesPerSheet * (dimensions.width_mm * dimensions.height_mm);
    utilizationPct = Math.min(99, Math.round((usedArea / sheetArea) * 100));
  }

  // Adjust sheet index if out of bounds
  useEffect(() => {
    if (currentSheetIdx >= totalSheets) {
      setCurrentSheetIdx(Math.max(0, totalSheets - 1));
    }
  }, [totalSheets, currentSheetIdx]);

  // Track container size for responsive sheet scaling
  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        setContainerDimensions({
          width: previewContainerRef.current.clientWidth,
          height: previewContainerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Compute scale (pixels per mm) to fit sheet inside preview container
  const paddingPx = 40;
  const availContainerW = Math.max(100, containerDimensions.width - paddingPx);
  const availContainerH = Math.max(100, containerDimensions.height - paddingPx);
  const baseScale = Math.min(availContainerW / sheetWmm, availContainerH / sheetHmm);
  const effectiveScale = Math.max(1.0, baseScale * sheetZoom);

  // Generate compiled PDF blob when switching to PDF preview tab
  useEffect(() => {
    if (!isOpen || previewTab !== "pdf") return;

    let active = true;
    setIsPdfLoading(true);

    generateBadgesPdfBlob(template, previewCompetitors, roles, {
      paper_size: paperSize,
      side,
      parity,
      crop_marks: cropMarks,
      schedule_data: scheduleData,
    })
      .then((blob) => {
        if (!active) return;
        if (prevPdfBlobUrlRef.current) {
          URL.revokeObjectURL(prevPdfBlobUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        prevPdfBlobUrlRef.current = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => {
        console.error("Failed to render PDF preview:", err);
      })
      .finally(() => {
        if (active) setIsPdfLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, previewTab, paperSize, side, parity, cropMarks, template, competitors, roles, scheduleData]);

  // Clean up PDF blob url on unmount
  useEffect(() => {
    return () => {
      if (prevPdfBlobUrlRef.current) {
        URL.revokeObjectURL(prevPdfBlobUrlRef.current);
        prevPdfBlobUrlRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Competitors on the currently active sheet
  const sheetStartIdx = currentSheetIdx * badgesPerSheet;
  const currentSheetCompetitors = previewCompetitors.slice(sheetStartIdx, sheetStartIdx + badgesPerSheet);

  // Active side to display on sheet
  const activeSideToRender: "front" | "back" =
    side === "both" ? duplexViewSide : side === "back" ? "back" : "front";
  const activeSideDef = template?.sides?.[activeSideToRender] || { elements: [] };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await onExport({
        paper_size: paperSize,
        side,
        parity,
        crop_marks: cropMarks,
        schedule_data: scheduleData,
      });
      onClose();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintDirect = async () => {
    setIsPrinting(true);
    try {
      const blob = await generateBadgesPdfBlob(template, competitors, roles, {
        paper_size: paperSize,
        side,
        parity,
        crop_marks: cropMarks,
        schedule_data: scheduleData,
      });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Header */}
        <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Print & Export Badges Preview</h2>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Preview
                </span>
              </div>
              <p className="text-xs text-slate-500">
                WYSIWYG layout preview for {totalCompetitors} participant{totalCompetitors !== 1 ? "s" : ""} on {paperSize} paper
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body: Left Settings & Right Preview Stage */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left: Controls & Configurations Sidebar */}
          <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 p-5 space-y-4 select-none">
            {/* Preview Mode Switcher */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Preview Mode
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewTab("sheet")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    previewTab === "sheet"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Sheet Layout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("pdf")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    previewTab === "pdf"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Compiled PDF</span>
                </button>
              </div>
            </div>

            {/* 1. Paper Standard Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Paper Size Standard</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAPER_STANDARDS.map((p) => {
                  const isSelected = paperSize === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaperSize(p.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Side Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Badge Sides</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "both", label: "Both Sides", desc: "Duplex" },
                  { id: "front", label: "Front Only", desc: "1-sided" },
                  { id: "back", label: "Back Only", desc: "Reverse" },
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
                  <span>Duplex Print Order</span>
                </label>

                <div className="space-y-1.5">
                  <label
                    onClick={() => setParity("front_even")}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
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
                    <div className="text-[11px] leading-tight">
                      <div className="font-bold">Front: Even pages, Back: Odd pages</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        P1: Back • P2: Front • P3: Back • P4: Front
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setParity("front_odd")}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
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
                    <div className="text-[11px] leading-tight">
                      <div className="font-bold">Front: Odd pages, Back: Even pages</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        P1: Front • P2: Back • P3: Front • P4: Back
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
                    <div className="text-[10px] text-slate-400">Trimmer guide lines on boundaries</div>
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

            {/* 5. Paper Optimization Card */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
              <div className="font-bold flex items-center justify-between">
                <span>Optimization: {isSingle ? "Individual" : `${cols} × ${rows} Grid`}</span>
                <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                  {utilizationPct}% Area Used
                </span>
              </div>
              <div className="text-[11px] text-emerald-800">
                {isSingle ? (
                  <span>1 badge per page for dedicated card printers.</span>
                ) : (
                  <span>
                    Fit <strong>{badgesPerSheet}</strong> badges per {paperSize} sheet. Requires{" "}
                    <strong>{totalSheets}</strong> physical sheet{totalSheets !== 1 ? "s" : ""}.
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: Print Directly and Download PDF */}
            <div className="pt-2 space-y-2 mt-auto">
              <button
                type="button"
                onClick={handlePrintDirect}
                disabled={isPrinting || isExporting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing Print...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Print Directly (Browser)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting || isPrinting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF File</span>
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* Right: Live Preview Stage */}
          <main className="flex-1 flex flex-col bg-slate-200/90 overflow-hidden relative">
            {/* Top Toolbar in Preview Stage */}
            <div className="h-12 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 shadow-sm z-10">
              {/* Sheet & Page Navigation */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentSheetIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentSheetIdx === 0}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  Sheet {currentSheetIdx + 1} of {totalSheets}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentSheetIdx((prev) => Math.min(totalSheets - 1, prev + 1))}
                  disabled={currentSheetIdx >= totalSheets - 1}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Duplex Flip Selector when Both Sides is chosen */}
                {side === "both" && (
                  <div className="ml-3 flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDuplexViewSide("front")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        duplexViewSide === "front"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplexViewSide("back")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        duplexViewSide === "back"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Back Side (Duplex Flip)
                    </button>
                  </div>
                )}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSheetZoom((z) => Math.max(0.5, parseFloat((z - 0.15).toFixed(2))))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-500 min-w-[42px] text-center">
                  {Math.round(sheetZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSheetZoom((z) => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSheetZoom(1.0)}
                  title="Fit to Window"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Stage Viewport */}
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-auto flex items-center justify-center p-6 relative select-none"
            >
              {previewTab === "pdf" ? (
                /* PDF Compiled Iframe Preview Mode */
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {isPdfLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-600">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                      <div className="text-xs font-bold">Compiling ReportLab PDF Preview...</div>
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={`${pdfBlobUrl}#toolbar=0`}
                      title="Compiled PDF Preview"
                      className="w-full h-full rounded-xl border border-slate-300 shadow-2xl bg-white"
                    />
                  ) : (
                    <div className="text-xs text-slate-400">PDF preview could not be generated.</div>
                  )}
                </div>
              ) : (
                /* Interactive Sheet Layout Preview Mode */
                <div
                  style={{
                    width: `${sheetWmm * effectiveScale}px`,
                    height: `${sheetHmm * effectiveScale}px`,
                  }}
                  className="bg-white rounded shadow-2xl relative border border-slate-300 overflow-hidden shrink-0 transition-all duration-200"
                >
                  {/* Subtle Sheet Watermark / Margin lines */}
                  {!isSingle && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${marginXmm * effectiveScale}px`,
                        top: `${marginYmm * effectiveScale}px`,
                        width: `${cols * cellWmm * effectiveScale}px`,
                        height: `${rows * cellHmm * effectiveScale}px`,
                      }}
                      className="pointer-events-none border border-dashed border-slate-200"
                    />
                  )}

                  {/* Render Badge Grid on Sheet */}
                  {currentSheetCompetitors.map((comp, idx) => {
                    let col = idx % cols;
                    const row = Math.floor(idx / cols);

                    // Mirror column on back side for duplex long-edge flip parity!
                    if (activeSideToRender === "back" && !isSingle) {
                      col = cols - 1 - col;
                    }

                    const cellXmm = marginXmm + col * cellWmm;
                    const cellYmm = marginYmm + row * cellHmm;

                    // If packing is rotated 90°:
                    // Front is rotated +90°
                    // Back is rotated -90° (270°) so long-edge duplex flipping matches identical orientation
                    const rotateDeg = shouldRotate && !isSingle
                      ? activeSideToRender === "front" ? 90 : -90
                      : 0;

                    return (
                      <div
                        key={comp.id || idx}
                        style={{
                          position: "absolute",
                          left: `${cellXmm * effectiveScale}px`,
                          top: `${cellYmm * effectiveScale}px`,
                          width: `${cellWmm * effectiveScale}px`,
                          height: `${cellHmm * effectiveScale}px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        className="relative"
                      >
                        <div
                          style={{
                            width: `${dimensions.width_mm * effectiveScale}px`,
                            height: `${dimensions.height_mm * effectiveScale}px`,
                            flexShrink: 0,
                            transform: rotateDeg !== 0 ? `rotate(${rotateDeg}deg)` : undefined,
                            transformOrigin: "center center",
                          }}
                        >
                          {/* The High-Fidelity Badge Component */}
                          <BadgeRenderer
                            dimensions={dimensions}
                            elements={activeSideDef.elements}
                            backgroundUrl={activeSideDef.background_url}
                            competitor={comp}
                            rolesMap={rolesMap}
                            scale={effectiveScale}
                            isInteractive={false}
                            className="border-none"
                            scheduleData={scheduleData}
                          />
                        </div>

                        {/* Optional Crop / Cut Guides */}
                        {cropMarks && !isSingle && (
                          <div className="absolute inset-0 pointer-events-none border border-dashed border-slate-400/80" />
                        )}

                        {/* Slot Badge Index indicator */}
                        <span className="absolute bottom-1 right-1 text-[8px] font-mono text-slate-400/80 bg-white/70 px-1 rounded pointer-events-none">
                          #{sheetStartIdx + idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Status Indicator */}
            <div className="px-6 py-2 bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Sheet Specs:</span>
                <span>
                  {sheetWmm} × {sheetHmm} mm
                </span>
                <span>•</span>
                <span>
                  Grid: {cols} × {rows} ({badgesPerSheet} badges/sheet)
                </span>
                {side === "both" && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-semibold">
                      Viewing: {activeSideToRender.toUpperCase()}
                      {activeSideToRender === "back" && " (Duplex Mirrored)"}
                    </span>
                  </>
                )}
              </div>
              <div className="text-slate-400 font-mono">Scale: {effectiveScale.toFixed(1)} px/mm</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
