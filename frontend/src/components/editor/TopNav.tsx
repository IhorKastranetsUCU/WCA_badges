import React from "react";
import { Download, Sparkles, User, Shield, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { WCAProfile } from "@/types/wca";

interface TopNavProps {
  currentSide: "front" | "back";
  onSideChange: (side: "front" | "back") => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  wcaProfile: WCAProfile | null;
  onOpenProfileModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentSide,
  onSideChange,
  onGenerate,
  isGenerating = false,
  wcaProfile,
  onOpenProfileModal,
}) => {
  const auth = useAuth();

  const handleCognitoSignOut = () => {
    auth.removeUser();
    const cognitoDomain =
      import.meta.env.VITE_COGNITO_DOMAIN ||
      "https://wca-badges-297580066889.auth.us-east-1.amazoncognito.com";
    const clientId =
      import.meta.env.VITE_COGNITO_CLIENT_ID || "3eqs900kmd3koe333lg6jl4pl2";
    const logoutUri = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  };

  const handleCognitoSignIn = () => {
    auth.signinRedirect();
  };

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

      {/* Right: Cognito user status + WCA Profile status + Generate Badges button */}
      <div className="flex items-center gap-3">
        {/* Amazon Cognito Auth Status */}
        {auth.isAuthenticated && auth.user ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-bold text-emerald-700 tracking-wider">Signed in</div>
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[160px]">
                {auth.user.profile.email || auth.user.profile.preferred_username || "User"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCognitoSignOut}
              title="Sign Out of Amazon Cognito"
              className="ml-1 p-1 hover:bg-emerald-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCognitoSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>
        )}

        {/* WCA Profile Connector */}
        {wcaProfile ? (
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-all cursor-pointer"
          >
            <img
              src={wcaProfile.avatar_url || "https://avatars.githubusercontent.com/u/45145803?v=4"}
              alt={wcaProfile.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {wcaProfile.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono leading-tight">
                {wcaProfile.wca_id || "Connected"}
              </div>
            </div>
            {wcaProfile.is_delegate && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" />
                Del
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Connect WCA Profile</span>
          </button>
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
