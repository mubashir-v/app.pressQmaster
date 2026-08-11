/** Read inspect page-number rotation from API imposition cell (numberRotationDeg hook). */
export function impositionNumberRotationDeg(cell) {
  if (cell?.numberRotationDeg != null && Number.isFinite(Number(cell.numberRotationDeg))) {
    return Number(cell.numberRotationDeg);
  }
  const legacy = cell?.previewRotationDeg;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  if (typeof legacy === "string" && legacy.trim() !== "") {
    const parsed = Number(legacy);
    if (Number.isFinite(parsed)) return parsed;
  }
  return cell?.designOrientation === "INVERTED" ? 180 : 0;
}

export function impositionNumberTransform(cell) {
  return `rotate(${impositionNumberRotationDeg(cell)}deg)`;
}
