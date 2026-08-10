import React from "react";
import PaperLayoutFrame, { LayoutLegend } from "./PaperLayoutFrame.jsx";
import {
  impositionCellFootprint,
  impositionSpreadOnPortion,
  isLongEdgePairing,
  shortEdgeFourPagePreviewRotation,
  formatPaperSize,
} from "./layoutPaperFrame.js";

function trimPageLabel(trimPage) {
  const w = Number(trimPage?.width);
  const b = Number(trimPage?.breadth);
  if (!w || !b) return null;
  return formatPaperSize(w, b, trimPage?.unit ?? "cm");
}

function nestedRoleLabel(role) {
  if (role === "ONLY") return "Single folded signature";
  if (role === "OUTER") return "Outer wrap";
  return "Inner insert";
}

function hasLooseClipPlan(item) {
  if (item?.signatures?.length) {
    return item.signatures.some((sig) => Number(sig.signaturePages) <= 2);
  }
  if (item?.parts?.length) {
    return item.parts.some((part) => Number(part) <= 2);
  }
  return false;
}

function isPostPrintFriendlyPlan(plan) {
  if (plan?.workflowTags?.includes("POST_PRINT_FRIENDLY")) return true;
  if (!plan?.signatures?.length) return false;
  return plan.signatures.every((sig) => sig.signaturePages === 4);
}

function nestedPlanInstruction(plan, { isPerfectBinding, isCenterClipBinding }) {
  if (isPerfectBinding) {
    if (hasLooseClipPlan(plan)) {
      return "Perfect binding in page order: folded stack sets plus loose 2pp duplex pairs where needed. Collate every set in sequence, then bind—no center-pin nesting.";
    }
    return "Perfect binding in page order: print each folded stack below, collate in sequence, trim, and bind—no inner inserts or center-pin nesting.";
  }
  if (isCenterClipBinding && hasLooseClipPlan(plan)) {
    return "Includes loose 2pp insert sheets; print and clip these with the folded center-pin sets instead of treating the whole plan as a nested fold.";
  }
  if (plan?.workflowSummary) return plan.workflowSummary;
  if (isPostPrintFriendlyPlan(plan)) {
    return "Print every small set below. Cut each set, stack from outer to inner, then center pin.";
  }
  return "Print every set below. Fold each set, then nest from outer to inner.";
}

function nestedPlanPrinterNames(plan) {
  const names = plan?.signatures?.map((signature) => signature.printerModelName).filter(Boolean) || [];
  return [...new Set(names)];
}

function nestedPlanPrinterSummary(plan, maxVisible = 2) {
  const names = nestedPlanPrinterNames(plan);
  if (names.length === 0) return "Printer not selected";
  const visible = names.slice(0, maxVisible).join(", ");
  const hiddenCount = names.length - maxVisible;
  return hiddenCount > 0 ? `${visible} +${hiddenCount} more` : visible;
}

function paperWasteStatsForSignature(signature, trimPage) {
  const portion = signature?.portion;
  if (!portion) return { usedPercent: 0, wastePercent: 0 };

  const displayRows = impositionSideRowsForDisplay(
    signature.imposition?.front ?? [[]],
    signature.repeatOnPortion,
    signature.signaturePages,
  );
  const metrics = nestedPreviewMetrics(signature, displayRows, trimPage);
  const pw = Math.max(0.01, Number(portion.width) || 1);
  const pb = Math.max(0.01, Number(portion.breadth) || 1);
  const usedRatio = Math.max(
    0,
    Math.min(1, (metrics.previewWidth * metrics.previewBreadth) / (pw * pb)),
  );
  const usedPercent = Math.round(usedRatio * 100);
  return { usedPercent, wastePercent: Math.max(0, 100 - usedPercent) };
}

function paperWasteStatsForPlan(plan, trimPage) {
  const signatures = (plan?.signatures || []).filter((signature) => !signature.piggybackOnRunIndex);
  if (signatures.length === 0) return { usedPercent: 0, wastePercent: 0 };
  const weighted = signatures.reduce(
    (acc, signature) => {
      const weight = Math.max(1, Number(signature.printedSheetsForCopies) || 1);
      const stats = paperWasteStatsForSignature(signature, trimPage);
      return { used: acc.used + stats.usedPercent * weight, weight: acc.weight + weight };
    },
    { used: 0, weight: 0 },
  );
  const usedPercent = weighted.weight > 0 ? Math.round(weighted.used / weighted.weight) : 0;
  return { usedPercent, wastePercent: Math.max(0, 100 - usedPercent) };
}

