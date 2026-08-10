import React from "react";
import {
  portionFeedLabel,
  stockDimensionsFromPortion,
  trimWasteDimensions,
  unusedPortionLabel,
  feedAreaLabelPrefix,
  formatPaperSize,
  usedRatiosOnPortion,
  WASTE_FILL,
  WASTE_FILL_SOFT,
  WASTE_FILL_RIGHT,
  WASTE_FILL_BOTTOM,
  WASTE_STROKE,
  WASTE_STROKE_RIGHT,
  WASTE_STROKE_BOTTOM,
} from "./layoutPaperFrame.js";

function WasteDimensionLabel({ label, className = "" }) {
  if (!label) return null;
  return (
    <span
      className={`px-1 py-0.5 text-[8px] font-semibold tabular-nums text-red-900/85 bg-white/80 border border-red-200/70 leading-none ${className}`}
    >
      {label}
    </span>
  );
}

function LayoutLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[9px] text-gray-500 mt-1.5">
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block w-2.5 h-2.5 border"
          style={{ backgroundColor: WASTE_FILL_RIGHT, borderColor: WASTE_STROKE_RIGHT }}
        />
        Side trim (width)
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block w-2.5 h-2.5 border"
          style={{ backgroundColor: WASTE_FILL_BOTTOM, borderColor: WASTE_STROKE_BOTTOM }}
        />
        Foot trim (breadth)
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-2.5 h-2.5 border border-gov-blue/30 bg-gov-blue/10" />
        Print area
      </span>
    </div>
  );
}

function PortionPrintArea({ portion, usedWidth, usedHeight, children, className = "", fillContainer = false }) {
  const pw = Number(portion?.width) || 1;
  const pb = Number(portion?.breadth) || 1;
  const unit = portion?.unit ?? "cm";
  const { widthRatio, heightRatio } = usedRatiosOnPortion(portion, usedWidth, usedHeight);
  const wasteDims = trimWasteDimensions(portion, usedWidth, usedHeight);
  const outerLabelPrefix = fillContainer ? "Portion" : feedAreaLabelPrefix(portion);
  const hasPrintArea = Number(usedWidth) > 0 && Number(usedHeight) > 0;

  return (
    <div
      className={`group relative max-w-full mx-auto border border-gray-300 bg-white overflow-hidden ${fillContainer ? "w-full h-full" : "w-full"} ${className}`}
      style={fillContainer ? undefined : { aspectRatio: `${pw} / ${pb}` }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: WASTE_FILL_SOFT }} aria-hidden />

      {heightRatio < 1 && (
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none flex items-center justify-center"
          style={{
            height: `${(1 - heightRatio) * 100}%`,
            backgroundColor: WASTE_FILL_BOTTOM,
            borderTop: `1px solid ${WASTE_STROKE_BOTTOM}`,
          }}
          aria-hidden
        >
          <WasteDimensionLabel label={wasteDims.bottom?.label} />
        </div>
      )}
      {widthRatio < 1 && (
        <div
          className="absolute top-0 pointer-events-none flex items-center justify-center p-0.5"
          style={{
            left: `${widthRatio * 100}%`,
            width: `${(1 - widthRatio) * 100}%`,
            height: `${heightRatio * 100}%`,
            backgroundColor: WASTE_FILL_RIGHT,
            borderLeft: `1px solid ${WASTE_STROKE_RIGHT}`,
          }}
          aria-hidden
        >
          <WasteDimensionLabel label={wasteDims.right?.label} />
        </div>
      )}

      <div
        className="absolute top-0 left-0 overflow-hidden border border-gov-blue/25"
        style={{ width: `${widthRatio * 100}%`, height: `${heightRatio * 100}%` }}
      >
        {children}
        {hasPrintArea && (
          <div className="absolute bottom-0.5 right-0.5 z-10 px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wide bg-white/90 text-gov-blue border border-gov-blue/20 pointer-events-none transition-opacity duration-150 group-hover:opacity-0">
            Print {formatPaperSize(usedWidth, usedHeight, unit)}
          </div>
        )}
      </div>

      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide bg-white/90 text-gray-700 border border-gov-border pointer-events-none transition-opacity duration-150 group-hover:opacity-0">
        {outerLabelPrefix} {formatPaperSize(pw, pb, unit)}
      </div>
    </div>
  );
}

/**
 * Wraps an imposition / piece grid inside printable portion (and optional full stock).
 */
export default function PaperLayoutFrame({
  portion,
  usedWidth,
  usedHeight,
  children,
  showLegend = true,
  maxWidthPx = 420,
}) {
  if (!portion?.width || !portion?.breadth) {
    return (
      <div className="w-full">
        {children}
        {showLegend && <LayoutLegend />}
      </div>
    );
  }

  const stock = stockDimensionsFromPortion(portion);
  const isPortioned = stock.cols > 1 || stock.rows > 1;
  const feedLabel = portionFeedLabel(portion);

  if (!isPortioned) {
    return (
      <div className="w-full" style={{ maxWidth: maxWidthPx }}>
        <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{feedLabel}</div>
        <PortionPrintArea portion={portion} usedWidth={usedWidth} usedHeight={usedHeight}>
          {children}
        </PortionPrintArea>
        {showLegend && <LayoutLegend />}
      </div>
    );
  }

  const cellWidthPct = 100 / stock.cols;
  const cellHeightPct = 100 / stock.rows;

  return (
    <div className="w-full" style={{ maxWidth: maxWidthPx }}>
      <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Stock {stock.width}×{stock.breadth}
        {stock.unit} · {feedLabel}
      </div>
      <div
        className="relative w-full mx-auto border border-gray-300 bg-white overflow-hidden"
        style={{ aspectRatio: `${stock.width} / ${stock.breadth}` }}
      >
        {Array.from({ length: stock.rows }).flatMap((_, row) =>
          Array.from({ length: stock.cols }).map((__, col) => {
            const isActive = row === 0 && col === 0;
            return (
              <div
                key={`${row}-${col}`}
                className={`absolute border border-dashed ${isActive ? "border-gov-blue/35 z-[2]" : "border-red-200/60 z-[1]"}`}
                style={{
                  left: `${col * cellWidthPct}%`,
                  top: `${row * cellHeightPct}%`,
                  width: `${cellWidthPct}%`,
                  height: `${cellHeightPct}%`,
                  backgroundColor: isActive ? "transparent" : WASTE_FILL_SOFT,
                }}
              >
                {isActive ? (
                  <PortionPrintArea
                    portion={portion}
                    usedWidth={usedWidth}
                    usedHeight={usedHeight}
                    className="absolute inset-0 border-0"
                    fillContainer
                  >
                    {children}
                  </PortionPrintArea>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center pointer-events-none">
                    <span
                      className="text-[8px] font-semibold uppercase leading-tight text-red-800/70 px-1 py-0.5 bg-white/75 border border-red-200/60"
                      style={{ maxWidth: "90%" }}
                    >
                      {unusedPortionLabel(portion)}
                    </span>
                    <WasteDimensionLabel
                      label={formatPaperSize(portion.width, portion.breadth, portion.unit ?? "cm")}
                    />
                  </div>
                )}
              </div>
            );
          }),
        )}

        <div className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide bg-white/90 text-gray-600 border border-gov-border">
          Paper {formatPaperSize(stock.width, stock.breadth, stock.unit)}
        </div>
      </div>
      {showLegend && <LayoutLegend />}
    </div>
  );
}

export { LayoutLegend, WASTE_FILL, WASTE_FILL_SOFT, WASTE_FILL_RIGHT, WASTE_FILL_BOTTOM, WASTE_STROKE };
