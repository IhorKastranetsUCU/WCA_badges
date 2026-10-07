import React, { useState, useEffect, useRef } from "react";
import { X, Search, Trophy, Shield, Check, RefreshCw, UserCheck, Upload, FileCode } from "lucide-react";
import { WCACompetition, WCARegistrationItem, WCARegistrationsCategorized, WCAProfile } from "@/types/wca";
import { Competitor } from "@/types/competitor";
import { CountryFlag } from "@/utils/svgFlags";
import { getApiUrl } from "@/api/config";

interface WcaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompetitors: (imported: Competitor[], compId?: string) => void;
  competitions: WCACompetition[];
  wcaProfile: WCAProfile | null;
  wcaToken?: string | null;
  onOpenProfileModal: () => void;
}

export const WcaImportModal: React.FC<WcaImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompetitors,
  competitions,
  wcaProfile,
  wcaToken,
  onOpenProfileModal,
}) => {
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [customCompInput, setCustomCompInput] = useState<string>("");
  const [isLoadingRegs, setIsLoadingRegs] = useState<boolean>(false);
  const [categorized, setCategorized] = useState<WCARegistrationsCategorized | null>(null);
  const groupifierInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<"pending" | "approved" | "cancelled">("pending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleGroupifierFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        setUploadStatus("Uploading Groupifier / WCIF JSON...");
        const res = await fetch(getApiUrl("/api/wca/wcif/upload"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonContent),
        });

        if (res.ok) {
          const data = await res.json();
          setUploadStatus(`Loaded: ${data.name || data.competition_id} (${data.persons_count} competitors & schedule)`);
          setSelectedCompId(data.competition_id);
          if (data.imported_competitors && data.imported_competitors.length > 0) {
            onImportCompetitors(data.imported_competitors, data.competition_id);
            onClose();
          }
        } else {
          setUploadStatus("Failed to load WCIF file into backend");
        }
      } catch {
        setUploadStatus("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Separate competitions into actual/upcoming and archive
  const todayStr = new Date().toISOString().split("T")[0];
  const activeCompetitions = competitions.filter((c) => !c.end_date || c.end_date >= todayStr);
  const archiveCompetitions = competitions.filter((c) => c.end_date && c.end_date < todayStr);

  // Initialize selected competition when modal opens or competitions change
  useEffect(() => {
    if (isOpen && competitions.length > 0 && !selectedCompId) {
      const firstActive = activeCompetitions.length > 0 ? activeCompetitions[0] : competitions[0];
      setSelectedCompId(firstActive.id);
    }
  }, [isOpen, competitions, selectedCompId, activeCompetitions]);

  // Load registrations when selected competition changes
  useEffect(() => {
    if (!isOpen || !selectedCompId) return;

    setIsLoadingRegs(true);
    const headers: Record<string, string> = {};
    if (wcaToken) {
      headers["Authorization"] = `Bearer ${wcaToken}`;
    }

    fetch(getApiUrl(`/api/wca/competitions/${selectedCompId}/registrations`), { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WCARegistrationsCategorized) => {
        if (data) {
          // Pre-select approved and pending competitors by default, cancelled stay unselected
          const withSelected = {
            ...data,
            pending: (data.pending || []).map((item) => ({ ...item, selected: true })),
            approved: (data.approved || []).map((item) => ({ ...item, selected: true })),
            cancelled: (data.cancelled || []).map((item) => ({ ...item, selected: false })),
          };
          setCategorized(withSelected);

          // If there are pending waitlist competitors, show pending tab.
          // Otherwise (e.g. past competitions where everyone is accepted), switch to approved tab so names/details are immediately visible!
          if (withSelected.pending && withSelected.pending.length > 0) {
            setActiveCategory("pending");
          } else if (withSelected.approved && withSelected.approved.length > 0) {
            setActiveCategory("approved");
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingRegs(false));
  }, [isOpen, selectedCompId, wcaToken]);

  if (!isOpen) return null;

  const handleToggleRegistration = (regId: string) => {
    if (!categorized) return;
    const updateList = (list: WCARegistrationItem[]) =>
      list.map((item) => (item.id === regId ? { ...item, selected: !item.selected } : item));

    setCategorized({
      ...categorized,
      approved: updateList(categorized.approved),
      pending: updateList(categorized.pending),
      cancelled: updateList(categorized.cancelled),
    });
  };

  const handleToggleCategoryAll = (cat: "approved" | "pending" | "cancelled", targetValue: boolean) => {
    if (!categorized) return;
    setCategorized({
      ...categorized,
      [cat]: categorized[cat].map((item) => ({ ...item, selected: targetValue })),
    });
  };

  const approvedSelected = categorized?.approved.filter((r) => r.selected).length || 0;
  const pendingSelected = categorized?.pending.filter((r) => r.selected).length || 0;
  const cancelledSelected = categorized?.cancelled.filter((r) => r.selected).length || 0;
  const totalSelected = approvedSelected + pendingSelected;

  const currentItems = categorized ? categorized[activeCategory] : [];
  const filteredItems = currentItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name_latin.toLowerCase().includes(q) ||
      (item.name_local && item.name_local.toLowerCase().includes(q)) ||
      (item.wca_id && item.wca_id.toLowerCase().includes(q)) ||
      item.country_name.toLowerCase().includes(q)
    );
  });

  const handleImport = async (targetScope: "pending" | "all" = "all") => {
    if (!categorized) return;
    let selectedToImport: WCARegistrationItem[] = [];

    if (targetScope === "pending") {
      selectedToImport = categorized.pending.filter((r) => r.selected);
      if (selectedToImport.length === 0) selectedToImport = categorized.pending;
    } else {
      // Only import approved and pending, NEVER cancelled or rejected
      selectedToImport = [
        ...categorized.approved,
        ...categorized.pending,
      ].filter((r) => r.selected);
    }

    if (selectedToImport.length === 0) return;

    try {
      const res = await fetch(getApiUrl(`/api/wca/competitions/${selectedCompId}/import`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: selectedCompId,
          selected_registrations: selectedToImport,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onImportCompetitors(data, selectedCompId);
        onClose();
        return;
      }
    } catch {
      // Fallback client-side
    }

    const fallbackComps: Competitor[] = selectedToImport.map((reg, idx) => {
      const regIdNum = reg.user_id || idx + 1;
      return {
        id: `wca-${regIdNum}`,
        csv_index: regIdNum,
        registrant_id: regIdNum,
        name_latin: reg.name_latin,
        name_local: reg.name_local,
        name_raw: reg.name_raw,
        wca_id: reg.wca_id,
        country_iso2: reg.country_iso2,
        country_name: reg.country_name,
        avatar_url: reg.avatar_url || null,
        role_id: "r-participant",
      };
    });

    onImportCompetitors(fallbackComps, selectedCompId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800">WCA Competition Registrations</h2>
                {wcaProfile && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {wcaProfile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Competitions loaded where you are Delegate or Organizer. Structurized into 3 registration categories.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Competition Selection Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Your Assigned Competitions ({competitions.length})
                </label>
                {!wcaProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfileModal}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Connect Profile
                  </button>
                )}
              </div>

              {competitions.length > 0 ? (
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {activeCompetitions.length > 0 && (
                    <optgroup label="⚡ Active & Upcoming Competitions">
                      {activeCompetitions.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.city}) — Role: {comp.user_roles?.join(" & ") || "Organizer"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {archiveCompetitions.length > 0 && (
                    <optgroup label="📁 Archive (Past Competitions)">
                      {archiveCompetitions.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.city}) — Role: {comp.user_roles?.join(" & ") || "Organizer"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  No managed competitions found. Enter ID or upload Groupifier JSON.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Or WCA Competition ID
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. UkrainianOpen2024"
                  value={customCompInput}
                  onChange={(e) => setCustomCompInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customCompInput.trim()) {
                      setSelectedCompId(customCompInput.trim());
                    }
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={!customCompInput.trim()}
                  onClick={() => {
                    if (customCompInput.trim()) {
                      setSelectedCompId(customCompInput.trim());
                    }
                  }}
                  className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg cursor-pointer transition-all"
                >
                  Load
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Groupifier / WCIF File
              </label>
              <button
                type="button"
                onClick={() => groupifierInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-all whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Groupifier (.json)
              </button>
              <input
                ref={groupifierInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleGroupifierFileUpload}
              />
            </div>
          </div>

          {uploadStatus && (
            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center justify-between">
              <span>{uploadStatus}</span>
              <button
                type="button"
                onClick={() => setUploadStatus(null)}
                className="text-indigo-400 hover:text-indigo-600 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Category Tabs: Waiting List (Pending), Approved, Cancelled */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === "pending"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Waiting List (Pending)
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                {pendingSelected} / {categorized?.pending.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("approved")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === "approved"
                  ? "border-emerald-600 text-emerald-700 bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Approved Registrations
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {approvedSelected} / {categorized?.approved.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("cancelled")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === "cancelled"
                  ? "border-rose-600 text-rose-700 bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Cancelled / Rejected
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold">
                {cancelledSelected} / {categorized?.cancelled.length || 0}
              </span>
            </button>
          </div>

          {activeCategory !== "cancelled" ? (
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => handleToggleCategoryAll(activeCategory, true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleToggleCategoryAll(activeCategory, false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic pb-2">
              Cancelled / rejected competitors cannot be imported
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2.5 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Filter ${activeCategory} participants by name, WCA ID, or country...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Competitor List */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
          {isLoadingRegs ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading WCA registrations...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No participants found in this category matching your search.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (activeCategory !== "cancelled") {
                    handleToggleRegistration(item.id);
                  }
                }}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-all ${
                  activeCategory === "cancelled"
                    ? "opacity-60 cursor-not-allowed bg-slate-50/50"
                    : item.selected
                    ? "bg-blue-50/70 cursor-pointer"
                    : "hover:bg-slate-50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  {activeCategory !== "cancelled" ? (
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        item.selected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-rose-50 border border-rose-200 text-rose-500 text-[10px] font-bold">
                      ✕
                    </div>
                  )}

                  <div className="w-6 h-4 shrink-0 shadow-sm rounded-sm overflow-hidden">
                    <CountryFlag iso2={item.country_iso2} />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>{item.name_latin}</span>
                      {item.name_local && (
                        <span className="text-[11px] font-normal text-slate-500">
                          ({item.name_local})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.wca_id || "No WCA ID"} • {item.country_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span>
              Total Selected: <span className="font-extrabold text-blue-600">{totalSelected}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-medium">
              Waiting List: <span className="font-bold">{pendingSelected}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pendingSelected === 0}
              onClick={() => handleImport("pending")}
              className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-40 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Import Waiting List ({pendingSelected})</span>
            </button>
            <button
              type="button"
              disabled={totalSelected === 0}
              onClick={() => handleImport("all")}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Import Selected ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
