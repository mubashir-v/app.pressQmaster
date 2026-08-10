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
  if (portionsPerParent === 2) return "Half sheet";
  if (portionsPerParent === 4) return "Quarter sheet";
  return "Unused portion";
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

/**
 * Physical trim cell on press for imposition preview (matches API imposedPageMmForReader).
 * NORMAL → width × breadth as entered; ROTATED → swapped (short-edge pair).
 */
export function impositionCellFootprint(trimPage, footprintOrientation = "NORMAL") {
  const w = Number(trimPage?.width) || 0;
  const b = Number(trimPage?.breadth) || 0;
  if (!w || !b) {
    const cellWidth = footprintOrientation === "ROTATED" ? 21 : 14.8;
    const cellBreadth = footprintOrientation === "ROTATED" ? 14.8 : 21;
    return { cellWidth, cellBreadth, cellAspectRatio: `${cellWidth} / ${cellBreadth}` };
  }
  const cellWidth = footprintOrientation === "ROTATED" ? b : w;
  const cellBreadth = footprintOrientation === "ROTATED" ? w : b;
  return { cellWidth, cellBreadth, cellAspectRatio: `${cellWidth} / ${cellBreadth}` };
}

/** Reader orientation → press footprint (matches imposedPageMmForReader). */
export function readerFootprintOrientation(readerOrientation = "NORMAL") {
  return readerOrientation === "ROTATED" ? "ROTATED" : "NORMAL";
}

/**
 * Logical spread from preview cell footprint × grid (before portion placement).
 * Pass previewFootprintOrientation from the API imposition, not reader orientation alone.
 */
export function impositionSpreadSize(trimPage, footprintOrientation, colCount, rowCount) {
  const footprint = impositionCellFootprint(trimPage, footprintOrientation);
  return {
    width: footprint.cellWidth * Math.max(1, colCount),
    breadth: footprint.cellBreadth * Math.max(1, rowCount),
  };
}

/**
 * Physical print area on the portion. When ROTATED reader uses portrait preview cells
 * (8/12/16 pp), the spread is turned on the sheet — swap width/breadth for the frame.
 */
export function impositionSpreadOnPortion(trimPage, previewFootprint, readerOrientation, colCount, rowCount) {
  const spread = impositionSpreadSize(trimPage, previewFootprint, colCount, rowCount);
  const readerFoot = readerFootprintOrientation(readerOrientation);
  if (previewFootprint === "NORMAL" && readerFoot === "ROTATED") {
    return { width: spread.breadth, breadth: spread.width };
  }
  return spread;
}

/** long-edge = portrait preview cells; short-edge = landscape preview cells. */
export function isLongEdgePairing(previewFootprintOrientation = "NORMAL") {
  return previewFootprintOrientation === "NORMAL";
}

/** Preview rotation for short-edge 4pp horizontal pairs (landscape cells, reader ROTATED). */
export function shortEdgeFourPagePreviewRotation(colIndex) {
  return colIndex % 2 === 0 ? "rotate(-90deg)" : "rotate(90deg)";
}
