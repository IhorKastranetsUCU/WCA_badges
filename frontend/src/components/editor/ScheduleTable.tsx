import React from "react";
import { Competitor } from "@/types/competitor";

interface ScheduleTableProps {
  widthPx: number;
  heightPx: number;
  scale: number;
  competitor?: Competitor;
  title?: string;
  customData?: any;
}

interface ScheduleEntry {
  time: string;
  event: string;
  task?: string;
  isBreak?: boolean;
  roomId?: number;
  roomName?: string;
  roomColor?: string;
}

interface ScheduleDay {
  dayName: string;
  entries: ScheduleEntry[];
}

const DEFAULT_DAYS: ScheduleDay[] = [
  {
    dayName: "Thursday",
    entries: [
      { time: "9:00", event: "3x3 OH Round 1 - G1" },
      { time: "9:20", event: "3x3 OH Round 1 - G2", task: "C" },
      { time: "9:45", event: "3x3 OH Round 1 - G3" },
      { time: "9:55", event: "3x3 FM Attempt 1" },
      { time: "10:05", event: "3x3 OH Round 1 - G4" },
      { time: "10:30", event: "3x3 OH Round 1 - G5" },
      { time: "10:50", event: "3x3 OH Round 1 - G6" },
      { time: "11:15", event: "7x7 Round 1 - G1" },
      { time: "11:45", event: "7x7 Round 1 - G2" },
      { time: "12:15", event: "OPENING", isBreak: true },
      { time: "12:45", event: "LUNCH", isBreak: true },
      { time: "13:40", event: "4x4x4 Round 1 - G1" },
      { time: "14:05", event: "4x4x4 Round 1 - G2" },
      { time: "14:30", event: "4x4x4 Round 1 - G3" },
      { time: "14:55", event: "4x4x4 Round 1 - G4" },
      { time: "15:20", event: "4x4x4 Round 1 - G5" },
      { time: "15:45", event: "4x4x4 Round 1 - G6", task: "C" },
      { time: "16:10", event: "Clock Round 1 - G1" },
      { time: "16:30", event: "Clock Round 1 - G2" },
      { time: "16:50", event: "Clock Round 1 - G3" },
      { time: "17:15", event: "Clock Round 1 - G4", task: "C" },
      { time: "17:35", event: "3x3 OH Round 2" },
      { time: "18:00", event: "4x4x4 Round 2", task: "QR" },
      { time: "18:50", event: "DINNER", isBreak: true },
    ],
  },
  {
    dayName: "Friday",
    entries: [
      { time: "9:00", event: "Skewb Round 1 - G1" },
      { time: "9:15", event: "Skewb Round 1 - G2" },
      { time: "9:30", event: "3x3 FM Attempt 2", task: "C" },
      { time: "9:35", event: "Skewb Round 1 - G3" },
      { time: "9:50", event: "Skewb Round 1 - G4" },
      { time: "10:10", event: "Skewb Round 1 - G5" },
      { time: "10:25", event: "Skewb Round 1 - G6" },
      { time: "10:45", event: "6x6 Round 1 - G1" },
      { time: "11:15", event: "6x6 Round 1 - G2" },
      { time: "11:40", event: "3x3 BF Round 1 - G1" },
      { time: "12:00", event: "3x3 BF Round 1 - G2", task: "C" },
      { time: "12:20", event: "LUNCH", isBreak: true },
      { time: "13:20", event: "Sq-1 Round 1 - G1", task: "C" },
      { time: "13:40", event: "Sq-1 Round 1 - G2" },
      { time: "14:00", event: "Sq-1 Round 1 - G3" },
      { time: "14:20", event: "2x2x2 Round 1 - G1" },
      { time: "14:35", event: "2x2x2 Round 1 - G2", task: "C" },
      { time: "15:00", event: "2x2x2 Round 1 - G3" },
      { time: "15:20", event: "3x3 MBF Attempt 2" },
      { time: "15:30", event: "2x2x2 Round 1 - G5" },
      { time: "16:10", event: "2x2x2 Round 1 - G7" },
      { time: "16:30", event: "Mega Round 1 - G1" },
      { time: "16:55", event: "Mega Round 1 - G2", task: "C" },
      { time: "18:20", event: "3x3 OH Final", task: "QR" },
    ],
  },
  {
    dayName: "Saturday",
    entries: [
      { time: "9:00", event: "5x5x5 Round 1 - G1" },
      { time: "9:10", event: "4BLD Final" },
      { time: "9:25", event: "5x5x5 Round 1 - G2" },
      { time: "9:55", event: "5x5x5 Round 1 - G3", task: "C" },
      { time: "10:20", event: "5x5x5 Round 1 - G4" },
      { time: "10:50", event: "Pyra Round 1 - G1" },
      { time: "11:05", event: "Pyra Round 1 - G2" },
      { time: "11:25", event: "Pyra Round 1 - G3" },
      { time: "11:35", event: "5BLD Final" },
      { time: "11:40", event: "Pyra Round 1 - G4" },
      { time: "12:00", event: "Pyra Round 1 - G5" },
      { time: "12:15", event: "Pyra Round 1 - G6", task: "C" },
      { time: "12:35", event: "LUNCH", isBreak: true },
      { time: "13:35", event: "2x2x2 Round 2", task: "QR" },
      { time: "14:20", event: "Skewb Round 2" },
      { time: "14:40", event: "3x3x3 Round 1 - G1" },
      { time: "15:00", event: "3x3 FM Attempt 3", task: "C" },
      { time: "15:25", event: "3x3x3 Round 1 - G3" },
      { time: "15:45", event: "3x3x3 Round 1 - G4" },
      { time: "16:30", event: "3x3x3 Round 1 - G6", task: "C" },
      { time: "16:55", event: "3x3x3 Round 1 - G7" },
      { time: "17:15", event: "3x3x3 Round 1 - G8" },
      { time: "17:50", event: "6x6x6 Final" },
      { time: "18:15", event: "Skewb Final", task: "QR" },
    ],
  },
  {
    dayName: "Sunday",
    entries: [
      { time: "10:00", event: "3x3x3 Round 2 - G1" },
      { time: "10:20", event: "3x3x3 Round 2 - G2" },
      { time: "10:50", event: "3x3x3 Round 2 - G3" },
      { time: "11:10", event: "3x3x3 Round 2 - G4", task: "QR" },
      { time: "11:30", event: "5x5x5 Round 2" },
      { time: "12:00", event: "Pyraminx Round 2" },
      { time: "12:20", event: "3x3x3 BF Round 2" },
      { time: "12:40", event: "Square-1 Round 2" },
      { time: "13:00", event: "3x3x3 Semifinal" },
      { time: "13:25", event: "LUNCH", isBreak: true },
      { time: "14:25", event: "5x5x5 Final" },
      { time: "14:50", event: "3x3 BF Final" },
      { time: "15:15", event: "Pyraminx Final", task: "QR" },
      { time: "15:40", event: "Square-1 Final" },
      { time: "16:15", event: "3x3x3 Final" },
      { time: "17:50", event: "AWARDS", isBreak: true },
    ],
  },
];

