/** Mild red fills for trim / unused stock in layout previews */
export const WASTE_FILL_SOFT = "#fee2e2";
export const WASTE_FILL_RIGHT = "#fecaca"; // width trim — side strip
export const WASTE_FILL_BOTTOM = "#fda4af"; // breadth trim — foot strip
export const WASTE_FILL = WASTE_FILL_RIGHT;
export const WASTE_STROKE = "#f87171";
export const WASTE_STROKE_RIGHT = "#fca5a5";
export const WASTE_STROKE_BOTTOM = "#f87171";

export function isSplitStock(portion) {
  const cols = Math.max(1, Number(portion?.cols) || 1);
  const rows = Math.max(1, Number(portion?.rows) || 1);
  return cols * rows > 1;
}

/** Outer frame label: full sheet → Paper; split stock feed → Portion */
export function feedAreaLabelPrefix(portion) {
  return isSplitStock(portion) ? "Portion" : "Paper";
}

export function portionFeedLabel(portion) {
  const cols = Math.max(1, Number(portion?.cols) || 1);
  const rows = Math.max(1, Number(portion?.rows) || 1);
  const portionsPerParent = Math.max(1, Number(portion?.portionsPerParent) || cols * rows);

  if (portionsPerParent <= 1) return "Full stock sheet";
  if (portionsPerParent === 2) return "Half stock sheet selected";
  if (portionsPerParent === 4) return "Quarter stock sheet selected";
  return `${portionsPerParent}-portion stock · selected portion`;
}

export function unusedPortionLabel(portion) {
  const portionsPerParent = Math.max(1, Number(portion?.portionsPerParent) || 1);
  if (portionsPerParent === 2) return "Half sheet · not used";
  if (portionsPerParent === 4) return "Quarter · not used";
  return "Not used";
}

export function stockDimensionsFromPortion(portion) {
  const cols = Math.max(1, Number(portion?.cols) || 1);
  const rows = Math.max(1, Number(portion?.rows) || 1);
  const width = Number(portion?.width) || 1;
  const breadth = Number(portion?.breadth) || 1;
  return {
    width: width * cols,
    breadth: breadth * rows,
    unit: portion?.unit ?? "cm",
    cols,
    rows,
  };
}

export function formatPaperSize(width, breadth, unit = "cm") {
  const w = Math.round(Number(width) * 10) / 10;
  const b = Math.round(Number(breadth) * 10) / 10;
  return `${w}×${b}${unit}`;
}

/** Physical size of trim-waste strips inside a printable portion. */
export function trimWasteDimensions(portion, usedWidth, usedHeight) {
  const pw = Number(portion?.width) || 0;
  const pb = Number(portion?.breadth) || 0;
  const unit = portion?.unit ?? "cm";
  const uw = Math.max(0, Math.min(pw, Number(usedWidth) || 0));
  const uh = Math.max(0, Math.min(pb, Number(usedHeight) || 0));
  const wasteWidth = Math.max(0, pw - uw);
  const wasteBreadth = Math.max(0, pb - uh);

  return {
    unit,
    right:
      wasteWidth > 0.05
        ? { width: wasteWidth, breadth: uh, label: formatPaperSize(wasteWidth, uh, unit) }
        : null,
    bottom:
      wasteBreadth > 0.05
        ? { width: pw, breadth: wasteBreadth, label: formatPaperSize(pw, wasteBreadth, unit) }
        : null,
  };
}

export function usedRatiosOnPortion(portion, usedWidth, usedHeight) {
  const pw = Math.max(0.01, Number(portion?.width) || 1);
  const pb = Math.max(0.01, Number(portion?.breadth) || 1);
  const uw = Math.max(0, Number(usedWidth) || 0);
  const uh = Math.max(0, Number(usedHeight) || 0);
  return {
    widthRatio: Math.max(0, Math.min(1, uw / pw)),
    heightRatio: Math.max(0, Math.min(1, uh / pb)),
  };
}

/** Trim waste strips for flat laser layout (same unit as paper). */
export function trimWasteRectsOnPaper(paper, waste, offsetX = 0, offsetY = 0) {
  if (!paper || !waste) return [];

  const pw = Number(paper.width) || 0;
  const pb = Number(paper.breadth) || 0;
  const rw = Math.max(0, Number(waste.remainingWidth) || 0);
  const rb = Math.max(0, Number(waste.remainingBreadth) || 0);
  const rects = [];

  if (rb > 0 && pw > 0) {
    rects.push({
      x: offsetX,
      y: offsetY + pb - rb,
      width: pw,
      height: rb,
      kind: "bottom",
    });
  }
  if (rw > 0 && pw > 0 && pb > 0) {
    rects.push({
      x: offsetX + pw - rw,
      y: offsetY,
      width: rw,
      height: Math.max(0, pb - rb),
      kind: "right",
    });
  }

  return rects;
}

export function wastePercentFromUtilization(utilization) {
  const usedRatio = Number.isFinite(Number(utilization))
    ? Math.max(0, Math.min(1, Number(utilization)))
    : 0;
  return Math.max(0, 100 - Math.round(usedRatio * 100));
}
