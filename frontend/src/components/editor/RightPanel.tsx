import React, { useState } from "react";
import { Trash2, Sliders, Move } from "lucide-react";
import { BadgeDimensions, BadgeElement } from "@/types/badge";
import { Competitor, Role, RoleStyle } from "@/types/competitor";
import { TypographyInspector } from "../properties/TypographyInspector";
import { AppearanceInspector } from "../properties/AppearanceInspector";
import { PositionInspector } from "../properties/PositionInspector";
import { RoleInspector } from "../properties/RoleInspector";
import { FlagInspector } from "../properties/FlagInspector";
import { AvatarInspector } from "../properties/AvatarInspector";
import { QrCodeInspector } from "../properties/QrCodeInspector";
import { ScheduleInspector } from "../properties/ScheduleInspector";

interface RightPanelProps {
  selectedElement: BadgeElement | null;
  badgeDimensions: BadgeDimensions;
  onUpdateElement: (patch: Partial<BadgeElement>) => void;
  onDeleteElement: (id: string) => void;
  roles: Role[];
  activeRoleId: string;
  onSelectRole: (roleId: string) => void;
  onAddRole: (name: string) => void;
  onUpdateRole: (roleId: string, patch: { name?: string; style?: Partial<RoleStyle> }) => void;
  competitors: Competitor[];
  onAssignUser: (roleId: string, competitorId: string) => void;
  onAssignAll?: (roleId: string) => void;
  onSetDefaultRole?: (roleId: string) => void;
  currentCompetitorId?: string;
  currentCompetitor?: Competitor;
  onUploadPhoto?: (file: File) => void;
  onRemovePhoto?: () => void;
  onFetchWcaAvatar?: () => void;
  isFetchingAvatar?: boolean;
  onLayerChange: (action: "bring_to_front" | "send_to_back" | "move_up" | "move_down") => void;
  onAddAdditionalQrCode?: () => void;
  onUploadAssignmentsPdf?: (file: File) => void;
  isUploadingAssignments?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  selectedElement,
  badgeDimensions,
  onUpdateElement,
  onDeleteElement,
  roles,
  activeRoleId,
  onSelectRole,
  onAddRole,
  onUpdateRole,
  competitors,
  onAssignUser,
  onAssignAll,
  onSetDefaultRole,
  currentCompetitorId,
  currentCompetitor,
  onUploadPhoto,
  onRemovePhoto,
  onFetchWcaAvatar,
  isFetchingAvatar = false,
  onLayerChange,
  onAddAdditionalQrCode,
  onUploadAssignmentsPdf,
  isUploadingAssignments = false,
}) => {
  const [activeTab, setActiveTab] = useState<"style" | "position">("style");

  if (!selectedElement) {
    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-4rem)] p-6 select-none justify-center items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">No Object Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Click any text, flag, or badge element on the canvas to inspect its typography, position, or role styling.
        </p>
      </aside>
    );
  }

  const getElementTitle = () => {
    switch (selectedElement.type) {
      case "name":
        return "Participant Name";
      case "wca_id":
        return "WCA ID";
      case "competition_id":
        return "Competition ID";
      case "role":
        return "Role Management";
      case "flag":
        return "Country Flag (SVG)";
      case "avatar":
        return "Competitor Photo (WCA)";
      case "qr_code":
        return "QR Code & Label";
      case "schedule":
        return "Competition Schedule";
      default:
        return "Element Properties";
    }
  };

  const isRole = selectedElement.type === "role";
  const isFlag = selectedElement.type === "flag";
  const isAvatar = selectedElement.type === "avatar";
  const isQr = selectedElement.type === "qr_code";
  const isSchedule = selectedElement.type === "schedule";

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto select-none p-5 space-y-5">
      {/* Header with Title and "Throw the piece" (Delete) Button */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Properties</span>
          <h2 className="text-sm font-bold text-slate-800">{getElementTitle()}</h2>
        </div>

        <button
          type="button"
          onClick={() => onDeleteElement(selectedElement.id)}
          title="Throw the piece (Delete Object)"
          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          <span>Throw</span>
        </button>
      </div>

      {/* Role Management mode */}
      {isRole && (
        <RoleInspector
          roles={roles}
          activeRoleId={activeRoleId}
          onSelectRole={onSelectRole}
          onAddRole={onAddRole}
          onUpdateRole={onUpdateRole}
          competitors={competitors}
          onAssignUser={onAssignUser}
          onAssignAll={onAssignAll}
          onSetDefaultRole={onSetDefaultRole}
          currentCompetitorId={currentCompetitorId}
        />
      )}

      {/* Flag mode */}
      {isFlag && (
        <FlagInspector
          position={selectedElement.position}
          opacity={selectedElement.opacity || 1.0}
          badgeDimensions={badgeDimensions}
          onChangePosition={(patch) =>
            onUpdateElement({
              position: { ...selectedElement.position, ...patch },
            })
          }
          onChangeOpacity={(opacity) => onUpdateElement({ opacity })}
          onLayerChange={onLayerChange}
        />
      )}

      {/* Competitor Avatar/Photo mode */}
      {isAvatar && (
        <AvatarInspector
          position={selectedElement.position}
          opacity={selectedElement.opacity ?? 1.0}
          borderRadiusMm={selectedElement.border_radius_mm ?? 4}
          borderWidthMm={selectedElement.border_width_mm ?? 0}
          borderColor={selectedElement.border_color ?? "#cbd5e1"}
          badgeDimensions={badgeDimensions}
          currentCompetitor={currentCompetitor}
          onUploadPhoto={onUploadPhoto}
          onRemovePhoto={onRemovePhoto}
          onFetchWcaAvatar={onFetchWcaAvatar}
          isFetchingAvatar={isFetchingAvatar}
          onChangePosition={(patch) =>
            onUpdateElement({
              position: { ...selectedElement.position, ...patch },
            })
          }
          onChangeOpacity={(opacity) => onUpdateElement({ opacity })}
          onChangeRadius={(border_radius_mm) => onUpdateElement({ border_radius_mm })}
          onChangeBorder={(border_width_mm, border_color) =>
            onUpdateElement({ border_width_mm, border_color })
          }
          onLayerChange={onLayerChange}
        />
      )}

      {/* QR Code with Label mode */}
      {isQr && (
        <QrCodeInspector
          position={selectedElement.position}
          opacity={selectedElement.opacity ?? 1.0}
          qrContent={selectedElement.qr_content}
          qrLabel={selectedElement.qr_label}
          qrLabelPosition={selectedElement.qr_label_position}
          badgeDimensions={badgeDimensions}
          onChangePosition={(patch) =>
            onUpdateElement({
              position: { ...selectedElement.position, ...patch },
            })
          }
          onChangeOpacity={(opacity) => onUpdateElement({ opacity })}
          onChangeQr={(patch) => onUpdateElement(patch)}
          onLayerChange={onLayerChange}
          onAddAdditionalQrCode={onAddAdditionalQrCode}
        />
      )}

      {/* Competition Schedule mode */}
      {isSchedule && (
        <ScheduleInspector
          position={selectedElement.position}
          opacity={selectedElement.opacity ?? 1.0}
          scheduleTitle={selectedElement.schedule_title}
          badgeDimensions={badgeDimensions}
          onChangePosition={(patch) =>
            onUpdateElement({
              position: { ...selectedElement.position, ...patch },
            })
          }
          onChangeOpacity={(opacity) => onUpdateElement({ opacity })}
          onChangeTitle={(schedule_title) => onUpdateElement({ schedule_title })}
          onLayerChange={onLayerChange}
          onUploadAssignmentsPdf={onUploadAssignmentsPdf}
          isUploadingAssignments={isUploadingAssignments}
        />
      )}

      {/* Text Elements mode (Name, WCA ID, Competition ID) with Style and Position Tabs */}
      {!isRole && !isFlag && !isAvatar && !isQr && !isSchedule && selectedElement.style && (
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "style"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Style
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("position")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "position"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              Position
            </button>
          </div>

          {activeTab === "style" && (
            <div className="space-y-5">
              {/* Container 1: Typography */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Typography</span>
                <TypographyInspector
                  elementType={selectedElement.type}
                  style={selectedElement.style}
                  nameDisplay={selectedElement.name_display}
                  formatMode={selectedElement.format_mode}
                  formatPrefix={selectedElement.format_prefix}
                  formatSuffix={selectedElement.format_suffix}
                  onChangeStyle={(patch) =>
                    onUpdateElement({
                      style: { ...selectedElement.style!, ...patch },
                    })
                  }
                  onChangeNameDisplay={(mode) => onUpdateElement({ name_display: mode })}
                  onChangeFormatMode={(mode) => onUpdateElement({ format_mode: mode })}
                  onChangeFormatPrefix={(prefix) => onUpdateElement({ format_prefix: prefix })}
                  onChangeFormatSuffix={(suffix) => onUpdateElement({ format_suffix: suffix })}
                />
              </div>

              {/* Container 2: Appearance */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Appearance</span>
                <AppearanceInspector
                  style={selectedElement.style}
                  onChangeStyle={(patch) =>
                    onUpdateElement({
                      style: { ...selectedElement.style!, ...patch },
                    })
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "position" && (
            <PositionInspector
              position={selectedElement.position}
              badgeDimensions={badgeDimensions}
              onChangePosition={(patch) =>
                onUpdateElement({
                  position: { ...selectedElement.position, ...patch },
                })
              }
              onLayerChange={onLayerChange}
            />
          )}
        </div>
      )}
    </aside>
  );
};
