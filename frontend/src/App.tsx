import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, X } from "lucide-react";
import { BadgeDimensions, BadgeElement, BadgeTemplate } from "@/types/badge";
import { Competitor, Role, RoleStyle } from "@/types/competitor";
import { WCAProfile, WCACompetition } from "@/types/wca";
import { TopNav } from "@/components/editor/TopNav";
import { LeftPanel } from "@/components/editor/LeftPanel";
import { Canvas } from "@/components/editor/Canvas";
import { RightPanel } from "@/components/editor/RightPanel";
import { WcaImportModal } from "@/components/wca/WcaImportModal";
import { WcaProfileModal } from "@/components/wca/WcaProfileModal";
import { AddCustomAttendeeModal } from "@/components/wca/AddCustomAttendeeModal";
import { ExportPdfModal } from "@/components/editor/ExportPdfModal";
import { parseClientCsv } from "@/utils/csvParser";
import { exportBadges } from "@/utils/pdfExport";
import { readFileAndCompress } from "@/utils/imageUtils";
import { getApiUrl } from "@/api/config";

const INITIAL_ROLES: Role[] = [
  {
    id: "r-participant",
    name: "Participant",
    is_default: true,
    style: {
      font_family: "Inter",
      font_size: 14,
      font_weight: "600",
      italic: false,
      text_align: "center",
      text_color: "#FFFFFF",
      background_color: "#2563EB",
      border_radius: 4.0,
      border_width: 0.0,
      border_color: "#000000",
      opacity: 1.0,
    },
  },
  {
    id: "r-delegate",
    name: "WCA Delegate",
    is_default: false,
    style: {
      font_family: "Inter",
      font_size: 14,
      font_weight: "700",
      italic: false,
      text_align: "center",
      text_color: "#FFFFFF",
      background_color: "#059669",
      border_radius: 4.0,
      border_width: 0.0,
      border_color: "#000000",
      opacity: 1.0,
    },
  },
  {
    id: "r-organizer",
    name: "Organizer",
    is_default: false,
    style: {
      font_family: "Inter",
      font_size: 14,
      font_weight: "700",
      italic: false,
      text_align: "center",
      text_color: "#FFFFFF",
      background_color: "#DC2626",
      border_radius: 4.0,
      border_width: 0.0,
      border_color: "#000000",
      opacity: 1.0,
    },
  },
  {
    id: "r-staff",
    name: "Staff",
    is_default: false,
    style: {
      font_family: "Inter",
      font_size: 14,
      font_weight: "600",
      italic: false,
      text_align: "center",
      text_color: "#FFFFFF",
      background_color: "#7C3AED",
      border_radius: 4.0,
      border_width: 0.0,
      border_color: "#000000",
      opacity: 1.0,
    },
  },
];

const INITIAL_COMPETITORS: Competitor[] = [
  {
    id: "c1",
    csv_index: 1,
    name_latin: "Artem Zhuravsky",
    name_local: "Артем Журавський",
    name_raw: "Artem Zhuravsky (Артем Журавський)",
    wca_id: "2022ZHUR01",
    country_iso2: "UA",
    country_name: "Ukraine",
    role_id: "r-participant",
  },
  {
    id: "c2",
    csv_index: 2,
    name_latin: "Bohdan Koval",
    name_local: "Богдан Коваль",
    name_raw: "Bohdan Koval (Богдан Коваль)",
    wca_id: "2023KOVA02",
    country_iso2: "UA",
    country_name: "Ukraine",
    role_id: "r-participant",
  },
  {
    id: "c3",
    csv_index: 3,
    name_latin: "Sophia Miller",
    name_local: null,
    name_raw: "Sophia Miller",
    wca_id: "2020MILL05",
    country_iso2: "DE",
    country_name: "Germany",
    role_id: "r-participant",
  },
  {
    id: "c4",
    csv_index: 4,
    name_latin: "Denys Melnyk",
    name_local: "Денис Мельник",
    name_raw: "Denys Melnyk (Денис Мельник)",
    wca_id: "2024MELN01",
    country_iso2: "UA",
    country_name: "Ukraine",
    role_id: "r-participant",
  },
];

