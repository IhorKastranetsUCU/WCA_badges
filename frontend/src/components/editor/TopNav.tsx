import React from "react";
import { Download, Sparkles, Shield, LogOut, ExternalLink, RefreshCw, SlidersHorizontal } from "lucide-react";
import { WCAProfile } from "@/types/wca";

interface TopNavProps {
  currentSide: "front" | "back";
  onSideChange: (side: "front" | "back") => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  wcaProfile: WCAProfile | null;
  onOpenProfileModal: () => void;
  onWcaLogin: () => void;
  onWcaLogout: () => void;
  isWcaAuthenticating?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentSide,
  onSideChange,
  onGenerate,
  isGenerating = false,
  wcaProfile,
  onOpenProfileModal,
  onWcaLogin,
  onWcaLogout,
  isWcaAuthenticating = false,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-30 select-none">
      {/* Left: Title in blue letters */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
          W
        </div>
        <h1 className="text-xl font-extrabold text-blue-600 tracking-tight flex items-center gap-2">
          WCA Badge Generator
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            PRO
          </span>
        </h1>
      </div>

      {/* Center: Badge side selector buttons */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => onSideChange("front")}
          className={`px-6 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            currentSide === "front"
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Front Side
        </button>
        <button
          type="button"
          onClick={() => onSideChange("back")}
          className={`px-6 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            currentSide === "back"
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Back Side
        </button>
      </div>

      {/* Right: WCA Profile status + Generate Badges button */}
      <div className="flex items-center gap-3">
        {wcaProfile ? (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 pr-2 shadow-sm">
            <button
              type="button"
              onClick={onOpenProfileModal}
              title="Click to view WCA Profile details"
              className="flex items-center gap-2.5 hover:bg-slate-100/80 p-1 rounded-lg transition-colors cursor-pointer text-left"
            >
              <img
                src={wcaProfile.avatar_url || "https://avatars.githubusercontent.com/u/45145803?v=4"}
                alt={wcaProfile.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-300"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                  {wcaProfile.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                  {wcaProfile.wca_id || "WCA Member"}
                </div>
              </div>
              {wcaProfile.is_delegate && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  Del
                </span>
              )}
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <button
              type="button"
              onClick={onWcaLogout}
              title="Sign Out of WCA"
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onWcaLogin}
              disabled={isWcaAuthenticating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0057B7] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              {isWcaAuthenticating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Sign In with WCA</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenProfileModal}
              title="More connection options (Demo / Personal Token)"
              className="p-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Badges
            </>
          )}
        </button>
      </div>
    </header>
  );
};