function nestedSignatureGroupsForPlan(plan) {
  if (!plan) return [];
  return Array.from(
    plan.signatures
      .filter((signature) => !signature.piggybackOnRunIndex)
      .reduce((groups, signature) => {
        const key = String(signature.signaturePages);
        if (!groups.has(key)) {
          groups.set(key, { signaturePages: signature.signaturePages, signatures: [] });
        }
        groups.get(key).signatures.push(signature);
        return groups;
      }, new Map()).values(),
  ).sort((a, b) => b.signaturePages - a.signaturePages);
}

function canonicalBaseGrid(signaturePages) {
  if (signaturePages === 2) return { rows: 1, cols: 1 };
  if (signaturePages === 4) return { rows: 1, cols: 2 };
  if (signaturePages === 8) return { rows: 2, cols: 2 };
  if (signaturePages === 12) return { rows: 2, cols: 3 };
  if (signaturePages === 16) return { rows: 2, cols: 4 };
  if (signaturePages === 32) return { rows: 4, cols: 4 };
  const perSide = Math.max(1, signaturePages / 2);
  return {
    rows: Math.max(1, Math.round(Math.sqrt(perSide))),
    cols: Math.max(1, Math.round(perSide / Math.max(1, Math.round(Math.sqrt(perSide))))),
  };
}

function baseImpositionSideRows(sideRows, repeatOnPortion = { across: 1, down: 1 }, signaturePages = 0) {
  if (!sideRows?.length) return [[]];
  const repeatAcross = Math.max(1, repeatOnPortion.across ?? 1);
  const repeatDown = Math.max(1, repeatOnPortion.down ?? 1);
  const canonical = signaturePages > 0 ? canonicalBaseGrid(signaturePages) : null;
  const derivedRows = Math.max(1, Math.round(sideRows.length / repeatDown));
  const derivedCols = Math.max(1, Math.round((sideRows[0]?.length ?? 1) / repeatAcross));
  const baseRows = canonical ? Math.min(canonical.rows, sideRows.length) : derivedRows;
  const baseCols = canonical ? Math.min(canonical.cols, sideRows[0]?.length ?? canonical.cols) : derivedCols;
  return sideRows.slice(0, baseRows).map((row) => row.slice(0, baseCols));
}

function impositionSideRowsForDisplay(sideRows, repeatOnPortion = { across: 1, down: 1 }, signaturePages = 0) {
  const repeatCopies = Math.max(1, repeatOnPortion?.across ?? 1) * Math.max(1, repeatOnPortion?.down ?? 1);
  if (repeatCopies > 1 && sideRows?.length) return sideRows;
  return baseImpositionSideRows(sideRows, repeatOnPortion, signaturePages);
}

function nestedPreviewMetrics(signature, sideRows, trimPage) {
  const rowCount = Math.max(1, sideRows?.length || 1);
  const colCount = Math.max(1, sideRows?.[0]?.length || 1);
  const readerOrientation = signature?.imposition?.orientation ?? "NORMAL";
  const previewFootprint =
    signature?.imposition?.previewFootprintOrientation ?? readerOrientation;
  const cellFootprint = impositionCellFootprint(trimPage, previewFootprint);
  const spread = impositionSpreadOnPortion(trimPage, previewFootprint, readerOrientation, colCount, rowCount);
  return {
    rowCount,
    colCount,
    previewWidth: spread.width,
    previewBreadth: spread.breadth,
    cellAspectRatio: cellFootprint.cellAspectRatio,
    impositionFootprint: previewFootprint,
    readerOrientation,
  };
}

