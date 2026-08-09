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

  let sheets = preview.sheets;
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

  const prints = preview.prints ?? printingCharge?.quantity;
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

export function layoutPreviewSnapshotFromOption(opt) {
  if (!opt) return undefined;
  return {
    sheets: opt.sheets,
    parentSheets: opt.parentSheets,
    prints: opt.prints,
    piecesPerSheet: opt.piecesPerSheet,
  };
}
