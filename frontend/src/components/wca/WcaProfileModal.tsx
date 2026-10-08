import React, { useState } from "react";
import { X, LogOut, Shield, Check, ExternalLink, Sparkles, Link2 } from "lucide-react";
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
  onGoogleLogin?: (wcaId?: string) => void;
  onLinkWca?: (wcaId: string) => Promise<void>;
  onWcaLinkViaOAuth?: () => void;
  onLinkWcaViaToken?: (token: string) => Promise<void>;
  isGoogleAuthenticating?: boolean;
  needsWcaLink?: boolean;
}

export const WcaProfileModal: React.FC<WcaProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  competitions,
  onLogin,
  onLogout,
  onOpenCompetitionImport,
  onGoogleLogin,
  onLinkWca,
  onWcaLinkViaOAuth,
  onLinkWcaViaToken,
  isGoogleAuthenticating = false,
  needsWcaLink = false,
}) => {
  const [personalToken, setPersonalToken] = useState("");
  const [oauthCode, setOauthCode] = useState("");
  const [googleWcaId, setGoogleWcaId] = useState("");
  const [linkInputWcaId, setLinkInputWcaId] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"google" | "wca_oauth" | "token">("google");
  const [linkTab, setLinkTab] = useState<"oauth" | "wca_id" | "token">("oauth");

  if (!isOpen) return null;

  const isGoogleUser = profile?.auth_provider === "google";

  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalToken.trim()) return;
    setErrorMessage("");
    setSuccessMessage("");
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

  const handleWcaOAuthConnect = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const redirectUri = `${window.location.origin}/`;
      const endpoint = `/api/wca/oauth/url?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const res = await fetch(getApiUrl(endpoint));
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("wca_oauth_redirect_uri", data.redirect_uri);
        sessionStorage.setItem("auth_provider", "wca");
        window.location.href = data.authorization_url;
      } else {
        setErrorMessage("Failed to initiate WCA OAuth login.");
      }
    } catch (err: any) {
      setErrorMessage(`OAuth error: ${err.message || "Failed to connect"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleConnect = () => {
    if (onGoogleLogin) {
      onGoogleLogin(googleWcaId.trim() || undefined);
    }
  };

  const handleManualCodeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = oauthCode.trim();
    if (!code) return;
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

  const handleLinkWcaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInputWcaId.trim()) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsLinking(true);
    try {
      if (onLinkWca) {
        await onLinkWca(linkInputWcaId.trim().toUpperCase());
        setSuccessMessage(`Successfully linked WCA Account: ${linkInputWcaId.trim().toUpperCase()}`);
        setLinkInputWcaId("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to link WCA ID");
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkViaTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkToken.trim()) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsLinking(true);
    try {
      if (onLinkWcaViaToken) {
        await onLinkWcaViaToken(linkToken.trim());
        setSuccessMessage("Successfully linked WCA account via token!");
        setLinkToken("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to link WCA account with token");
    } finally {
      setIsLinking(false);
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
                {profile ? (isGoogleUser ? "Google & WCA Profile" : "WCA Account Profile") : "Sign In & Registration"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {profile
                  ? "Manage your connected account and official badge generator permissions"
                  : "Choose your preferred authentication method to get started"}
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
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={profile.avatar_url || "https://avatars.githubusercontent.com/u/45145803?v=4"}
                    alt={profile.name}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover"
                  />
                  {isGoogleUser && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200" title="Google Authentication">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{profile.name}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      {profile.country_iso2}
                    </span>
                  </div>
                  {profile.email && (
                    <div className="text-[11px] text-slate-500 truncate">{profile.email}</div>
                  )}
                  <div className="text-xs font-mono text-slate-600 mt-0.5 flex items-center gap-1.5">
                    {profile.wca_id ? (
                      <span className="px-2 py-0.5 bg-blue-100/80 text-blue-800 font-bold rounded-md">
                        WCA ID: {profile.wca_id}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-sans text-xs">No WCA ID linked yet</span>
                    )}
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                      {isGoogleUser ? "Auth: Google" : "Auth: WCA Direct"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Link / Change WCA Account section for Google users */}
              {isGoogleUser && (
                <div className="pt-3 border-t border-blue-200/60 space-y-3">
                  {/* Prominent prompt when WCA link is needed */}
                  {(needsWcaLink || !profile.wca_id) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Connect your WCA Account</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Link your World Cube Association profile to access your competitions, badges, and official competitor data.
                      </p>
                    </div>
                  )}

                  {/* Link method tabs */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLinkTab("oauth")}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        linkTab === "oauth" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      WCA Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkTab("wca_id")}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        linkTab === "wca_id" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      WCA ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkTab("token")}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        linkTab === "token" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Token
                    </button>
                  </div>

                  {/* Tab: WCA OAuth Login */}
                  {linkTab === "oauth" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Sign in with your WCA account to automatically link your official profile and competitions.
                      </p>
                      <button
                        type="button"
                        onClick={() => onWcaLinkViaOAuth?.()}
                        disabled={isLinking}
                        className="w-full py-2 text-xs font-bold text-white bg-[#0057B7] hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isLinking ? "Connecting..." : profile.wca_id ? "Re-link via WCA Login" : "Sign In with WCA"}</span>
                      </button>
                    </div>
                  )}

                  {/* Tab: Manual WCA ID */}
                  {linkTab === "wca_id" && (
                    <form onSubmit={handleLinkWcaSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={profile.wca_id ? "Change WCA ID (e.g. 2024EXAM01)" : "Enter your WCA ID (e.g. 2024EXAM01)"}
                        value={linkInputWcaId}
                        onChange={(e) => setLinkInputWcaId(e.target.value)}
                        className="flex-1 text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isLinking || !linkInputWcaId.trim()}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>{isLinking ? "Linking..." : profile.wca_id ? "Update" : "Link"}</span>
                      </button>
                    </form>
                  )}

                  {/* Tab: Personal Access Token */}
                  {linkTab === "token" && (
                    <form onSubmit={handleLinkViaTokenSubmit} className="space-y-2">
                      <input
                        type="password"
                        placeholder="Paste WCA Personal Access Token"
                        value={linkToken}
                        onChange={(e) => setLinkToken(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isLinking || !linkToken.trim()}
                        className="w-full py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg shadow-xs transition-all cursor-pointer"
                      >
                        {isLinking ? "Linking..." : "Link with Token"}
                      </button>
                    </form>
                  )}

                  {successMessage && (
                    <div className="text-[11px] text-emerald-700 font-semibold">{successMessage}</div>
                  )}
                  {errorMessage && (
                    <div className="text-[11px] text-rose-600 font-semibold">{errorMessage}</div>
                  )}
                </div>
              )}
            </div>

            {/* List of Managed Competitions for this user */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">Available Competitions ({competitions.length})</label>
                <span className="text-[10px] text-slate-400">Where you are Delegate or Organizer</span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {competitions.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">
                    No competitions found. Link a WCA ID with Delegate/Organizer rights to view official events.
                  </div>
                ) : (
                  competitions.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-xs hover:border-blue-300 transition-all"
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
                Sign Out
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
            {/* Tabs for 2 Authentication Methods + Token */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("google")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "google" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wca_oauth")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "wca_oauth" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                WCA Direct
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("token")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "token" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Personal Token
              </button>
            </div>

            {/* Error Message if connection fails */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-fadeIn">
                {errorMessage}
              </div>
            )}

            {/* Tab 1: Google Auth (carries WCA account) */}
            {activeTab === "google" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sign in with Google + WCA Integration</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Authenticate securely with your Google account. Your session can carry your official WCA identity, avatar, and managed events.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Carry WCA Account (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter WCA ID (e.g. 2024EXAM01) or leave empty"
                    value={googleWcaId}
                    onChange={(e) => setGoogleWcaId(e.target.value)}
                    className="w-full text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    If entered, Google login will immediately attach your official WCA competitor profile & competitions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isLoading || isGoogleAuthenticating}
                  className="w-full py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isGoogleAuthenticating ? "Connecting to Google..." : "Continue with Google"}</span>
                </button>
              </div>
            )}

            {/* Tab 2: WCA OAuth Live Sign-in */}
            {activeTab === "wca_oauth" && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-xs text-slate-500">
                  Redirects to the official World Cube Association OAuth server to authorize badge management.
                </p>
                <button
                  type="button"
                  onClick={handleWcaOAuthConnect}
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
              </div>
            )}

            {/* Tab 3: Personal Access Token */}
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
          </div>
        )}
      </div>
    </div>
  );
};
