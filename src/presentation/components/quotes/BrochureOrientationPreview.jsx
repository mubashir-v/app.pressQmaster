import React from "react";

function normalizeOrientation(orientation) {
  return orientation === "ROTATED" ? "ROTATED" : "NORMAL";
}

export function BrochureOrientationGlyph({ orientation, active = false, className = "" }) {
  const isRotated = normalizeOrientation(orientation) === "ROTATED";

  return (
    <div
      className={`border flex items-center justify-center shrink-0 ${
        isRotated ? "w-9 h-4" : "w-5 h-6"
      } ${active ? "border-white/70" : "border-gov-border bg-gray-50"} ${className}`}
      aria-hidden
    >
      <span className={`font-bold leading-none ${isRotated ? "text-[10px]" : "text-sm"}`}>A</span>
    </div>
  );
}

/** Read-only badge for the quoted brochure orientation (single option only). */
export default function BrochureOrientationPreview({ orientation = "NORMAL", className = "" }) {
  const selected = normalizeOrientation(orientation);
  const isRotated = selected === "ROTATED";

  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1.5 border border-gov-border bg-gov-blue text-white min-w-0 ${className}`}
    >
      <div className="min-w-0 text-left">
        <span className="text-xs font-semibold block truncate">{isRotated ? "Rotated" : "Normal"}</span>
        <span className="text-[9px] block truncate text-white/80">
          {isRotated ? "Short edge pair" : "Long edge pair"}
        </span>
      </div>
      <BrochureOrientationGlyph orientation={selected} active />
    </div>
  );
}