function nestedImpositionPreviewBox(signature, metrics, planPreviewScale) {
  const { previewWidth, previewBreadth, rowCount, colCount } = metrics;
  const repeatDown = Math.max(1, signature.repeatOnPortion?.down ?? 1);
  const gridAspect = previewWidth / Math.max(previewBreadth, 0.01);
  const maxWidthPx = planPreviewScale?.maxPreviewWidth
    ? Math.max(280, Math.min(460, planPreviewScale.maxPreviewWidth * 10))
    : 380;
  const maxHeightPx = colCount >= 4 || rowCount >= 4 ? 440 : 340;
  const minCellPx = colCount >= 4 ? 30 : rowCount >= 4 ? 28 : 24;
  let widthPx = maxWidthPx;
  let heightPx = widthPx / gridAspect;
  if (heightPx > maxHeightPx) {
    heightPx = maxHeightPx;
    widthPx = heightPx * gridAspect;
  }
  widthPx = Math.max(widthPx, minCellPx * colCount);
  heightPx = widthPx / gridAspect;
  if (heightPx > maxHeightPx) {
    heightPx = maxHeightPx;
    widthPx = heightPx * gridAspect;
  }
  let fontClass = "text-sm";
  if (colCount >= 4 || rowCount >= 6) fontClass = "text-[10px]";
  else if (colCount >= 3 || rowCount >= 4) fontClass = "text-xs";
  return {
    widthPx: Math.round(Math.max(120, widthPx)),
    heightPx: Math.round(Math.max(100, heightPx)),
    fontClass,
    dense: colCount >= 4 || rowCount >= 4,
    baseRows: canonicalBaseGrid(signature.signaturePages || 0).rows,
    repeatDown,
  };
}

function nestedPlanPreviewScaleForPlan(plan, trimPage) {
  if (!plan) return null;
  const scale = plan.signatures
    .filter((signature) => !signature.piggybackOnRunIndex)
    .reduce(
      (acc, signature) => {
        [signature.imposition.front, signature.imposition.back].forEach((sideRows) => {
          const displaySide = impositionSideRowsForDisplay(sideRows, signature.repeatOnPortion, signature.signaturePages);
          const metrics = nestedPreviewMetrics(signature, displaySide, trimPage);
          acc.maxPreviewWidth = Math.max(acc.maxPreviewWidth, metrics.previewWidth);
          acc.maxPreviewBreadth = Math.max(acc.maxPreviewBreadth, metrics.previewBreadth);
        });
        return acc;
      },
      { maxPreviewWidth: 1, maxPreviewBreadth: 1 },
    );
  return scale;
}

function parseBrochureColorPages(value, totalPages) {
  const total = Number.parseInt(totalPages, 10) || 0;
  const normalized = String(value || "")
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .toUpperCase();
  if (!normalized || total <= 0) return new Set();
  if (normalized === "ALL") {
    return new Set(Array.from({ length: total }, (_, index) => index + 1));
  }
  const pages = new Set();
  normalized.split(",").forEach((part) => {
    const token = part.trim();
    if (!token) return;
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return;
      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(total, Math.max(start, end));
      for (let page = from; page <= to; page += 1) pages.add(page);
      return;
    }
    if (!/^\d+$/.test(token)) return;
    const page = Number.parseInt(token, 10);
    if (Number.isFinite(page) && page >= 1 && page <= total) pages.add(page);
  });
  return pages;
}

