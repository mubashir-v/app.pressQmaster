/** Mirror api offsetBookColourPages — per-page tier for offset booklet inspect. */

export function parseOffsetBookPagesInput(value, totalPages) {
  const total = Math.max(0, Math.trunc(totalPages));
  const normalized = String(value ?? "")
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .toUpperCase();
  if (!normalized || total <= 0) return new Set();

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

const MODE_RANK = { S: 0, "2C": 1, "3C": 2, M: 3 };

export function buildOffsetBookPageColourCodes(totalPages, twoInput, threeInput, multiInput) {
  const total = Math.max(0, Math.trunc(totalPages));
  const map = new Map();
  for (let page = 1; page <= total; page += 1) map.set(page, "S");

  for (const page of parseOffsetBookPagesInput(twoInput, total)) map.set(page, "2C");
  for (const page of parseOffsetBookPagesInput(threeInput, total)) map.set(page, "3C");
  for (const page of parseOffsetBookPagesInput(multiInput, total)) map.set(page, "M");

  return map;
}

export function offsetBookPageInspectClass(code) {
  if (code === "2C") return "border-sky-400 bg-sky-50 text-sky-900";
  if (code === "3C") return "border-violet-400 bg-violet-50 text-violet-900";
  if (code === "M") return "border-amber-400 bg-amber-50 text-amber-900";
  return "border-gov-blue/20 bg-white text-gov-blue";
}

export function offsetBookPageLegend() {
  return [
    { code: "S", label: "Single (default)" },
    { code: "2C", label: "Two colour" },
    { code: "3C", label: "Three colour" },
    { code: "M", label: "Multi" },
  ];
}

export function highestPageColourCode(codes) {
  return codes.reduce((best, code) => (MODE_RANK[code] > MODE_RANK[best] ? code : best), "S");
}