const INITIAL_FRONT_ELEMENTS: BadgeElement[] = [
  {
    id: "elem-flag",
    type: "flag",
    enabled: true,
    position: { x_mm: 42.0, y_mm: 8.0, width_mm: 16.0, height_mm: 11.0, rotation_deg: 0, z_index: 1 },
    opacity: 1.0,
  },
  {
    id: "elem-name",
    type: "name",
    enabled: true,
    name_display: "latin_only",
    position: { x_mm: 10.0, y_mm: 24.0, width_mm: 80.0, height_mm: 12.0, rotation_deg: 0, z_index: 2 },
    style: {
      font_family: "Inter",
      font_size: 20,
      font_weight: "700",
      italic: false,
      uppercase: true,
      text_align: "center",
      letter_spacing_mm: 0.1,
      text_color: "#111827",
      has_background: false,
      background_color: "#FFFFFF",
      border_radius: 0,
      border_width: 0,
      border_color: "#000000",
      opacity: 1.0,
      padding_mm: 0,
    },
  },
  {
    id: "elem-wca-id",
    type: "wca_id",
    enabled: true,
    format_mode: "prefix_label",
    format_prefix: "WCA ID: ",
    format_suffix: "",
    position: { x_mm: 10.0, y_mm: 39.0, width_mm: 80.0, height_mm: 8.0, rotation_deg: 0, z_index: 3 },
    style: {
      font_family: "Inter",
      font_size: 13,
      font_weight: "500",
      italic: false,
      uppercase: false,
      text_align: "center",
      letter_spacing_mm: 0.0,
      text_color: "#4B5563",
      has_background: false,
      background_color: "#FFFFFF",
      border_radius: 0,
      border_width: 0,
      border_color: "#000000",
      opacity: 1.0,
      padding_mm: 0,
    },
  },
  {
    id: "elem-role",
    type: "role",
    enabled: true,
    position: { x_mm: 20.0, y_mm: 50.0, width_mm: 60.0, height_mm: 9.0, rotation_deg: 0, z_index: 4 },
  },
  {
    id: "elem-comp-id",
    type: "competition_id",
    enabled: true,
    format_mode: "raw",
    format_prefix: "",
    format_suffix: "",
    position: { x_mm: 75.0, y_mm: 4.0, width_mm: 20.0, height_mm: 6.0, rotation_deg: 0, z_index: 5 },
    style: {
      font_family: "Inter",
      font_size: 10,
      font_weight: "500",
      italic: false,
      uppercase: false,
      text_align: "right",
      letter_spacing_mm: 0.0,
      text_color: "#9CA3AF",
      has_background: false,
      background_color: "#FFFFFF",
      border_radius: 0,
      border_width: 0,
      border_color: "#000000",
      opacity: 1.0,
      padding_mm: 0,
    },
  },
];

const INITIAL_BACK_ELEMENTS: BadgeElement[] = [
  {
    id: "elem-back-comp-id",
    type: "competition_id",
    enabled: true,
    format_mode: "prefix_label",
    format_prefix: "COMP ID: ",
    position: { x_mm: 3.0, y_mm: 5.0, width_mm: 20.0, height_mm: 8.0, rotation_deg: 0, z_index: 2 },
    style: {
      font_family: "Inter",
      font_size: 11,
      font_weight: "700",
      italic: false,
      uppercase: true,
      text_align: "left",
      letter_spacing_mm: 0.0,
      text_color: "#111827",
      has_background: false,
      background_color: "#FFFFFF",
      border_radius: 0,
      border_width: 0,
      border_color: "#000000",
      opacity: 1.0,
      padding_mm: 0,
    },
  },
  {
    id: "elem-back-wca-id",
    type: "wca_id",
    enabled: true,
    format_mode: "prefix_label",
    format_prefix: "WCA ID: ",
    position: { x_mm: 3.0, y_mm: 15.0, width_mm: 20.0, height_mm: 8.0, rotation_deg: 0, z_index: 2 },
    style: {
      font_family: "Inter",
      font_size: 10,
      font_weight: "700",
      italic: false,
      uppercase: true,
      text_align: "left",
      letter_spacing_mm: 0.0,
      text_color: "#111827",
      has_background: false,
      background_color: "#FFFFFF",
      border_radius: 0,
      border_width: 0,
      border_color: "#000000",
      opacity: 1.0,
      padding_mm: 0,
    },
  },
  {
    id: "elem-back-schedule",
    type: "schedule",
    enabled: true,
    schedule_title: "",
    position: { x_mm: 24.0, y_mm: 3.0, width_mm: 73.0, height_mm: 44.0, rotation_deg: 0, z_index: 1 },
    opacity: 1.0,
  },
  {
    id: "elem-back-qr-live",
    type: "qr_code",
    enabled: true,
    qr_content: "https://live.worldcubeassociation.org",
    qr_label: "LIVE RESULTS",
    qr_label_position: "bottom",
    position: { x_mm: 4.0, y_mm: 47.0, width_mm: 26.0, height_mm: 20.0, rotation_deg: 0, z_index: 3 },
    opacity: 1.0,
  },
  {
    id: "elem-back-qr-groups",
    type: "qr_code",
    enabled: true,
    qr_content: "https://competitiongroups.com",
    qr_label: "GROUPS:",
    qr_label_position: "top",
    position: { x_mm: 69.0, y_mm: 46.0, width_mm: 27.0, height_mm: 21.0, rotation_deg: 0, z_index: 3 },
    opacity: 1.0,
  },
];

const PROTOTYPE_ELEMENTS: Record<string, Partial<BadgeElement>> = {
  flag: INITIAL_FRONT_ELEMENTS[0],
  name: INITIAL_FRONT_ELEMENTS[1],
  wca_id: INITIAL_FRONT_ELEMENTS[2],
  role: INITIAL_FRONT_ELEMENTS[3],
  competition_id: INITIAL_FRONT_ELEMENTS[4],
  avatar: {
    type: "avatar",
    enabled: true,
    position: { x_mm: 8.0, y_mm: 8.0, width_mm: 16.0, height_mm: 16.0, rotation_deg: 0, z_index: 3 },
    border_radius_mm: 8.0,
    border_width_mm: 0.5,
    border_color: "#94A3B8",
    opacity: 1.0,
  },
  qr_code: {
    type: "qr_code",
    enabled: true,
    qr_content: "https://live.worldcubeassociation.org",
    qr_label: "LIVE RESULTS",
    qr_label_position: "top",
    position: { x_mm: 74.0, y_mm: 46.0, width_mm: 20.0, height_mm: 20.0, rotation_deg: 0, z_index: 3 },
    opacity: 1.0,
  },
  schedule: {
    type: "schedule",
    enabled: true,
    position: { x_mm: 5.0, y_mm: 10.0, width_mm: 90.0, height_mm: 55.0, rotation_deg: 0, z_index: 2 },
    opacity: 1.0,
  },
};

