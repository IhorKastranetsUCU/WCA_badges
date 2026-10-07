import React, { useState } from "react";
import { X, LogIn, LogOut, Shield, Key, Sparkles, Check, ExternalLink } from "lucide-react";
import { WCAProfile, WCACompetition } from "@/types/wca";
import { getApiUrl } from "@/api/config";

interface WcaProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WCAProfile | null;
  competitions: WCACompetition[];
  onLogin: (token: string, profile: WCAProfile, competitions: WCACompetition[]) => void;
  onLogout: () => void;
  onOpenCompetitionImport: () => void;
}

export const WcaProfileModal: React.FC<WcaProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  competitions,
  onLogin,
  onLogout,
  onOpenCompetitionImport,
}) => {
  const [personalToken, setPersonalToken] = useState("");
  const [oauthCode, setOauthCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"token" | "oauth">("token");

  if (!isOpen) return null;

  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalToken.trim()) return;
    setErrorMessage("");
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/wca/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: personalToken.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(data.access_token, data.profile, data.competitions);
        onClose();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(
          errData?.detail || "Invalid WCA Token. Please verify your Personal Access Token in WCA account settings."
        );
      }
    } catch (err: any) {
      setErrorMessage(`Connection error: ${err.message || "Failed to contact server"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/`;
      const endpoint = `/api/wca/oauth/url?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const res = await fetch(getApiUrl(endpoint));
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("wca_oauth_redirect_uri", data.redirect_uri);
        window.location.href = data.authorization_url;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCodeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = oauthCode.trim();
    if (!code) return;
    // Extract code if user pasted a full URL
    if (code.includes("code=")) {
      try {
        const url = new URL(code);
        code = url.searchParams.get("code") || code;
      } catch {
        const match = code.match(/code=([^&]+)/);
        if (match) code = match[1];
      }
    }

    const storedRedirect = sessionStorage.getItem("wca_oauth_redirect_uri");
    const redirect_uri = storedRedirect || `${window.location.origin}/`;

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/wca/oauth/callback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri }),
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(data.access_token, data.profile, data.competitions);
        onClose();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.detail || "Failed to exchange OAuth code.");
      }
    } catch (err: any) {
      setErrorMessage(`OAuth error: ${err.message || "Failed to connect"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              W
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                {profile ? "WCA Account Profile" : "Connect WCA Profile"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {profile
                  ? "Access your assigned competitions as Delegate or Organizer"
                  : "Sign in to access competitions where you hold an official role"}
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

        {/* If already connected: Profile Card & Role Competitions */}
        {profile ? (
          <div className="p-6 space-y-5">
            {/* User Profile Info Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <img
                src={profile.avatar_url || "https://avatars.githubusercontent.com/u/45145803?v=4"}
                alt={profile.name}
                className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">{profile.name}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {profile.country_iso2}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  {profile.wca_id ? `WCA ID: ${profile.wca_id}` : "No WCA ID assigned"}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {profile.is_delegate && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Delegate
                    </span>
                  )}
                  {profile.is_organizer && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Organizer
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* List of Managed Competitions for this user */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">Your Competitions ({competitions.length})</label>
                <span className="text-[10px] text-slate-400">Where you are Delegate or Organizer</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {competitions.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">
                    No upcoming competitions found where you hold a Delegate or Organizer role.
                  </div>
                ) : (
                  competitions.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-2xl shadow-slate-100 hover:border-blue-300 transition-all"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="text-xs font-bold text-slate-800 truncate">{comp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {comp.city}, {comp.country_iso2} • {comp.start_date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {(comp.user_roles || []).map((r: string) => (
                          <span
                            key={r}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              r === "Delegate" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompetitionImport();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Manage & Import Badges
              </button>
            </div>
          </div>
        ) : (
          /* Connection Options when not logged in */
          <div className="p-6 space-y-5">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("token")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "token" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                }`}
              >
                Personal Token
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("oauth")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "oauth" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                }`}
              >
                WCA OAuth
              </button>
            </div>

            {/* Error Message if connection fails */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-fadeIn">
                {errorMessage}
              </div>
            )}

            {/* Personal Token Tab */}
            {activeTab === "token" && (
              <form onSubmit={handleTokenConnect} className="space-y-3 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    WCA Personal Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Paste access token from worldcubeassociation.org"
                    value={personalToken}
                    onChange={(e) => setPersonalToken(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Generate in your WCA Account &gt; Developer Applications &gt; Personal Access Tokens.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !personalToken.trim()}
                  className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {isLoading ? "Verifying Token..." : "Connect with Token"}
                </button>
              </form>
            )}

            {/* OAuth Live Sign-in Tab */}
            {activeTab === "oauth" && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-xs text-slate-500">
                  Redirects to the official World Cube Association OAuth server to authorize badge management.
                </p>
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={isLoading}
                  className="w-full py-2.5 text-xs font-bold text-white bg-[#0057B7] hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Sign In with World Cube Association</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">
                    Or Paste Code
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Direct Authorization Code entry */}
                <form onSubmit={handleManualCodeExchange} className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      OAuth Authorization Code or Callback URL
                    </label>
                    <input
                      type="text"
                      placeholder="Paste code or redirect URL (?code=...)"
                      value={oauthCode}
                      onChange={(e) => setOauthCode(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !oauthCode.trim()}
                    className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {isLoading ? "Exchanging Code..." : "Exchange Code & Sign In"}
                  </button>
                </form>

                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-[10px] text-blue-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Local Development Note</span>
                  </div>
                  <div>
                    Your WCA app callback URL is set to{" "}
                    <code className="bg-blue-100/70 px-1 py-0.5 rounded text-blue-900 font-mono">
                      https://v0-wcabadgegenerator3.vercel.app/api/auth/callback/wca
                    </code>
                    . To enable 1-click login on localhost, add{" "}
                    <code className="bg-blue-100/70 px-1 py-0.5 rounded text-blue-900 font-mono">
                      http://localhost:5173/
                    </code>{" "}
                    in your WCA OAuth application settings.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
