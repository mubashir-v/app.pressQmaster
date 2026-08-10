import { formatPaperSize } from "./layoutPaperFrame.js";

/** Plain-language press / finished page size for normal print inspect. */
export function resolvePressSizeLabel({ meta, layout, sizeName } = {}) {
  if (sizeName) return sizeName;
  if (meta?.customWidth && meta?.customBreadth) {
    return `Custom (${formatPaperSize(meta.customWidth, meta.customBreadth, meta.customUnit || "cm")})`;
  }
  const print = layout?.print;
  if (print?.width && print?.breadth) {
    return formatPaperSize(print.width, print.breadth, print.unit);
  }
  return null;
}

/** Print / paper / total rows for layout inspect when pricing is available. */
export function layoutPriceBreakdownRows({
  chargeComponents,
  pricing,
  totalPrice,
  currency = "INR",
  hidePricing = false,
} = {}) {
  if (hidePricing) return [];

  const components = chargeComponents ?? pricing?.chargeComponents ?? [];
  const printing = components.find((c) => c.role === "printing");
  const paper = components.find((c) => c.role === "paper");
  const rows = [];

  if (printing?.amount != null) {
    rows.push({
      label: "Print charge",
      value: `${currency} ${Number(printing.amount).toLocaleString()}`,
    });
  }

  if (paper?.amount != null) {
    rows.push({
      label: "Paper cost",
      value: `${currency} ${Number(paper.amount).toLocaleString()}`,
    });
  }

  const total =
    totalPrice ??
    pricing?.total ??
    (components.length
      ? components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      : undefined);

  if (paper?.amount != null && total != null) {
    rows.push({
      label: "Total",
      value: `${currency} ${Number(total).toLocaleString()}`,
    });
  } else if (!printing && total != null) {
    rows.push({
      label: "Print charge",
      value: `${currency} ${Number(total).toLocaleString()}`,
    });
  }

  return rows;
}

/** Derive PaperLayoutPreview stats from a saved quotation / job line item. */
export function layoutPreviewPropsFromItem(item, meta, { hidePricing = false } = {}) {
  const piecesRequested = Number(meta.laserCopies ?? meta.offsetCopies ?? item?.quantity) || 0;
  const printingCharge = (item?.chargeComponents || []).find((c) => c.role === "printing");
  const preview = meta.layoutPreview || {};

  const piecesPerSheet =
    preview.piecesPerSheet ??
    meta.layout?.fit?.perSheet ??
    (meta.layout?.placements?.[0]
      ? (meta.layout.placements[0].across || 1) *
        (meta.layout.placements[0].down || 1) *
        Math.max(1, meta.layout.placements[0].count || 1)
      : undefined);

  let sheets = preview.sheets ?? preview.sheetsBilled ?? preview.sheetsForPieces;
  if (sheets == null && piecesPerSheet && piecesRequested) {
    sheets = Math.max(1, Math.ceil(piecesRequested / Math.max(1, piecesPerSheet)));
  }

  let parentSheets = preview.parentSheets;
  const feed = meta.layout?.paperFeed;
  if (parentSheets == null && sheets != null) {
    if (feed?.kind === "PORTIONED" && feed.portionsPerParent) {
      parentSheets = Math.max(1, Math.ceil(sheets / feed.portionsPerParent));
    } else {
      parentSheets = sheets;
    }
  }

  const prints = preview.prints ?? preview.impressionsBilled ?? printingCharge?.quantity;
  const totalPrice = hidePricing
    ? undefined
    : (item?.chargeComponents || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return {
    piecesRequested,
    sheets,
    parentSheets,
    prints,
    piecesPerSheet,
    totalPrice,
  };
}

/** Normalize laser + offset quote options for PaperLayoutPreview. */
export function layoutPreviewPropsFromOption(opt) {
  if (!opt) {
    return {
      piecesRequested: undefined,
      sheets: undefined,
      parentSheets: undefined,
      prints: undefined,
      piecesPerSheet: undefined,
    };
  }

  const piecesRequested = opt.piecesRequested;
  const piecesPerSheet = opt.piecesPerSheet;
  const sheets =
    opt.sheets ??
    opt.sheetsBilled ??
    opt.sheetsForPieces;
  const parentSheets = opt.parentSheets;
  const prints = opt.prints ?? opt.impressionsBilled;

  return {
    piecesRequested,
    sheets,
    parentSheets,
    prints,
    piecesPerSheet,
  };
}

export function layoutPreviewSnapshotFromOption(opt) {
  if (!opt) return undefined;
  const normalized = layoutPreviewPropsFromOption(opt);
  return {
    sheets: normalized.sheets,
    parentSheets: normalized.parentSheets,
    prints: normalized.prints,
    piecesPerSheet: normalized.piecesPerSheet,
  };
}
