import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuotation } from "../../../infrastructure/api/backendService.js";
import BrandLogo from "../../components/logo/BrandLogo.jsx";
import QuotationModeToggle from "../../components/quotes/QuotationModeToggle.jsx";
import QuotationLineItemsTable from "./QuotationLineItemsTable.jsx";
import JobItemProductionDetails, { SpecGrid, detectWorkType } from "../jobs/JobItemProductionDetails.jsx";
import { buildPlainProductionSpecs } from "../jobs/productionPlainLanguage.js";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { canEditQuotes, canViewQuotes } from "../../../application/auth/orgScopes.js";
import { MdArrowBack } from "react-icons/md";

const QUOTE_STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const PREVIEW_PANEL_CLASS =
  "w-full lg:flex-[2] lg:min-w-[440px] lg:max-w-[58%] shrink-0 flex flex-col min-h-0 lg:min-h-0 border-t lg:border-t-0 lg:border-l border-gov-border bg-white";
const PREVIEW_SPECS_CLASS = "space-y-3 border border-gov-border bg-white p-3";
const PREVIEW_DETAILS_CLASS =
  "overflow-hidden border border-gov-border border-solid border-gov-blue bg-gov-blue-light p-2 lg:p-3 flex flex-col min-h-[240px]";

export default function QuotationViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canEditQuotes(user?.scopes, user);
  const canView = canViewQuotes(user?.scopes, user);
  const hidePricing = !canView;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [detailLineIndex, setDetailLineIndex] = useState(0);

  const lineItems = quotation?.lineItems || [];
  const customer = quotation?.customer || null;
  const currency = quotation?.currency || "INR";
  const detailItem = lineItems[detailLineIndex] ?? null;
  const detailItemTitle = detailItem?.meta?.itemTitle || detailItem?.title || null;
  const detailWorkType = detailItem?.meta ? detectWorkType(detailItem.meta) : null;
  const isBrochurePreview = detailWorkType === "brochure";

  const detailPlainSpecs = useMemo(
    () =>
      detailItem && !isBrochurePreview
        ? buildPlainProductionSpecs(detailItem, { hidePricing })
        : [],
    [detailItem, hidePricing, isBrochurePreview],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setErrorText("");
      try {
        const data = await getQuotation(id);
        if (cancelled) return;
        setQuotation(data.quotation || data);
      } catch (e) {
        if (!cancelled) setErrorText(e.response?.data?.message || "Failed to load quotation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!lineItems.length) return;
    setDetailLineIndex((prev) => (prev >= 0 && prev < lineItems.length ? prev : 0));
  }, [lineItems.length]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold mb-4">{errorText || "Quotation not found."}</p>
        <button type="button" onClick={() => navigate("/dashboard/quotes")} className="gov-btn-secondary">
          Back to quotations
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-gov-bg overflow-x-hidden select-none">
      {errorText && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 shrink-0">
          {errorText}
        </div>
      )}

      <div className="border-b border-gov-blue/20 bg-gov-blue-light/40 px-3 py-2 text-[11px] text-gov-blue shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <span>View mode — read-only quotation overview.</span>
        <QuotationModeToggle quotationId={id} mode="view" canEdit={canEdit} />
      </div>

      <section className="border-b border-gov-border bg-white px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/dashboard/quotes")}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 border border-gov-border shrink-0"
            title="Back to quotations"
          >
            <MdArrowBack className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-[240px] max-w-[340px] border border-gov-border px-2 py-1 bg-white text-[11px] leading-tight">
            <div className="text-[9px] text-gray-400 mb-0.5">Quotation overview</div>
            <div className="grid grid-cols-[52px_1fr] gap-x-1 gap-y-0.5">
              <span className="text-gray-500">Cust :</span>
              <span className="font-semibold text-gov-blue truncate">{customer?.name || "—"}</span>
              <span className="text-gray-500">Phone :</span>
              <span className="font-medium text-gov-blue truncate">{customer?.phone || "—"}</span>
            </div>
          </div>

          <div className="flex items-end gap-2 flex-1 min-w-[280px]">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Subject</label>
              <input type="text" readOnly value={quotation.title || ""} className="gov-input py-1 text-xs bg-gray-50 cursor-default" />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Status</label>
              <input
                type="text"
                readOnly
                value={QUOTE_STATUS_LABELS[quotation.status] || quotation.status || "—"}
                className="gov-input py-1 text-xs bg-gray-50 cursor-default"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <BrandLogo className="w-6 h-6" />
            <span className="px-2 py-1 bg-gov-blue text-white text-[11px] font-bold">
              {quotation.quoteNumber || "DRAFT"}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 lg:flex-[3] min-w-0 min-h-0 flex flex-col">
          <QuotationLineItemsTable
            quotation={quotation}
            detailLineIndex={detailLineIndex}
            onSelectLine={setDetailLineIndex}
            fillHeight
            hidePricing={hidePricing}
          />
        </div>

        <aside className={PREVIEW_PANEL_CLASS}>
          <div className="flex items-stretch border-b border-gov-border bg-gray-50 shrink-0">
            <div className="flex items-center px-3 min-h-10 border-r border-gov-border bg-gov-blue text-white shrink-0">
              <span className="text-xs font-semibold whitespace-nowrap">Item preview</span>
            </div>
            <div className="flex flex-col justify-center px-3 flex-1 min-w-0 min-h-10 py-1">
              {detailItem ? (
                <>
                  <span className="text-sm font-bold text-gov-blue truncate">{detailItemTitle || "Untitled"}</span>
                  <span className="text-[10px] text-gray-500 tabular-nums">Line {detailLineIndex + 1}</span>
                </>
              ) : (
                <span className="text-[11px] text-gray-400 italic">Select a line</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {detailItem ? (
              <>
                {detailItem.description && (
                  <div className="border border-gov-border bg-white px-3 py-2">
                    <div className="text-[11px] text-gray-600 leading-relaxed">{detailItem.description}</div>
                  </div>
                )}

                {!isBrochurePreview && detailPlainSpecs.length > 0 && (
                  <div className={PREVIEW_SPECS_CLASS}>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      What production needs to know
                    </div>
                    <SpecGrid specs={detailPlainSpecs} compact />
                  </div>
                )}

                <div className={PREVIEW_DETAILS_CLASS}>
                  <JobItemProductionDetails
                    item={detailItem}
                    hidePricing={hidePricing}
                    currency={currency}
                    variant="panel"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center py-12 px-4 text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                  Click a row in the table to preview specs and layout
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
