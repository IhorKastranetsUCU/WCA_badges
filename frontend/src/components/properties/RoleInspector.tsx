import React, { useState } from "react";
import { Plus, Check, UserCheck, Shield, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Role, RoleStyle, Competitor } from "@/types/competitor";

interface RoleInspectorProps {
  roles: Role[];
  activeRoleId: string;
  onSelectRole: (roleId: string) => void;
  onAddRole: (name: string) => void;
  onUpdateRole: (roleId: string, patch: { name?: string; style?: Partial<RoleStyle> }) => void;
  competitors: Competitor[];
  onAssignUser: (roleId: string, competitorId: string) => void;
}

const FONT_FAMILIES = ["Inter", "Roboto", "Montserrat", "Open Sans", "Arial"];

export const RoleInspector: React.FC<RoleInspectorProps> = ({
  roles,
  activeRoleId,
  onSelectRole,
  onAddRole,
  onUpdateRole,
  competitors,
  onAssignUser,
}) => {
  const [newRoleName, setNewRoleName] = useState("");
  const activeRole = roles.find((r) => r.id === activeRoleId) || roles[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim()) {
      onAddRole(newRoleName.trim());
      setNewRoleName("");
    }
  };

  if (!activeRole) return null;

  return (
    <div className="space-y-5">
      {/* 1. Add New Role Section */}
      <form onSubmit={handleCreate} className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-500 block">Add New Role</label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="e.g. Scrambler, Judge..."
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newRoleName.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Role Selection Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {roles.map((r) => {
          const isSelected = r.id === activeRole.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRole(r.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>{r.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Editable Role Name */}
      <div>
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Role Name</label>
        <input
          type="text"
          value={activeRole.name}
          onChange={(e) => onUpdateRole(activeRole.id, { name: e.target.value })}
          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 3. Role Styling Properties */}
      <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-xs font-bold text-slate-700">Role Badge Styling</div>

        {/* Background & Text Color */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Badge Color</label>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              <input
                type="color"
                value={activeRole.style.background_color}
                onChange={(e) =>
                  onUpdateRole(activeRole.id, {
                    style: { ...activeRole.style, background_color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer"
              />
              <span className="text-[11px] font-mono uppercase">{activeRole.style.background_color}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Text Color</label>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              <input
                type="color"
                value={activeRole.style.text_color}
                onChange={(e) =>
                  onUpdateRole(activeRole.id, {
                    style: { ...activeRole.style, text_color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer"
              />
              <span className="text-[11px] font-mono uppercase">{activeRole.style.text_color}</span>
            </div>
          </div>
        </div>

        {/* Font Family & Size */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Font Family</label>
            <select
              value={activeRole.style.font_family}
              onChange={(e) =>
                onUpdateRole(activeRole.id, {
                  style: { ...activeRole.style, font_family: e.target.value },
                })
              }
              className="w-full text-xs bg-white border border-slate-200 rounded p-1.5"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Font Size (pt)</label>
            <input
              type="number"
              min="8"
              max="24"
              value={activeRole.style.font_size}
              onChange={(e) =>
                onUpdateRole(activeRole.id, {
                  style: { ...activeRole.style, font_size: parseInt(e.target.value) || 12 },
                })
              }
              className="w-full text-xs bg-white border border-slate-200 rounded p-1.5"
            />
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="text-[10px] text-slate-500 block mb-0.5">Text Alignment</label>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(["left", "center", "right"] as const).map((align) => {
              const isActive = (activeRole.style.text_align || "center") === align;
              return (
                <button
                  key={align}
                  type="button"
                  onClick={() =>
                    onUpdateRole(activeRole.id, {
                      style: { ...activeRole.style, text_align: align },
                    })
                  }
                  className={`py-1 flex items-center justify-center rounded transition-all cursor-pointer ${
                    isActive ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                  {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                  {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Border Radius & Opacity */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Border Radius (mm)</label>
            <input
              type="number"
              min="0"
              max="15"
              step="0.5"
              value={activeRole.style.border_radius}
              onChange={(e) =>
                onUpdateRole(activeRole.id, {
                  style: { ...activeRole.style, border_radius: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full text-xs bg-white border border-slate-200 rounded p-1.5"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Opacity</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={activeRole.style.opacity}
              onChange={(e) =>
                onUpdateRole(activeRole.id, {
                  style: { ...activeRole.style, opacity: parseFloat(e.target.value) || 1 },
                })
              }
              className="w-full text-xs bg-white border border-slate-200 rounded p-1.5"
            />
          </div>
        </div>
      </div>

      {/* 4. Assigned Users Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-500 block">Assigned Users</label>
          <span className="text-[10px] text-slate-400">
            {competitors.filter((c) => (c.role_id || "r-participant") === activeRole.id).length} members
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
          {competitors.length === 0 ? (
            <div className="text-[11px] text-slate-400 p-2 text-center">No participants loaded yet</div>
          ) : (
            competitors.map((comp) => {
              const isAssigned = (comp.role_id || "r-participant") === activeRole.id;
              return (
                <div
                  key={comp.id}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                    isAssigned ? "bg-blue-100/60 text-blue-950 font-medium" : "bg-white text-slate-700"
                  }`}
                >
                  <div className="truncate flex-1 mr-2">
                    <span className="truncate">{comp.name_latin}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({comp.wca_id || `#${comp.csv_index}`})
                    </span>
                  </div>

                  {isAssigned ? (
                    <div title="Assigned to this role" className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Assign to this role"
                      onClick={() => onAssignUser(activeRole.id, comp.id)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
