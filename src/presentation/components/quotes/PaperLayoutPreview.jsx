import React from "react";
import { MdWarningAmber } from "react-icons/md";
import {
  portionFeedLabel,
  trimWasteRectsOnPaper,
  unusedPortionLabel,
  formatPaperSize,
  WASTE_FILL_SOFT,
  WASTE_FILL_RIGHT,
  WASTE_FILL_BOTTOM,
  WASTE_STROKE_RIGHT,
  WASTE_STROKE_BOTTOM,
} from "./layoutPaperFrame.js";
import { LayoutLegend } from "./PaperLayoutFrame.jsx";
import { resolvePressSizeLabel, layoutPriceBreakdownRows } from "./layoutPreviewProps.js";

function SummaryTable({ rows }) {
  const visible = rows.filter((row) => row?.value != null && row.value !== "");
  if (!visible.length) return null;

  const pairs = [];
  for (let i = 0; i < visible.length; i += 2) {
    pairs.push([visible[i], visible[i + 1] ?? null]);
  }

  const labelClass =
    "px-2 py-1.5 text-left font-medium text-gray-500 bg-gray-50 align-top w-[22%] border-r border-gov-border/60";
  const valueClass =
    "px-2 py-1.5 font-semibold text-gov-blue tabular-nums align-top wrap-break-word w-[28%]";

  return (
    <table className="w-full border border-gov-border border-collapse text-[11px] table-fixed">
      <tbody>
        {pairs.map(([left, right], idx) => (
          <tr key={`${left.label}-${right?.label ?? idx}`} className="border-b border-gov-border last:border-b-0">
            <th scope="row" className={labelClass}>
              {left.label}
            </th>
            <td className={`${valueClass} border-r border-gov-border`}>{left.value}</td>
            {right ? (
              <>
                <th scope="row" className={labelClass}>
                  {right.label}
                </th>
                <td className={valueClass}>{right.value}</td>
              </>
            ) : (
              <td colSpan={2} className="bg-gray-50" aria-hidden="true" />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PaperLayoutPreview({
  layout,
  piecesRequested,
  sheets,
  parentSheets,
  prints,
  piecesPerSheet,
  printerName,
  totalPrice,
  currency = "INR",
  hidePricing = false,
  pressSizeLabel,
  chargeComponents,
  pricing,
}) {
  if (!layout || !layout.paper || !layout.placements) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 border border-dashed border-gov-border">
        <MdWarningAmber className="w-8 h-8 text-gov-blue/20 mb-2" />
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide max-w-60">
          No paper dimensions available to render layout preview.
        </p>
      </div>
    );
  }

  const { sourcePaper, paper, placements, waste, paperFeed } = layout;
  const resolvedPressSize =
    pressSizeLabel ?? resolvePressSizeLabel({ layout });

  const canvas = sourcePaper || paper;
  const viewBox = `0 0 ${canvas.width} ${canvas.breadth}`;

  const isPortioned = paperFeed?.kind === "PORTIONED";
  const grid = paperFeed?.grid || { cols: 1, rows: 1 };
  const cellWidth = canvas.width / grid.cols;
  const cellHeight = canvas.breadth / grid.rows;
  const portionPaper = paper;
  const wasteRects = trimWasteRectsOnPaper(portionPaper, waste, 0, 0);
  const feedLabel = isPortioned
    ? portionFeedLabel({ cols: grid.cols, rows: grid.rows, portionsPerParent: paperFeed.portionsPerParent })
    : portionFeedLabel({ cols: 1, rows: 1, portionsPerParent: 1 });
  const labelSize = Math.max(canvas.width, canvas.breadth) * 0.028;
  const thinStroke = canvas.width * 0.001;
  const dashStroke = canvas.width * 0.002;

  const sheetsDiffer =
    parentSheets != null && sheets != null && parentSheets !== sheets;

  const stockPaperLabel = formatPaperSize(canvas.width, canvas.breadth, canvas.unit);
  const printSheetLabel = formatPaperSize(paper.width, paper.breadth, paper.unit);

  const summaryRows = [
    resolvedPressSize && { label: "Press size", value: resolvedPressSize },
    { label: "Stock paper", value: stockPaperLabel },
    isPortioned && { label: "Print sheet", value: printSheetLabel },
    {
      label: "Paper feed",
      value: isPortioned
        ? `${feedLabel} · ${paperFeed.portionsPerParent} cuts per sheet`
        : "Full sheet",
    },
    { label: "Pages per sheet", value: piecesPerSheet ?? "—" },
    piecesRequested != null && {
      label: "Copies needed",
      value: piecesRequested.toLocaleString(),
    },
    sheets != null && { label: "Print sheets", value: sheets.toLocaleString() },
    sheetsDiffer && {
      label: "Full paper sheets",
      value: parentSheets.toLocaleString(),
    },
    prints != null && { label: "Impressions", value: prints.toLocaleString() },
    ...layoutPriceBreakdownRows({
      chargeComponents,
      pricing,
      totalPrice,
      currency,
      hidePricing,
    }),
    waste && {
      label: "Side waste",
      value: `${waste.remainingWidth}${canvas.unit}`,
    },
    waste && {
      label: "Bottom waste",
      value: `${waste.remainingBreadth}${canvas.unit}`,
    },
    waste && {
      label: "Paper used",
      value: `${(waste.utilization * 100).toFixed(1)}%`,
    },
    printerName && { label: "Printer", value: printerName },
  ];

  return (
    <div className="space-y-3 outline-none select-none">
      <SummaryTable rows={summaryRows} />

      <div className="relative bg-gray-100 border border-gov-border p-2 flex items-center justify-center min-h-52 max-h-90">
        <svg
          viewBox={viewBox}
          className="max-w-full max-h-80"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x="0"
            y="0"
            width={canvas.width}
            height={canvas.breadth}
            fill="white"
            stroke="#d1d5db"
            strokeWidth={thinStroke}
          />

          {isPortioned && (
            <g>
              {Array.from({ length: grid.cols * grid.rows }).map((_, index) => {
                const col = index % grid.cols;
                const row = Math.floor(index / grid.cols);
                const isActive = col === 0 && row === 0;
                const x = col * cellWidth;
                const y = row * cellHeight;
                return (
                  <g key={`portion-${col}-${row}`}>
                    {!isActive && (
                      <>
                        <rect
                          x={x}
                          y={y}
                          width={cellWidth}
                          height={cellHeight}
                          fill={WASTE_FILL_SOFT}
                          stroke={WASTE_STROKE_RIGHT}
                          strokeWidth={dashStroke}
                          strokeDasharray={`${canvas.width * 0.008} ${canvas.width * 0.008}`}
                        />
                        <text
                          x={x + cellWidth / 2}
                          y={y + cellHeight / 2 - labelSize * 0.35}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#b91c1c"
                          fillOpacity="0.75"
                          fontSize={labelSize}
                          fontWeight="600"
                        >
                          {unusedPortionLabel({
                            cols: grid.cols,
                            rows: grid.rows,
                            portionsPerParent: paperFeed.portionsPerParent,
                          })}
                        </text>
                        <text
                          x={x + cellWidth / 2}
                          y={y + cellHeight / 2 + labelSize * 0.85}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#991b1b"
                          fillOpacity="0.85"
                          fontSize={labelSize * 0.9}
                          fontWeight="600"
                        >
                          {printSheetLabel}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
              {Array.from({ length: grid.cols - 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={(i + 1) * cellWidth}
                  y1="0"
                  x2={(i + 1) * cellWidth}
                  y2={canvas.breadth}
                  stroke="#e5e7eb"
                  strokeWidth={dashStroke}
                  strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                />
              ))}
              {Array.from({ length: grid.rows - 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={(i + 1) * cellHeight}
                  x2={canvas.width}
                  y2={(i + 1) * cellHeight}
                  stroke="#e5e7eb"
                  strokeWidth={dashStroke}
                  strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                />
              ))}
              <rect
                x="0"
                y="0"
                width={cellWidth}
                height={cellHeight}
                fill="none"
                stroke="#1a3a6b"
                strokeOpacity="0.35"
                strokeWidth={canvas.width * 0.003}
              />
            </g>
          )}

          {wasteRects.map((rect, idx) => {
            const isBottom = rect.kind === "bottom";
            const fill = isBottom ? WASTE_FILL_BOTTOM : WASTE_FILL_RIGHT;
            const stroke = isBottom ? WASTE_STROKE_BOTTOM : WASTE_STROKE_RIGHT;
            return (
            <g key={`waste-${idx}`}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={fill}
                fillOpacity="0.65"
                stroke={stroke}
                strokeWidth={thinStroke}
              />
              {rect.width > 0 && rect.height > 0 && (
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#991b1b"
                  fillOpacity="0.9"
                  fontSize={labelSize * 0.85}
                  fontWeight="600"
                >
                  {formatPaperSize(rect.width, rect.height, canvas.unit)}
                </text>
              )}
            </g>
            );
          })}

          <g>
            {placements.map((block, bIdx) => {
              const cellW = block.width / block.across;
              const cellH = block.breadth / block.down;
              const cells = [];
              let cellsDrawn = 0;

              for (let r = 0; r < block.down; r++) {
                for (let c = 0; c < block.across; c++) {
                  if (cellsDrawn >= block.count) break;
                  cells.push({ x: block.x + c * cellW, y: block.y + r * cellH });
                  cellsDrawn++;
                }
                if (cellsDrawn >= block.count) break;
              }

              return (
                <g key={bIdx}>
                  <rect
                    x={block.x}
                    y={block.y}
                    width={block.width}
                    height={block.breadth}
                    fill={bIdx === 0 ? "#1a3a6b" : "#91A6BA"}
                    fillOpacity={bIdx === 0 ? 0.08 : 0.06}
                    stroke={bIdx === 0 ? "#1a3a6b" : "#91A6BA"}
                    strokeWidth={canvas.width * 0.002}
                    strokeDasharray={`${canvas.width * 0.005} ${canvas.width * 0.005}`}
                  />
                  {cells.map((cell, cIdx) => (
                    <rect
                      key={cIdx}
                      x={cell.x + cellW * 0.04}
                      y={cell.y + cellH * 0.04}
                      width={cellW * 0.92}
                      height={cellH * 0.92}
                      fill={bIdx === 0 ? "#1a3a6b" : "#91A6BA"}
                      fillOpacity="0.45"
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <LayoutLegend plainLanguage />
    </div>
  );
}