function NestedImpositionSide({
  signature,
  sideRows,
  tone = "teal",
  planPreviewScale,
  trimPage,
  colorPageSet,
  showPaperFrame = true,
}) {
  const displayRows = impositionSideRowsForDisplay(sideRows, signature.repeatOnPortion, signature.signaturePages);
  const repeatCopies =
    Math.max(1, signature.repeatOnPortion?.across ?? 1) * Math.max(1, signature.repeatOnPortion?.down ?? 1);
  const metrics = nestedPreviewMetrics(signature, displayRows, trimPage);
  const { rowCount, colCount, previewWidth, previewBreadth, impositionFootprint } = metrics;
  const previewBox = nestedImpositionPreviewBox(signature, metrics, planPreviewScale);
  const { widthPx, fontClass, dense, baseRows, repeatDown } = previewBox;
  const isLongEdgePair = isLongEdgePairing(impositionFootprint);

  const numberRotation = (cell, colIndex) => {
    if (typeof cell.previewRotationDeg === "number") return `rotate(${cell.previewRotationDeg}deg)`;
    if (colCount === 1 && isLongEdgePair) return "rotate(90deg)";
    if (
      !isLongEdgePair &&
      signature.signaturePages === 4 &&
      colCount >= 2 &&
      cell.designOrientation === "NORMAL"
    ) {
      return shortEdgeFourPagePreviewRotation(colIndex);
    }
    return cell.designOrientation === "INVERTED" ? "rotate(180deg)" : "rotate(0deg)";
  };

  const pageClass = (pageNumber) =>
    colorPageSet?.has(Number(pageNumber))
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-gov-blue/20 bg-white text-gov-blue";

  const impositionGrid = (
    <div
      className={`grid gap-1 mx-auto border w-full h-full max-w-full ${dense ? "gap-0.5 p-1" : "p-2"} ${tone === "teal" ? "border-gov-blue/20 bg-gov-blue/3" : "border-gov-border bg-white"}`}
      style={{
        width: showPaperFrame ? "100%" : widthPx,
        maxWidth: "100%",
        aspectRatio: showPaperFrame ? undefined : `${previewWidth} / ${previewBreadth}`,
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
      }}
    >
      {displayRows.flatMap((row, ri) =>
        row.map((cell, ci) => (
          <div
            key={`${ri}-${ci}-${cell.pageNumber}`}
            title={`${cell.designOrientation?.toLowerCase?.() || "normal"} page design${colorPageSet?.has(cell.pageNumber) ? " • color page" : ""}`}
            className={`flex items-center justify-center rounded-sm border shadow-sm min-h-0 min-w-0 overflow-hidden ${pageClass(cell.pageNumber)} ${
              repeatDown > 1 && ri > 0 && ri % baseRows === 0 ? "border-t-2 border-dashed border-gov-blue/25" : ""
            }`}
          >
            <span
              className={`inline-flex items-center justify-center font-black leading-none transition-transform ${fontClass}`}
              style={{ transform: numberRotation(cell, ci), transformOrigin: "center center" }}
            >
              {cell.pageNumber}
            </span>
          </div>
        )),
      )}
    </div>
  );

  return (
    <div className="overflow-x-auto pb-1 w-full">
      <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {signature?.imposition?.orientation === "ROTATED" ? "Rotated imposition" : "Normal imposition"}
        {repeatCopies > 1 ? ` · full sheet ×${repeatCopies}` : ""}
        <span className="text-gray-400 font-normal normal-case">
          {" "}
          · {isLongEdgePair ? "long-edge pair" : "short-edge pair"}
        </span>
      </div>
      {showPaperFrame ? (
        <PaperLayoutFrame
          portion={signature.portion}
          usedWidth={previewWidth}
          usedHeight={previewBreadth}
          showLegend={false}
          maxWidthPx={widthPx}
        >
          {impositionGrid}
        </PaperLayoutFrame>
      ) : (
        impositionGrid
      )}
    </div>
  );
}