export function formatScheduleEventName(name: string): string {
  let cleaned = String(name || "");
  cleaned = cleaned.replace(/\bR1\b/g, "Round 1");
  cleaned = cleaned.replace(/\bR2\b/g, "Round 2");
  cleaned = cleaned.replace(/\bR3\b/g, "Round 3");
  cleaned = cleaned.replace(/\bR4\b/g, "Round 4");
  cleaned = cleaned.replace(/\bA1\b/g, "Attempt 1");
  cleaned = cleaned.replace(/\bA2\b/g, "Attempt 2");
  cleaned = cleaned.replace(/\bA3\b/g, "Attempt 3");
  cleaned = cleaned.replace(/\bSemi\b/g, "Semifinal");
  return cleaned;
}

export function resolveCompetitorTask(
  entry: ScheduleEntry,
  assignments?: Record<string, { comp?: string[]; scr?: string[]; judge?: string[]; runner?: string[] }> | null
): string {
  if (!assignments || entry.isBreak) return "";

  const code = (entry as any).code?.toLowerCase() || "";
  const evName = (entry.event || "").toLowerCase();

  let eventId: string | null = null;
  if (code.includes("333oh") || evName.includes("one-handed") || evName.includes("3x3 oh")) {
    eventId = "333oh";
  } else if (code.includes("333bf") || evName.includes("3x3 bf") || evName.includes("blindfolded")) {
    eventId = "333bf";
  } else if (code.includes("333fm") || evName.includes("fewest moves") || evName.includes("3x3 fm")) {
    eventId = "333fm";
  } else if (code.includes("333mbf") || evName.includes("multi-blind") || evName.includes("3x3 mbf")) {
    eventId = "333mbf";
  } else if (code.includes("333") || evName.includes("3x3x3") || evName.includes("3x3")) {
    eventId = "333";
  } else if (code.includes("222") || evName.includes("2x2x2") || evName.includes("2x2")) {
    eventId = "222";
  } else if (code.includes("444") || evName.includes("4x4x4") || evName.includes("4x4")) {
    eventId = "444";
  } else if (code.includes("555") || evName.includes("5x5x5") || evName.includes("5x5")) {
    eventId = "555";
  } else if (code.includes("666") || evName.includes("6x6x6") || evName.includes("6x6")) {
    eventId = "666";
  } else if (code.includes("777") || evName.includes("7x7x7") || evName.includes("7x7")) {
    eventId = "777";
  } else if (code.includes("clock") || evName.includes("clock")) {
    eventId = "clock";
  } else if (code.includes("minx") || evName.includes("megaminx") || evName.includes("mega")) {
    eventId = "minx";
  } else if (code.includes("pyram") || evName.includes("pyraminx") || evName.includes("pyra")) {
    eventId = "pyram";
  } else if (code.includes("skewb") || evName.includes("skewb")) {
    eventId = "skewb";
  } else if (code.includes("sq1") || evName.includes("square-1") || evName.includes("sq-1")) {
    eventId = "sq1";
  }

  if (!eventId || !assignments[eventId]) return "";

  const evAssign = assignments[eventId];
  const compGroups = (evAssign.comp || []).map(String);
  const scrGroups = (evAssign.scr || []).map(String);
  const judgeGroups = (evAssign.judge || []).map(String);
  const runnerGroups = (evAssign.runner || []).map(String);

  // Group number match: e.g. -g2, - G2, Group 2, G2
  const groupMatch =
    code.match(/-g(\d+)/i) ||
    entry.event.match(/(?:^|\s|-|G)(?:roup\s*|G)(\d+)(?:\s|$|-)/i);

  if (groupMatch) {
    const gNum = groupMatch[1];
    if (compGroups.includes(gNum)) return `C ${gNum}`;
    if (scrGroups.includes(gNum)) return `S ${gNum}`;
    if (judgeGroups.includes(gNum)) return `J ${gNum}`;
    if (runnerGroups.includes(gNum)) return `R ${gNum}`;
    return "";
  }

  // Round-level:
  if (compGroups.length > 0) return `C ${compGroups[0]}`;
  if (scrGroups.length > 0) return `S ${scrGroups[0]}`;
  if (judgeGroups.length > 0) return `J ${judgeGroups[0]}`;
  if (runnerGroups.length > 0) return `R ${runnerGroups[0]}`;

  return "";
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  widthPx,
  heightPx,
  scale,
  competitor,
  title,
  customData,
}) => {
  const isRealSchedule = Boolean(customData?.days && customData.days.length > 0);
  const days: ScheduleDay[] = (isRealSchedule ? customData.days : DEFAULT_DAYS).slice(0, 4);
  const colCount = Math.max(1, days.length);

  // Responsive font calculation that stays legible and scales proportionally
  const baseScale = Math.min(widthPx / 320, heightPx / 160);
  const headerFontSize = Math.max(7.0, Math.min(14, 8.5 * baseScale));
  const rowFontSize = Math.max(6.5, Math.min(12, 7.0 * baseScale));
  const paddingY = Math.max(0.5, Math.min(3.0, 1.2 * baseScale));

  const hasAssignments = Boolean(
    competitor?.assignments && Object.keys(competitor.assignments).length > 0
  );

  const getTaskBadgeStyle = (task?: string) => {
    if (!task) return "";
    const t = task.trim().toUpperCase();
    if (t.startsWith("S")) {
      return "bg-red-600 text-white font-extrabold border border-red-700 shadow-xs";
    }
    if (t.startsWith("J")) {
      return "bg-amber-400 text-amber-950 font-extrabold border border-amber-500 shadow-xs";
    }
    if (t.startsWith("C")) {
      return "bg-blue-600 text-white font-extrabold border border-blue-700 shadow-xs";
    }
    if (t.startsWith("R")) {
      return "bg-emerald-600 text-white font-extrabold border border-emerald-700 shadow-xs";
    }
    if (t === "QR") {
      return "bg-slate-200 text-slate-800 font-bold";
    }
    return "bg-slate-100 text-slate-700 font-semibold";
  };

  const displayTitle = title || (isRealSchedule ? customData?.competition_name : null);

  return (
    <div
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      className="flex flex-col bg-white overflow-hidden select-none border border-slate-300 rounded shadow-sm"
    >
      {/* Title Header */}
      {displayTitle ? (
        <div
          style={{ fontSize: `${headerFontSize * 1.05}px` }}
          className="bg-slate-800 text-white font-bold text-center py-0.5 tracking-wide uppercase truncate shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>{displayTitle}</span>
          {!isRealSchedule && (
            <span className="text-[8px] bg-amber-500 text-slate-900 px-1 py-0.2 rounded font-extrabold normal-case tracking-normal">
              Demo Preview
            </span>
          )}
        </div>
      ) : !isRealSchedule ? (
        <div
          style={{ fontSize: `${headerFontSize * 0.9}px` }}
          className="bg-slate-800 text-amber-300 font-semibold text-center py-0.5 tracking-tight truncate shrink-0"
        >
          Sample Schedule Preview (Import WCA Competition to load real schedule)
        </div>
      ) : null}

      {/* Columns for Days */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
        className="flex-1 divide-x divide-slate-300 overflow-hidden min-h-0"
      >
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="flex flex-col h-full overflow-hidden min-w-0">
            {/* Day Header */}
            <div
              style={{ fontSize: `${headerFontSize}px` }}
              className="bg-slate-700 text-white font-bold text-center py-0.5 px-1 truncate uppercase tracking-tight shrink-0 whitespace-nowrap"
              title={day.dayName}
            >
              {day.dayName}
            </div>

            {/* Subheader: Time / Event / Task */}
            <div
              style={{ fontSize: `${Math.max(6, rowFontSize * 0.88)}px` }}
              className="bg-slate-200 text-slate-700 font-bold flex items-center border-b border-slate-300 py-0.5 px-0.5 shrink-0"
            >
              <span className="w-[28%] text-left truncate">Time</span>
              <span className="w-[48%] text-left truncate">Event</span>
              <span className="w-[24%] text-center truncate">Task</span>
            </div>

            {/* Entries List with equal distribution (gap-less) */}
            <div className="flex-1 flex flex-col justify-start overflow-hidden divide-y divide-slate-100 min-h-0">
              {day.entries.slice(0, 22).map((entry, eIdx) => {
                const isBreak = entry.isBreak;
                // If competitor assignments are present, resolve personal task.
                // If competitor has no assignment, leave field completely empty ("").
                // If in demo preview mode without real schedule, show demo preview task.
                const taskToRender = hasAssignments
                  ? resolveCompetitorTask(entry, competitor?.assignments)
                  : isRealSchedule
                  ? ""
                  : entry.task || "";

                const formattedEvent = formatScheduleEventName(entry.event);

                return (
                  <div
                    key={eIdx}
                    style={{
                      fontSize: `${rowFontSize}px`,
                      paddingTop: `${paddingY}px`,
                      paddingBottom: `${paddingY}px`,
                      backgroundColor: entry.roomColor
                        ? `${entry.roomColor}28`
                        : undefined,
                      borderLeft: entry.roomColor
                        ? `2.5px solid ${entry.roomColor}`
                        : undefined,
                    }}
                    className={`flex-1 min-h-0 flex items-center px-0.5 leading-none transition-colors ${
                      isBreak
                        ? "bg-slate-100/90 font-bold text-slate-700 justify-center text-center"
                        : "hover:bg-slate-50 text-slate-900"
                    }`}
                  >
                    {isBreak ? (
                      <span className="w-full text-center truncate tracking-tight" title={formattedEvent}>
                        {formattedEvent}
                      </span>
                    ) : (
                      <>
                        <span className="w-[28%] font-mono text-[0.9em] text-slate-600 truncate">
                          {entry.time}
                        </span>
                        <span
                          className="w-[48%] truncate font-medium text-slate-800"
                          title={formattedEvent}
                        >
                          {formattedEvent}
                        </span>
                        <span className="w-[24%] flex items-center justify-center">
                          {taskToRender ? (
                            <span
                              className={`px-1 py-0.2 rounded text-[0.8em] font-extrabold tracking-tight ${getTaskBadgeStyle(
                                taskToRender
                              )}`}
                            >
                              {taskToRender}
                            </span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
