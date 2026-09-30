import React, { useState } from "react";
import { X, UserPlus, Shield } from "lucide-react";
import { Role, Competitor } from "@/types/competitor";
import { getApiUrl } from "@/api/config";

interface AddCustomAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onAddCompetitor: (newCompetitor: Competitor) => void;
}

const COMMON_COUNTRIES = [
  { name: "Ukraine", iso2: "UA" },
  { name: "Poland", iso2: "PL" },
  { name: "United States", iso2: "US" },
  { name: "Germany", iso2: "DE" },
  { name: "France", iso2: "FR" },
  { name: "United Kingdom", iso2: "GB" },
  { name: "Canada", iso2: "CA" },
  { name: "Spain", iso2: "ES" },
  { name: "Italy", iso2: "IT" },
  { name: "China", iso2: "CN" },
  { name: "Japan", iso2: "JP" },
];

export const AddCustomAttendeeModal: React.FC<AddCustomAttendeeModalProps> = ({
  isOpen,
  onClose,
  roles,
  onAddCompetitor,
}) => {
  const [nameLatin, setNameLatin] = useState("");
  const [nameLocal, setNameLocal] = useState("");
  const [wcaId, setWcaId] = useState("");
  const [countryIso2, setCountryIso2] = useState("UA");
  const [roleId, setRoleId] = useState(roles[0]?.id || "r-participant");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameLatin.trim()) return;

    setIsSubmitting(true);
    const countryObj = COMMON_COUNTRIES.find((c) => c.iso2 === countryIso2) || {
      name: "Ukraine",
      iso2: "UA",
    };

    const payload = {
      name_latin: nameLatin.trim(),
      name_local: nameLocal.trim() || undefined,
      wca_id: wcaId.trim() || undefined,
      country_iso2: countryObj.iso2,
      country_name: countryObj.name,
      role_id: roleId,
    };

    try {
      const res = await fetch(getApiUrl("/api/competitors/manual"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created: Competitor = await res.json();
        onAddCompetitor(created);
        onClose();
        return;
      }
    } catch {
      // Fallback client-side addition
    }

    const fallback: Competitor = {
      id: `manual-${Date.now()}`,
      csv_index: 999,
      name_latin: payload.name_latin,
      name_local: payload.name_local || null,
      name_raw: payload.name_local
        ? `${payload.name_latin} (${payload.name_local})`
        : payload.name_latin,
      wca_id: payload.wca_id || null,
      country_iso2: payload.country_iso2,
      country_name: payload.country_name,
      role_id: payload.role_id,
    };

    onAddCompetitor(fallback);
    onClose();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Add Custom Badge Attendee</h2>
              <p className="text-[11px] text-slate-400">
                Create a badge for a guest, VIP, sponsor, or late registration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Latin Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe, Ihor Shevchenko"
              value={nameLatin}
              onChange={(e) => setNameLatin(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Local Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Ігор Шевченко, 王艺衡"
              value={nameLocal}
              onChange={(e) => setNameLocal(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Will render when &quot;Both&quot; or &quot;Local Only&quot; name display is selected.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">WCA ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 2018SHEV01"
                value={wcaId}
                onChange={(e) => setWcaId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
              <select
                value={countryIso2}
                onChange={(e) => setCountryIso2(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name} ({c.iso2})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Role</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nameLatin.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Add to Badges
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