export default function BrochureCompositionInspectPanel({
  plan,
  planIdx = 0,
  trimPage = null,
  bookletBindingType = "CENTER_CLIP",
  brochureColorPagesInput = "",
  brochurePagesPerBrochure = 0,
  hidePricing = false,
}) {
  if (!plan) return null;

  const isPerfectBinding = bookletBindingType === "PERFECT_BINDING";
  const isCenterClipBinding = bookletBindingType === "CENTER_CLIP";
  const groups = nestedSignatureGroupsForPlan(plan);
  const previewScale = nestedPlanPreviewScaleForPlan(plan, trimPage);
  const wasteStats = paperWasteStatsForPlan(plan, trimPage);
  const sigSummary = plan.signatures.map((sig) => `${sig.signaturePages}pp`).join(" + ");
  const colorPageSet = parseBrochureColorPages(brochureColorPagesInput, brochurePagesPerBrochure);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Print sets", value: plan.printRunCount },
          { label: "Print sheets", value: plan.printedSheetsForCopies ?? plan.physicalSheetsPerBrochure },
          {
            label: "Impressions",
            value: plan.totals?.prints ?? "—",
            hint:
              plan.totals?.prints != null
                ? `${plan.totals.colorPrints ?? 0} color · ${plan.totals.bwPrints ?? 0} B&W`
                : null,
          },
          { label: "Trim waste", value: `${wasteStats.wastePercent}%` },
        ].map((stat) => (
          <div key={stat.label} className="border border-gov-border bg-white px-3 py-2.5 min-w-0">
            <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</div>
            <div className="text-base font-bold text-gov-blue tabular-nums mt-0.5">{stat.value}</div>
            {stat.hint && <div className="text-[9px] text-gray-500 tabular-nums mt-1">{stat.hint}</div>}
          </div>
        ))}
      </div>

      <div className="border border-gov-border bg-white px-3 py-2.5">
        <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Signature plan</div>
        <div className="text-sm font-bold text-gov-blue mt-0.5 break-words">{sigSummary}</div>
      </div>

      <div className="px-3 py-2 bg-gray-50 border border-gov-border text-[10px] text-gray-600 leading-relaxed">
        {nestedPlanInstruction(plan, { isPerfectBinding, isCenterClipBinding })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 py-2 bg-gray-50 border border-gov-border text-[10px]">
        {trimPageLabel(trimPage) && (
          <span className="text-gray-500">
            Page size: <strong className="text-gov-blue">{trimPageLabel(trimPage)}</strong>
          </span>
        )}
        <span className="text-gray-500">
          Printer: <strong className="text-gov-blue">{nestedPlanPrinterSummary(plan, 4)}</strong>
        </span>
        <span className="text-gray-500">
          Paper used: <strong className="text-gov-blue">{wasteStats.usedPercent}%</strong>
        </span>
        {!hidePricing && plan.totals?.price != null && (
          <span className="text-gray-500">
            Total: <strong className="text-gov-blue">₹{Number(plan.totals.price).toLocaleString()}</strong>
          </span>
        )}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={`${plan.planId}-${group.signaturePages}`} className="border border-gov-border bg-white">
            <div className="px-2.5 py-2 border-b border-gov-border bg-gray-50 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gov-blue uppercase tracking-wide">
                  {isPerfectBinding
                    ? group.signaturePages === 2
                      ? "2pp loose clip"
                      : `${group.signaturePages}pp folded stack`
                    : group.signaturePages === 2
                      ? "2pp loose insert"
                      : `${group.signaturePages}pp fold`}
                </div>
                <div className="text-[9px] text-gray-500">
                  {group.signatures.length} set{group.signatures.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-[9px] text-gray-500 text-right shrink-0">{group.signaturePages / 2} pp/side</div>
            </div>

            {group.signatures.map((signature) => (
              <div key={`${plan.planId}-${signature.runIndex}`} className="p-2.5 border-b border-gov-border last:border-b-0 space-y-2">
                <div className="flex justify-between gap-2 text-[10px]">
                  <div className="min-w-0">
                    <div className="font-semibold text-gov-blue">
                      Set {signature.runIndex}:{" "}
                      {isPerfectBinding
                        ? signature.signaturePages === 2
                          ? "Loose clip"
                          : "Folded stack"
                        : nestedRoleLabel(signature.nestRole)}
                    </div>
                    <div className="text-gray-500 truncate">Pages {signature.readerPages.join(", ")}</div>
                    <div className="text-gray-500 truncate">{signature.printerModelName || "Printer TBD"}</div>
                  </div>
                  <div className="text-right shrink-0 text-gray-500">
                    {trimPageLabel(trimPage) && <div>Page {trimPageLabel(trimPage)}</div>}
                    <div>
                      Paper {signature.portion.width}×{signature.portion.breadth}
                      {signature.portion.unit}
                    </div>
                    <div>
                      {signature.gridOnPortion.across}×{signature.gridOnPortion.down}
                    </div>
                    <div className="text-amber-700">Waste {paperWasteStatsForSignature(signature, trimPage).wastePercent}%</div>
                  </div>
                </div>

                {signature.cutAfterPrint && (
                  <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                    {signature.cutAfterPrint}
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
                  <div className="border border-gov-border bg-gray-50 p-2 min-w-0">
                    <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1.5">Front side</div>
                    <NestedImpositionSide
                      signature={signature}
                      sideRows={signature.imposition.front}
                      tone="teal"
                      planPreviewScale={previewScale}
                      trimPage={trimPage}
                      colorPageSet={colorPageSet}
                    />
                  </div>
                  <div className="border border-gov-border bg-gray-50 p-2 min-w-0">
                    <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1.5">Back side</div>
                    <NestedImpositionSide
                      signature={signature}
                      sideRows={signature.imposition.back}
                      tone="navy"
                      planPreviewScale={previewScale}
                      trimPage={trimPage}
                      colorPageSet={colorPageSet}
                    />
                  </div>
                </div>
                <LayoutLegend />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
