import React from "react";

interface FlagProps {
  iso2: string;
  className?: string;
  opacity?: number;
}

export const CountryFlag: React.FC<FlagProps> = ({ iso2, className = "w-full h-full", opacity = 1.0 }) => {
  const code = (iso2 || "UA").toUpperCase();

  let svgContent: React.ReactNode = null;

  switch (code) {
    case "UA":
      svgContent = (
        <>
          <rect width="30" height="10" fill="#0057B7" />
          <rect y="10" width="30" height="10" fill="#FFDD00" />
        </>
      );
      break;
    case "PL":
      svgContent = (
        <>
          <rect width="30" height="10" fill="#FFFFFF" />
          <rect y="10" width="30" height="10" fill="#DC143C" />
        </>
      );
      break;
    case "DE":
      svgContent = (
        <>
          <rect width="30" height="6.66" fill="#000000" />
          <rect y="6.66" width="30" height="6.66" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </>
      );
      break;
    case "FR":
      svgContent = (
        <>
          <rect width="10" height="20" fill="#002654" />
          <rect x="10" width="10" height="20" fill="#FFFFFF" />
          <rect x="20" width="10" height="20" fill="#ED2939" />
        </>
      );
      break;
    case "US":
      svgContent = (
        <>
          <rect width="30" height="20" fill="#B22234" />
          <rect y="3.07" width="30" height="3.07" fill="#FFFFFF" />
          <rect y="9.23" width="30" height="3.07" fill="#FFFFFF" />
          <rect y="15.38" width="30" height="3.07" fill="#FFFFFF" />
          <rect width="12" height="10.7" fill="#3C3B6E" />
        </>
      );
      break;
    case "GB":
      svgContent = (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="2" />
          <path d="M15,0 V20 M0,10 H30" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3" />
        </>
      );
      break;
    default:
      svgContent = (
        <>
          <rect width="30" height="20" fill="#3B82F6" />
          <text x="15" y="13" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
            {code.slice(0, 2)}
          </text>
        </>
      );
  }

  return (
    <svg
      viewBox="0 0 30 20"
      className={`${className} border border-slate-200/60 rounded-[2px] shadow-sm overflow-hidden`}
      style={{ opacity }}
      preserveAspectRatio="none"
    >
      {svgContent}
    </svg>
  );
};
