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
  onGoogleLogin: () => void;
  isGoogleAuthenticating?: boolean;
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
  onGoogleLogin,
  isGoogleAuthenticating = false,
}) => {
  const isGoogle = wcaProfile?.auth_provider === "google";
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

      {/* Right: Auth & Generate Badges */}
      <div className="flex items-center gap-3">
        {wcaProfile ? (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 pr-2 shadow-sm">
            <button
              type="button"
              onClick={onOpenProfileModal}
              title="Click to view Account & WCA Profile details"
              className="flex items-center gap-2.5 hover:bg-slate-100/80 p-1 rounded-lg transition-colors cursor-pointer text-left"
            >
              <div className="relative">
                <img
                  src={wcaProfile.avatar_url || "https://avatars.githubusercontent.com/u/45145803?v=4"}
                  alt={wcaProfile.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-300"
                />
                {isGoogle && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200" title="Connected with Google">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="flex flex-col text-left">
                <div className="text-xs font-extrabold text-slate-900 leading-tight truncate max-w-[220px]">
                  {wcaProfile.email || wcaProfile.name}
                </div>
                {wcaProfile.email && wcaProfile.name && wcaProfile.name !== wcaProfile.email && (
                  <div className="text-[10px] text-slate-500 font-medium leading-tight truncate max-w-[220px]">
                    {wcaProfile.name}
                  </div>
                )}
                <div className="text-[10px] font-mono leading-tight flex items-center gap-1.5 mt-0.5">
                  {wcaProfile.wca_id ? (
                    <span className="text-blue-600 font-bold">WCA: {wcaProfile.wca_id}</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-sans font-semibold text-[9px]">
                      {isGoogle ? "Google Auth" : "Signed In"}
                    </span>
                  )}
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
              title="Sign Out"
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Cognito Sign In Button (Redirects to /login/ -> Cognito Hosted UI) */}
            <a
              href="/login/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="Sign in with Email/Password or Google via Amazon Cognito"
            >
              <span>Cognito Sign In</span>
            </a>

            {/* 1. Sign In with WCA */}
            <button
              type="button"
              onClick={onWcaLogin}
              disabled={isWcaAuthenticating || isGoogleAuthenticating}
              title="Direct login with official WCA account"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0057B7] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isWcaAuthenticating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>WCA...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Sign In WCA</span>
                </>
              )}
            </button>

            {/* 2. Sign In with Google */}
            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={isWcaAuthenticating || isGoogleAuthenticating}
              title="Sign in with Google (carries/links your WCA profile)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {isGoogleAuthenticating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  <span>Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign In Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenProfileModal}
              title="More connection & linking options"
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