export const App: React.FC = () => {
  const [template, setTemplate] = useState<BadgeTemplate>({
    id: "current",
    name: "Default Template",
    is_active: true,
    dimensions: { preset: "100x70", width_mm: 100.0, height_mm: 70.0 },
    sides: {
      front: { background_url: null, elements: INITIAL_FRONT_ELEMENTS },
      back: { background_url: null, elements: INITIAL_BACK_ELEMENTS },
    },
  });

  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");
  const [competitors, setCompetitors] = useState<Competitor[]>(INITIAL_COMPETITORS);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [activeRoleId, setActiveRoleId] = useState<string>("r-participant");
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // WCA Profile & Competition State
  const [wcaProfile, setWcaProfile] = useState<WCAProfile | null>(() => {
    const saved = localStorage.getItem("wca_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [wcaCompetitions, setWcaCompetitions] = useState<WCACompetition[]>([]);
  const [wcaToken, setWcaToken] = useState<string | null>(() => localStorage.getItem("wca_token"));
  const [isWcaAuthenticating, setIsWcaAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Modals
  const [isWcaModalOpen, setIsWcaModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [competitionSchedule, setCompetitionSchedule] = useState<any>(null);
  const [isUploadingAssignments, setIsUploadingAssignments] = useState<boolean>(false);
  const [assignmentStatusMessage, setAssignmentStatusMessage] = useState<string | null>(null);

  // Direct WCA OAuth login trigger
  const handleWcaOAuthLogin = async () => {
    try {
      setIsWcaAuthenticating(true);
      setAuthError(null);
      const redirectUri = `${window.location.origin}/`;
      sessionStorage.setItem("wca_oauth_redirect_uri", redirectUri);
      const res = await fetch(getApiUrl(`/api/wca/oauth/url?redirect_uri=${encodeURIComponent(redirectUri)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
          return;
        }
      }
      throw new Error("Failed to generate WCA authorization URL");
    } catch (e: any) {
      console.error("WCA OAuth error:", e);
      setAuthError(e.message || "Failed to start WCA login");
      setIsWcaAuthenticating(false);
    }
  };

  // Immediate redirect on /login/ route to WCA OAuth
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/login" || path === "/login/" || path.startsWith("/login")) {
      handleWcaOAuthLogin();
    }
  }, []);

  // Handle WCA OAuth callback URL (?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setIsWcaAuthenticating(true);
      setAuthError(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      const redirect_uri = sessionStorage.getItem("wca_oauth_redirect_uri") || `${window.location.origin}/`;
      fetch(getApiUrl("/api/wca/oauth/callback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Authentication with WCA failed");
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.profile) {
            handleLogin(data.access_token, data.profile, data.competitions || []);
          }
        })
        .catch((err: any) => {
          console.error("WCA OAuth callback error:", err);
          setAuthError(err.message || "Failed to complete WCA authentication");
        })
        .finally(() => {
          setIsWcaAuthenticating(false);
        });
    }
  }, []);

  // Fetch competitions for active WCA profile
  useEffect(() => {
    if (!wcaToken && !wcaProfile) return;
    fetch(getApiUrl("/api/wca/competitions"), {
      headers: wcaToken ? { Authorization: `Bearer ${wcaToken}` } : {},
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: WCACompetition[]) => {
        if (Array.isArray(data)) setWcaCompetitions(data);
      })
      .catch(() => {});
  }, [wcaToken, wcaProfile]);

  const handleLogin = (token: string, profile: WCAProfile, comps: WCACompetition[]) => {
    setWcaToken(token);
    setWcaProfile(profile);
    setWcaCompetitions(comps);
    localStorage.setItem("wca_token", token);
    localStorage.setItem("wca_profile", JSON.stringify(profile));
  };

  const handleLogout = () => {
    setWcaToken(null);
    setWcaProfile(null);
    setWcaCompetitions([]);
    localStorage.removeItem("wca_token");
    localStorage.removeItem("wca_profile");
  };

  // Sync with backend API on mount
  useEffect(() => {
    fetch(getApiUrl("/api/roles"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) setRoles(data);
      })
      .catch(() => {});

    fetch(getApiUrl("/api/competitors"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) setCompetitors(data);
      })
      .catch(() => {});
  }, []);

  const currentSideConfig = template.sides[currentSide];
  const selectedElement =
    currentSideConfig.elements.find((e) => e.id === selectedElementId) || null;

  const [isFetchingAvatars, setIsFetchingAvatars] = useState<boolean>(false);

  // Batch fetch WCA avatars for all competitors
  const fetchWcaAvatars = async () => {
    if (isFetchingAvatars) return;
    const eligible = competitors.filter((c) => c.wca_id && c.wca_id.trim());
    if (eligible.length === 0) return;

    setIsFetchingAvatars(true);
    try {
      const res = await fetch(getApiUrl("/api/competitors/fetch-wca-avatars"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.updated) {
          setCompetitors((prev) =>
            prev.map((c) => {
              if (c.id in data.updated) {
                return { ...c, avatar_url: data.updated[c.id] };
              }
              return c;
            })
          );
        }
      } else {
        await fetchWcaAvatarsClientSide();
      }
    } catch (err) {
      console.warn("Backend avatar fetch error, falling back to client-side:", err);
      await fetchWcaAvatarsClientSide();
    } finally {
      setIsFetchingAvatars(false);
    }
  };

  const fetchWcaAvatarsClientSide = async () => {
    const eligible = competitors.filter((c) => c.wca_id && c.wca_id.trim() && !c.avatar_url);
    for (const comp of eligible) {
      try {
        const cleanWcaId = comp.wca_id!.trim().toUpperCase();
        const res = await fetch(`https://www.worldcubeassociation.org/api/v0/persons/${cleanWcaId}`);
        if (res.ok) {
          const personData = await res.json();
          const avatarObj = personData?.person?.avatar || {};
          const isDefault = avatarObj.is_default;
          const url = avatarObj.url || avatarObj.thumb_url;
          const finalUrl = !isDefault && url && !url.includes("missing_avatar") ? url : null;
          setCompetitors((prev) =>
            prev.map((c) => (c.id === comp.id ? { ...c, avatar_url: finalUrl } : c))
          );
        }
      } catch {
        // Continue
      }
    }
  };

  const fetchSingleWcaAvatar = async (competitorId: string, wcaId: string) => {
    setIsFetchingAvatars(true);
    try {
      const cleanWcaId = wcaId.trim().toUpperCase();
      const res = await fetch(`https://www.worldcubeassociation.org/api/v0/persons/${cleanWcaId}`);
      if (res.ok) {
        const data = await res.json();
        const avatarObj = data?.person?.avatar || {};
        const isDefault = avatarObj.is_default;
        const url = avatarObj.url || avatarObj.thumb_url;
        const finalUrl = !isDefault && url && !url.includes("missing_avatar") ? url : null;
        setCompetitors((prev) =>
          prev.map((c) => (c.id === competitorId ? { ...c, avatar_url: finalUrl } : c))
        );
        await fetch(getApiUrl(`/api/competitors/${competitorId}/avatar`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: finalUrl }),
        });
      }
    } catch (err) {
      console.warn("Failed to fetch avatar:", err);
    } finally {
      setIsFetchingAvatars(false);
    }
  };

  const handleUploadCompetitorAvatar = async (competitorId: string, file: File) => {
    try {
      const dataUrl = await readFileAndCompress(file, 800, 800);
      setCompetitors((prev) =>
        prev.map((c) => (c.id === competitorId ? { ...c, avatar_url: dataUrl } : c))
      );
      await fetch(getApiUrl(`/api/competitors/${competitorId}/avatar`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: dataUrl }),
      });
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    }
  };

  const handleRemoveCompetitorAvatar = async (competitorId: string) => {
    setCompetitors((prev) =>
      prev.map((c) => (c.id === competitorId ? { ...c, avatar_url: null } : c))
    );
    try {
      await fetch(getApiUrl(`/api/competitors/${competitorId}/avatar`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });
    } catch (err) {
      console.error("Failed to remove avatar:", err);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    setCompetitors((prev) => {
      const idx = prev.findIndex((c) => c.id === competitorId);
      const updated = prev.filter((c) => c.id !== competitorId);
      if (updated.length === 0) {
        setCurrentParticipantIndex(0);
      } else if (currentParticipantIndex >= updated.length) {
        setCurrentParticipantIndex(Math.max(0, updated.length - 1));
      } else if (idx === currentParticipantIndex && currentParticipantIndex > 0) {
        setCurrentParticipantIndex(currentParticipantIndex - 1);
      }
      return updated;
    });

    try {
      await fetch(getApiUrl(`/api/competitors/${competitorId}`), {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Failed to delete competitor on backend:", err);
    }
  };

  const enabledFields: Record<string, boolean> = {
    name: currentSideConfig.elements.some((e) => e.type === "name" && e.enabled),
    wca_id: currentSideConfig.elements.some((e) => e.type === "wca_id" && e.enabled),
    flag: currentSideConfig.elements.some((e) => e.type === "flag" && e.enabled),
    competition_id: currentSideConfig.elements.some((e) => e.type === "competition_id" && e.enabled),
    role: currentSideConfig.elements.some((e) => e.type === "role" && e.enabled),
    avatar: currentSideConfig.elements.some((e) => e.type === "avatar" && e.enabled),
    qr_code: currentSideConfig.elements.some((e) => e.type === "qr_code" && e.enabled),
    schedule: currentSideConfig.elements.some((e) => e.type === "schedule" && e.enabled),
  };

  const handleToggleField = (fieldType: string) => {
    let willEnable = false;
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      const existing = side.elements.find((e) => e.type === fieldType);

      let updatedElements: BadgeElement[];
      if (existing) {
        willEnable = !existing.enabled;
        updatedElements = side.elements.map((e) =>
          e.id === existing.id ? { ...e, enabled: !e.enabled } : e
        );
      } else {
        willEnable = true;
        const proto = PROTOTYPE_ELEMENTS[fieldType];
        if (proto) {
          updatedElements = [
            ...side.elements,
            { ...proto, id: `elem-${fieldType}-${Date.now()}`, enabled: true } as BadgeElement,
          ];
        } else {
          updatedElements = side.elements;
        }
      }

      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: { ...side, elements: updatedElements },
        },
      };
    });

    // If user clicked Competitor photo and enabled it, request avatars from WCA!
    if (fieldType === "avatar" && willEnable) {
      fetchWcaAvatars();
    }
  };

  const handleUpdateElementPosition = (
    id: string,
    patch: { x_mm: number; y_mm: number; width_mm: number; height_mm: number }
  ) => {
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: {
            ...side,
            elements: side.elements.map((e) =>
              e.id === id ? { ...e, position: { ...e.position, ...patch } } : e
            ),
          },
        },
      };
    });
  };

  const handleDimensionsChange = (newDims: BadgeDimensions) => {
    setTemplate((prev) => {
      const oldW = prev.dimensions.width_mm || 100;
      const oldH = prev.dimensions.height_mm || 70;
      const scaleX = newDims.width_mm / oldW;
      const scaleY = newDims.height_mm / oldH;

      const scaleElements = (elements: BadgeElement[]) =>
        elements.map((el) => {
          // If switching to A6 (105x148 portrait)
          if (newDims.preset === "A6" && prev.dimensions.preset !== "A6") {
            if (el.type === "schedule") {
              return {
                ...el,
                position: {
                  x_mm: 5.0,
                  y_mm: 5.0,
                  width_mm: 95.0,
                  height_mm: 108.0,
                  rotation_deg: el.position.rotation_deg,
                  z_index: el.position.z_index,
                },
              };
            }
            if (el.id === "elem-back-qr-live") {
              return {
                ...el,
                position: {
                  x_mm: 8.0,
                  y_mm: 116.0,
                  width_mm: 38.0,
                  height_mm: 26.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.id === "elem-back-qr-groups") {
              return {
                ...el,
                position: {
                  x_mm: 59.0,
                  y_mm: 116.0,
                  width_mm: 38.0,
                  height_mm: 26.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.type === "avatar") {
              return {
                ...el,
                position: {
                  x_mm: 36.5,
                  y_mm: 12.0,
                  width_mm: 32.0,
                  height_mm: 32.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
                border_radius_mm: 16.0,
              };
            }
            if (el.type === "flag") {
              return {
                ...el,
                position: {
                  x_mm: 42.5,
                  y_mm: 48.0,
                  width_mm: 20.0,
                  height_mm: 13.0,
                  rotation_deg: 0,
                  z_index: 1,
                },
              };
            }
            if (el.type === "name") {
              return {
                ...el,
                position: {
                  x_mm: 5.0,
                  y_mm: 66.0,
                  width_mm: 95.0,
                  height_mm: 18.0,
                  rotation_deg: 0,
                  z_index: 2,
                },
                style: el.style
                  ? { ...el.style, font_size: Math.max(el.style.font_size, 22) }
                  : el.style,
              };
            }
            if (el.type === "wca_id") {
              return {
                ...el,
                position: {
                  x_mm: 10.0,
                  y_mm: 88.0,
                  width_mm: 85.0,
                  height_mm: 10.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.type === "role") {
              return {
                ...el,
                position: {
                  x_mm: 15.0,
                  y_mm: 104.0,
                  width_mm: 75.0,
                  height_mm: 14.0,
                  rotation_deg: 0,
                  z_index: 4,
                },
              };
            }
          }

          // If switching back from A6 to 100x70 or 90x70
          if (
            (newDims.preset === "100x70" || newDims.preset === "90x70") &&
            prev.dimensions.preset === "A6"
          ) {
            const wRatio = newDims.width_mm / 100.0;
            if (el.type === "schedule") {
              return {
                ...el,
                position: {
                  x_mm: parseFloat((24.0 * wRatio).toFixed(1)),
                  y_mm: 3.0,
                  width_mm: parseFloat((73.0 * wRatio).toFixed(1)),
                  height_mm: 44.0,
                  rotation_deg: 0,
                  z_index: 1,
                },
              };
            }
            if (el.id === "elem-back-qr-live") {
              return {
                ...el,
                position: {
                  x_mm: 4.0,
                  y_mm: 47.0,
                  width_mm: 26.0,
                  height_mm: 20.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.id === "elem-back-qr-groups") {
              return {
                ...el,
                position: {
                  x_mm: parseFloat((69.0 * wRatio).toFixed(1)),
                  y_mm: 46.0,
                  width_mm: 27.0,
                  height_mm: 21.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.type === "name") {
              return {
                ...el,
                position: {
                  x_mm: 10.0,
                  y_mm: 24.0,
                  width_mm: parseFloat((80.0 * wRatio).toFixed(1)),
                  height_mm: 12.0,
                  rotation_deg: 0,
                  z_index: 2,
                },
              };
            }
            if (el.type === "wca_id") {
              return {
                ...el,
                position: {
                  x_mm: 10.0,
                  y_mm: 39.0,
                  width_mm: parseFloat((80.0 * wRatio).toFixed(1)),
                  height_mm: 8.0,
                  rotation_deg: 0,
                  z_index: 3,
                },
              };
            }
            if (el.type === "role") {
              return {
                ...el,
                position: {
                  x_mm: 20.0,
                  y_mm: 50.0,
                  width_mm: parseFloat((60.0 * wRatio).toFixed(1)),
                  height_mm: 9.0,
                  rotation_deg: 0,
                  z_index: 4,
                },
              };
            }
          }

          // Custom dimension proportional adjustment
          return {
            ...el,
            position: {
              ...el.position,
              x_mm: parseFloat((el.position.x_mm * scaleX).toFixed(1)),
              y_mm: parseFloat((el.position.y_mm * scaleY).toFixed(1)),
              width_mm: parseFloat((el.position.width_mm * scaleX).toFixed(1)),
              height_mm: parseFloat((el.position.height_mm * scaleY).toFixed(1)),
            },
          };
        });

      return {
        ...prev,
        dimensions: newDims,
        sides: {
          front: {
            ...prev.sides.front,
            elements: scaleElements(prev.sides.front.elements),
          },
          back: {
            ...prev.sides.back,
            elements: scaleElements(prev.sides.back.elements),
          },
        },
      };
    });
  };

  const handleUpdateElement = (patch: Partial<BadgeElement>) => {
    if (!selectedElementId) return;
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: {
            ...side,
            elements: side.elements.map((e) =>
              e.id === selectedElementId ? { ...e, ...patch } : e
            ),
          },
        },
      };
    });
  };

  const handleDeleteElement = (id: string) => {
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: {
            ...side,
            elements: side.elements.filter((e) => e.id !== id),
          },
        },
      };
    });
    setSelectedElementId(null);
  };

  const handleLayerChange = (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => {
    if (!selectedElementId) return;
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      const elements = [...side.elements];
      const target = elements.find((e) => e.id === selectedElementId);
      if (!target) return prev;

      if (action === "bring_to_front") {
        const maxZ = Math.max(...elements.map((e) => e.position.z_index), 0);
        target.position.z_index = maxZ + 1;
      } else if (action === "send_to_back") {
        const minZ = Math.min(...elements.map((e) => e.position.z_index), 1);
        target.position.z_index = Math.max(1, minZ - 1);
      } else if (action === "move_up") {
        target.position.z_index += 1;
      } else if (action === "move_down") {
        target.position.z_index = Math.max(1, target.position.z_index - 1);
      }

      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: { ...side, elements },
        },
      };
    });
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const clientParsed = parseClientCsv(text);
    if (clientParsed.length > 0) {
      setCompetitors(clientParsed);
      setCurrentParticipantIndex(0);
    }

    const formData = new FormData();
    formData.append("file", file);
    fetch(getApiUrl("/api/competitors/upload-csv"), { method: "POST", body: formData })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.competitors?.length > 0) {
          setCompetitors(data.competitors);
        }
      })
      .catch(() => {});
  };

  const handleUploadAssignmentsPdf = async (file: File) => {
    try {
      setIsUploadingAssignments(true);
      setAssignmentStatusMessage("Parsing competitor cards from PDF...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(getApiUrl("/api/wca/pdf/upload-assignments"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to parse competitor cards PDF");
      }

      const data = await res.json();
      const cards = data.cards || [];
      const byRegId = data.assignments_by_reg_id || {};
      const byWcaId = data.assignments_by_wca_id || {};
      const byName = data.assignments_by_name || {};

      let matchedCount = 0;
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .replace(/[\(\)\[\],]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      if (competitors.length > 0) {
        setCompetitors((prev) =>
          prev.map((c) => {
            let foundAssign = null;
            if (c.registrant_id && byRegId[String(c.registrant_id)]) {
              foundAssign = byRegId[String(c.registrant_id)];
            } else if (c.wca_id && byWcaId[c.wca_id.toUpperCase()]) {
              foundAssign = byWcaId[c.wca_id.toUpperCase()];
            } else {
              const normLatin = normalize(c.name_latin || "");
              const normRaw = normalize(c.name_raw || "");
              for (const [key, val] of Object.entries(byName)) {
                if (
                  key === normLatin ||
                  key === normRaw ||
                  normLatin.includes(key) ||
                  key.includes(normLatin)
                ) {
                  foundAssign = val;
                  break;
                }
              }
            }

            if (foundAssign) {
              matchedCount++;
              return { ...c, assignments: foundAssign };
            }
            return { ...c, assignments: {} };
          })
        );
      } else {
        const defaultRoleId = roles[0]?.id || "r-participant";
        const newCompetitors: Competitor[] = cards.map((card: any, idx: number) => ({
          id: `card-c-${idx + 1}`,
          csv_index: card.registrant_id || idx + 1,
          name_latin: card.name.split("(")[0].trim(),
          name_local: card.name.includes("(")
            ? card.name.match(/\((.*?)\)/)?.[1] || null
            : null,
          name_raw: card.name,
          wca_id: card.wca_id,
          country_iso2: "UA",
          country_name: "Ukraine",
          role_id: defaultRoleId,
          registrant_id: card.registrant_id,
          assignments: card.assignments,
        }));
        setCompetitors(newCompetitors);
        matchedCount = newCompetitors.length;
      }

      setAssignmentStatusMessage(
        `Loaded ${data.total_cards} cards! Successfully assigned tasks to ${matchedCount} competitors.`
      );
      setTimeout(() => setAssignmentStatusMessage(null), 6000);
    } catch (err: any) {
      console.error("PDF assignment upload error:", err);
      setAssignmentStatusMessage(`Error: ${err.message || "Failed to parse cards"}`);
      setTimeout(() => setAssignmentStatusMessage(null), 6000);
    } finally {
      setIsUploadingAssignments(false);
    }
  };

  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize background image to max 1800px dimension and JPEG 0.88 quality
        // Preserves crisp 300-400 DPI print quality while reducing payload from ~10MB to ~300KB (preventing Lambda payload limits and OOM)
        const maxDim = 1800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        let optimizedUrl = rawDataUrl;
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          optimizedUrl = canvas.toDataURL("image/jpeg", 0.88);
        }
        setTemplate((prev) => ({
          ...prev,
          sides: {
            ...prev.sides,
            [currentSide]: {
              ...prev.sides[currentSide],
              background_url: optimizedUrl,
            },
          },
        }));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAddRole = (name: string) => {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name,
      is_default: false,
      style: {
        font_family: "Inter",
        font_size: 14,
        font_weight: "600",
        italic: false,
        text_align: "center",
        text_color: "#FFFFFF",
        background_color: "#7C3AED",
        border_radius: 4.0,
        border_width: 0.0,
        border_color: "#000000",
        opacity: 1.0,
      },
    };
    setRoles((prev) => [...prev, newRole]);
    setActiveRoleId(newRole.id);
  };

  const handleUpdateRole = (roleId: string, patch: { name?: string; style?: Partial<RoleStyle> }) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        return {
          ...r,
          name: patch.name !== undefined ? patch.name : r.name,
          style: patch.style ? { ...r.style, ...patch.style } : r.style,
        };
      })
    );
  };

  const handleAssignUser = (roleId: string, competitorId: string) => {
    setCompetitors((prev) =>
      prev.map((c) => (c.id === competitorId ? { ...c, role_id: roleId } : c))
    );
  };

  const handleAssignAllToRole = (roleId: string) => {
    setCompetitors((prev) => prev.map((c) => ({ ...c, role_id: roleId })));
  };

  const handleSetDefaultRole = (roleId: string) => {
    setRoles((prev) => prev.map((r) => ({ ...r, is_default: r.id === roleId })));
  };

  const handleSelectElement = (id: string | null) => {
    setSelectedElementId(id);
    if (id) {
      const elem = currentSideConfig.elements.find((e) => e.id === id);
      if (elem?.type === "role") {
        const currentComp = competitors[currentParticipantIndex];
        if (currentComp?.role_id) {
          setActiveRoleId(currentComp.role_id);
        }
      }
    }
  };

  const fetchCompetitionSchedule = async (compId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (wcaToken) headers["Authorization"] = `Bearer ${wcaToken}`;
      const res = await fetch(getApiUrl(`/api/wca/competitions/${compId}/schedule`), { headers });
      if (res.ok) {
        const data = await res.json();
        setCompetitionSchedule(data);
        // Also update template elements with the schedule data and competition title
        setTemplate((prev) => {
          const updateSides = { ...prev.sides };
          for (const sideKey of ["front", "back"] as const) {
            const side = updateSides[sideKey];
            if (side && side.elements) {
              updateSides[sideKey] = {
                ...side,
                elements: side.elements.map((elem) =>
                  elem.type === "schedule"
                    ? {
                        ...elem,
                        schedule_data: data,
                        schedule_title: elem.schedule_title || data.competition_name || compId,
                      }
                    : elem
                ),
              };
            }
          }
          return { ...prev, sides: updateSides };
        });
      }
    } catch (e) {
      console.warn("Could not fetch competition schedule:", e);
    }
  };

  const handleAddAdditionalQrCode = () => {
    const newId = `elem-qr_code-${Date.now()}`;
    setTemplate((prev) => {
      const side = prev.sides[currentSide];
      const qrElements = side.elements.filter((e) => e.type === "qr_code");
      const offsetMm = (qrElements.length % 4) * 12;
      const newElem: BadgeElement = {
        id: newId,
        type: "qr_code",
        enabled: true,
        position: {
          x_mm: Math.min(prev.dimensions.width_mm - 26, 12 + offsetMm),
          y_mm: Math.min(prev.dimensions.height_mm - 26, 20 + offsetMm),
          width_mm: 22,
          height_mm: 22,
          z_index: side.elements.length + 1,
          rotation_deg: 0,
        },
        opacity: 1.0,
        qr_content: "https://competitiongroups.com",
        qr_label: `GROUPS ${qrElements.length + 1}`,
        qr_label_position: "top",
      };

      return {
        ...prev,
        sides: {
          ...prev.sides,
          [currentSide]: {
            ...side,
            elements: [...side.elements, newElem],
          },
        },
      };
    });
    setSelectedElementId(newId);
  };

  const handleImportWcaCompetitors = (imported: Competitor[], compId?: string) => {
    setCompetitors(imported);
    setCurrentParticipantIndex(0);
    const resolvedCompId = compId || (imported[0] as any)?.competition_id;
    if (resolvedCompId) {
      fetchCompetitionSchedule(resolvedCompId);
    }
  };

  const handleAddCustomCompetitor = (newComp: Competitor) => {
    setCompetitors((prev) => {
      const updated = [...prev, newComp];
      setCurrentParticipantIndex(updated.length - 1);
      return updated;
    });
  };

  const handleGenerateBadges = async () => {
    setIsGenerating(true);
    try {
      await exportBadges(template, competitors, roles, { side: currentSide });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900">
      {/* Top Bar Section with WCA Profile status */}
      <TopNav
        currentSide={currentSide}
        onSideChange={setCurrentSide}
        onGenerate={() => setIsExportModalOpen(true)}
        isGenerating={isGenerating}
        wcaProfile={wcaProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onWcaLogin={handleWcaOAuthLogin}
        onWcaLogout={handleLogout}
        isWcaAuthenticating={isWcaAuthenticating}
      />

      {/* Auth notification banners */}
      {isWcaAuthenticating && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0057B7] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn border border-blue-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200">World Cube Association</div>
            <div className="text-sm font-semibold">Authenticating account & fetching competitions...</div>
          </div>
        </div>
      )}

      {authError && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn border border-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-200 flex-shrink-0" />
          <div className="text-sm font-semibold">{authError}</div>
          <button
            onClick={() => setAuthError(null)}
            className="p-1 hover:bg-rose-700 rounded-lg text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Section: 3 Containers (Left Panel, Canvas, Right Panel) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Container: General Badge Settings & WCA Import */}
        <LeftPanel
          dimensions={template.dimensions}
          onDimensionsChange={handleDimensionsChange}
          competitors={competitors}
          currentParticipantIndex={currentParticipantIndex}
          onParticipantChange={setCurrentParticipantIndex}
          onCsvUpload={handleCsvUpload}
          onBackgroundUpload={handleBackgroundUpload}
          onOpenWcaModal={() => setIsWcaModalOpen(true)}
          onOpenAddCustomModal={() => setIsAddCustomModalOpen(true)}
          enabledFields={enabledFields}
          onToggleField={handleToggleField}
          onUploadCompetitorAvatar={handleUploadCompetitorAvatar}
          isFetchingAvatars={isFetchingAvatars}
          onAddAdditionalQrCode={handleAddAdditionalQrCode}
          onDeleteCompetitor={handleDeleteCompetitor}
        />

        {/* Central Container: Badge Preview Canvas */}
        <Canvas
          dimensions={template.dimensions}
          elements={currentSideConfig.elements}
          backgroundUrl={currentSideConfig.background_url}
          selectedElementId={selectedElementId}
          onSelectElement={handleSelectElement}
          onUpdateElementPosition={handleUpdateElementPosition}
          onDeleteElement={handleDeleteElement}
          currentCompetitor={competitors[currentParticipantIndex]}
          roles={roles}
          scheduleData={competitionSchedule}
        />

        {/* Right Container: Properties Inspector */}
        <RightPanel
          selectedElement={selectedElement}
          badgeDimensions={template.dimensions}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          roles={roles}
          activeRoleId={activeRoleId}
          onSelectRole={setActiveRoleId}
          onAddRole={handleAddRole}
          onUpdateRole={handleUpdateRole}
          competitors={competitors}
          onAssignUser={handleAssignUser}
          onAssignAll={handleAssignAllToRole}
          onSetDefaultRole={handleSetDefaultRole}
          currentCompetitorId={competitors[currentParticipantIndex]?.id}
          currentCompetitor={competitors[currentParticipantIndex]}
          onUploadPhoto={(file) => {
            const comp = competitors[currentParticipantIndex];
            if (comp) handleUploadCompetitorAvatar(comp.id, file);
          }}
          onRemovePhoto={() => {
            const comp = competitors[currentParticipantIndex];
            if (comp) handleRemoveCompetitorAvatar(comp.id);
          }}
          onFetchWcaAvatar={() => {
            const comp = competitors[currentParticipantIndex];
            if (comp?.wca_id) fetchSingleWcaAvatar(comp.id, comp.wca_id);
          }}
          isFetchingAvatar={isFetchingAvatars}
          onLayerChange={handleLayerChange}
          onAddAdditionalQrCode={handleAddAdditionalQrCode}
          onUploadAssignmentsPdf={handleUploadAssignmentsPdf}
          isUploadingAssignments={isUploadingAssignments}
          assignmentStatusMessage={assignmentStatusMessage}
        />
      </div>

      {/* WCA Profile Authentication & Management Modal */}
      <WcaProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={wcaProfile}
        competitions={wcaCompetitions}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenCompetitionImport={() => setIsWcaModalOpen(true)}
      />

      {/* WCA Competition Import Modal (Filtered by user roles: Approved, Pending, Cancelled) */}
      <WcaImportModal
        isOpen={isWcaModalOpen}
        onClose={() => setIsWcaModalOpen(false)}
        onImportCompetitors={handleImportWcaCompetitors}
        competitions={wcaCompetitions}
        wcaProfile={wcaProfile}
        wcaToken={wcaToken}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Add Custom Person Modal */}
      <AddCustomAttendeeModal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        roles={roles}
        onAddCompetitor={handleAddCustomCompetitor}
      />

      {/* Multi-Paper & Duplex PDF Export Modal */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={async (options) => {
          setIsGenerating(true);
          try {
            await exportBadges(template, competitors, roles, options);
          } finally {
            setIsGenerating(false);
          }
        }}
        dimensions={template.dimensions}
        totalCompetitors={competitors.length}
        template={template}
        competitors={competitors}
        roles={roles}
        scheduleData={competitionSchedule}
      />
    </div>
  );
};
