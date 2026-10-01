import React from "react";
import * as Flags from "country-flag-icons/react/3x2";

interface FlagProps {
  iso2: string;
  className?: string;
  opacity?: number;
}

export const CountryFlag: React.FC<FlagProps> = ({ iso2, className = "w-full h-full", opacity = 1.0 }) => {
  const code = (iso2 || "UA").toUpperCase();
  const FlagComp = (Flags as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[code];

  if (FlagComp) {
    return (
      <div
        className={`${className} border border-slate-200/60 rounded-[2px] shadow-sm overflow-hidden flex items-center justify-center`}
        style={{ opacity }}
      >
        <FlagComp className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback for custom or unrecognized ISO codes
  return (
    <svg
      viewBox="0 0 30 20"
      className={`${className} border border-slate-200/60 rounded-[2px] shadow-sm overflow-hidden`}
      style={{ opacity }}
      preserveAspectRatio="none"
    >
      <rect width="30" height="20" fill="#3B82F6" />
      <text x="15" y="13" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
        {code.slice(0, 2)}
      </text>
    </svg>
  );
};
