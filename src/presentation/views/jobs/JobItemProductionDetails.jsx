import React, { useMemo, useState } from "react";
import { buildBrochureDisplaySpecs, workTypeLabel } from "./productionPlainLanguage.js";
import PaperLayoutPreview from "../../components/quotes/PaperLayoutPreview.jsx";
import BrochureCompositionInspectPanel from "../../components/quotes/BrochureCompositionInspectPanel.jsx";
import { BrochureOrientationGlyph } from "../../components/quotes/BrochureOrientationPreview.jsx";
import { layoutPreviewPropsFromItem } from "../../components/quotes/layoutPreviewProps.js";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { PrimaryButton } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdOutlineAnalytics, MdLayers } from "react-icons/md";

export function formatSpecValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function SpecGrid({ specs, compact = false }) {
  const visible = specs
    .map((spec) => {
      const text = formatSpecValue(spec.value);
      if (text == null) return null;
      return { ...spec, text };
    })
    .filter(Boolean);

  if (!visible.length) return null;

  return (
    <div
      className={`grid gap-px border border-gov-border bg-gov-border ${
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      }`}
    >
      {visible.map(({ label, text, brochureOrientation }) => (
        <div key={label} className="bg-white px-2.5 py-2 min-w-0">
          <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide truncate">{label}</div>
          <div className="flex items-center gap-2 min-w-0 mt-0.5">
            {brochureOrientation && <BrochureOrientationGlyph orientation={brochureOrientation} />}
            <div className="text-sm font-bold text-gov-blue truncate min-w-0" title={String(text)}>
              {text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function bindingLabel(bookletBindingType) {
  if (bookletBindingType === "PERFECT_BINDING") return "Perfect binding";
  if (bookletBindingType === "CENTER_CLIP") return "Center clip";
  return bookletBindingType?.replace(/_/g, " ") || "Booklet";
}

export function detectWorkType(meta) {
  if (!meta || typeof meta !== "object") return "generic";
  if (meta.nestedPrintPlan) return "brochure";
  if (meta.offsetCopies != null || meta.offsetStockItemId) return "offset";
  if (meta.laserCopies != null || meta.laserStockItemId || meta.layout) return "laser";
  return "generic";
}

function trimPageFromMeta(meta) {
  if (meta.customWidth && meta.customBreadth) {
    return {
      width: Number(meta.customWidth),
      breadth: Number(meta.customBreadth),
      unit: meta.customUnit || "mm",
    };
  }
  return null;
}

const inspectButtonClass =
  "px-2 py-1 text-[9px] font-semibold uppercase tracking-wide border border-gov-border shrink-0 text-gov-blue hover:bg-gov-blue/10 whitespace-normal text-center leading-tight max-w-[7.5rem]";

export function buildProductionSpecs(item, meta, { hidePricing, layoutPreview, plan, workType }) {
  if (workType === "laser") {
    return [
      { label: "Job type", value: workTypeLabel(workType) },
      { label: "Printer", value: meta.printerModelName },
      { label: "Sides", value: meta.laserSides },
      { label: "Color", value: meta.laserColorMode },
      { label: "Copies", value: meta.laserCopies ?? item.quantity },
      { label: "Print sheets", value: layoutPreview.sheets },
      { label: "Stock sheets", value: layoutPreview.parentSheets },
      { label: "Impressions", value: layoutPreview.prints },
      { label: "Up / sheet", value: layoutPreview.piecesPerSheet },
      meta.customWidth && meta.customBreadth
        ? {
            label: "Custom size",
            value: `${meta.customWidth}×${meta.customBreadth} ${meta.customUnit || "mm"}`,
          }
        : null,
      meta.isOnlyClipCharge ? { label: "Finishing", value: "Clip charge only" } : null,
    ].filter(Boolean);
  }

  if (workType === "offset") {
    return [
      { label: "Job type", value: workTypeLabel(workType) },
      { label: "Printer", value: meta.printerModelName },
      { label: "Sides", value: meta.offsetSides },
      { label: "Color", value: meta.offsetColorMode },
      { label: "Copies", value: meta.offsetCopies ?? item.quantity },
      { label: "Waste allowance", value: meta.offsetWaste },
      { label: "Print sheets", value: layoutPreview.sheets },
      { label: "Stock sheets", value: layoutPreview.parentSheets },
      { label: "Impressions", value: layoutPreview.prints },
      { label: "Up / sheet", value: layoutPreview.piecesPerSheet },
      meta.offsetIsBackSideDifferent ? { label: "Back side", value: "Different artwork" } : null,
      meta.customWidth && meta.customBreadth
        ? {
            label: "Custom size",
            value: `${meta.customWidth}×${meta.customBreadth} ${meta.customUnit || "mm"}`,
          }
        : null,
    ].filter(Boolean);
  }

  if (workType === "brochure") {
    return [];
  }

  return [];
}

export default function JobItemProductionDetails({
  item,
  hidePricing = false,
  currency = "INR",
  variant = "panel",
  plainSpecs = null,
}) {
  const meta = item?.meta && typeof item.meta === "object" ? item.meta : {};
  const workType = detectWorkType(meta);
  const plan = meta.nestedPrintPlan;
  const [inspectMode, setInspectMode] = useState(null);

  const layoutPreview = useMemo(
    () => layoutPreviewPropsFromItem(item, meta, { hidePricing }),
    [item, meta, hidePricing],
  );

  const productionSpecs = useMemo(
    () => buildProductionSpecs(item, meta, { hidePricing, layoutPreview, plan, workType }),
    [item, meta, hidePricing, layoutPreview, plan, workType],
  );

  const brochureSpecs = useMemo(
    () => (workType === "brochure" ? buildBrochureDisplaySpecs(item, { hidePricing }) : []),
    [workType, item, hidePricing],
  );

  const panelSpecs = useMemo(() => {
    if (workType === "brochure") return brochureSpecs;
    if (plainSpecs?.length) return plainSpecs;
    return productionSpecs;
  }, [workType, brochureSpecs, plainSpecs, productionSpecs]);

  const hasLayoutInspect = Boolean(meta.layout);
  const hasCompositionInspect = Boolean(plan);
  const inspectModeTarget = hasCompositionInspect ? "composition" : hasLayoutInspect ? "layout" : null;
  const trimPage = trimPageFromMeta(meta);

  const inspectDrawers = (
    <>
      <FormDrawer
        open={inspectMode === "layout"}
        onClose={() => setInspectMode(null)}
        title="Layout Inspection"
        subtitle={meta.printerModelName || "Print layout"}
        icon={<MdOutlineAnalytics className="w-4 h-4" />}
        maxWidth="max-w-xl"
        footer={
          <PrimaryButton
            type="button"
            onClick={() => setInspectMode(null)}
            className="px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
          >
            Close Inspection
          </PrimaryButton>
        }
      >
        <PaperLayoutPreview
          layout={meta.layout}
          piecesRequested={layoutPreview.piecesRequested}
          sheets={layoutPreview.sheets}
          parentSheets={layoutPreview.parentSheets}
          prints={layoutPreview.prints}
          piecesPerSheet={layoutPreview.piecesPerSheet}
          printerName={meta.printerModelName}
          totalPrice={layoutPreview.totalPrice}
          currency={currency}
          hidePricing={hidePricing}
        />
      </FormDrawer>

      <FormDrawer
        open={inspectMode === "composition"}
        onClose={() => setInspectMode(null)}
        title="Composition Inspection"
        subtitle={`${bindingLabel(meta.bookletBindingType)} · ${meta.brochurePagesPerBrochure || "—"}pp`}
        icon={<MdLayers className="w-4 h-4" />}
        maxWidth="max-w-2xl"
        footer={
          <PrimaryButton
            type="button"
            onClick={() => setInspectMode(null)}
            className="px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
          >
            Close Inspection
          </PrimaryButton>
        }
      >
        <BrochureCompositionInspectPanel
          plan={plan}
          trimPage={trimPage}
          bookletBindingType={meta.bookletBindingType}
          brochureColorPagesInput={meta.brochureColorPagesInput}
          brochurePagesPerBrochure={meta.brochurePagesPerBrochure}
          hidePricing={hidePricing}
        />
      </FormDrawer>
    </>
  );

  if (variant === "panel") {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MdOutlineAnalytics className="w-4 h-4 text-gov-blue shrink-0" />
            <h3 className="text-[11px] font-semibold text-gov-blue uppercase tracking-wide truncate">
              Production details
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {inspectModeTarget && (
              <button
                type="button"
                className={inspectButtonClass}
                onClick={() => setInspectMode(inspectModeTarget)}
              >
                View printing layout
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3">
          {hasLayoutInspect && (
            <PaperLayoutPreview
              layout={meta.layout}
              piecesRequested={layoutPreview.piecesRequested}
              sheets={layoutPreview.sheets}
              parentSheets={layoutPreview.parentSheets}
              prints={layoutPreview.prints}
              piecesPerSheet={layoutPreview.piecesPerSheet}
              printerName={meta.printerModelName}
              totalPrice={layoutPreview.totalPrice}
              currency={currency}
              hidePricing={hidePricing}
            />
          )}

          {hasCompositionInspect && !hasLayoutInspect && (
            <div className="border border-gov-border bg-white p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-gov-blue uppercase min-w-0">
                <MdLayers className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {bindingLabel(meta.bookletBindingType)} · {meta.brochurePagesPerBrochure}pp ·{" "}
                  {meta.brochureCopies ?? item.quantity ?? 1} copies
                </span>
              </div>
            </div>
          )}

          {panelSpecs.length > 0 ? (
            <SpecGrid specs={panelSpecs} compact={workType === "brochure"} />
          ) : (
            <p className="text-xs text-gray-500 italic py-2 border border-gov-border bg-white px-3">
              No structured production metadata on this task.
            </p>
          )}

          {workType === "brochure" && plan?.instruction && (
            <p className="text-[11px] text-gray-600 leading-relaxed px-3 py-2 bg-gray-50 border border-gov-border">
              {plan.instruction}
            </p>
          )}
        </div>

        {inspectDrawers}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {productionSpecs.length > 0 && <SpecGrid specs={productionSpecs} />}
      {inspectDrawers}
    </div>
  );
}
