import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getQuotation,
  getJobQuotationBacklog,
  createJobFromQuotation,
  getOrganizationMembers,
  getJobs,
} from "../../../infrastructure/api/backendService.js";
import { SelectField, TextField, PrimaryButton } from "../../components/auth/AuthFormPrimitives.jsx";
import BrandLogo from "../../components/logo/BrandLogo.jsx";
import JobItemProductionDetails, { SpecGrid, detectWorkType } from "./JobItemProductionDetails.jsx";
import { buildPlainProductionSpecs } from "./productionPlainLanguage.js";
import QuoteProductionStatus from "./QuoteProductionStatus.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { canEditJobs, canShowQuoteAmountsInJobsContext } from "../../../application/auth/orgScopes.js";
import { MdArrowBack, MdWork } from "react-icons/md";

const QUOTE_STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const JOB_PREVIEW_PANEL_CLASS =
  "w-full lg:flex-[2] lg:min-w-[440px] lg:max-w-[58%] shrink-0 flex flex-col min-h-0 lg:min-h-0 max-h-[min(50vh,420px)] lg:max-h-none border-t lg:border-t-0 lg:border-l border-gov-border bg-white";
const JOB_PREVIEW_SPECS_CLASS = "space-y-3 border border-gov-border bg-white p-3";
const JOB_PREVIEW_DETAILS_CLASS =
  "overflow-hidden border border-gov-border border-solid border-gov-blue bg-gov-blue-light p-2 lg:p-3 flex flex-col min-h-[240px]";

export default function JobQuotationPage() {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEditJob = canEditJobs(user?.scopes, user);
  const showQuoteAmounts = canShowQuoteAmountsInJobsContext(user?.scopes, user);

  const [quotation, setQuotation] = useState(null);
  const [quoteJobs, setQuoteJobs] = useState([]);
  const [jobbedByIndex, setJobbedByIndex] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [detailLineIndex, setDetailLineIndex] = useState(0);
  const [createTitle, setCreateTitle] = useState("");
  const [createAssignee, setCreateAssignee] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [members, setMembers] = useState([]);

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
        ? buildPlainProductionSpecs(detailItem, { hidePricing: !showQuoteAmounts })
        : [],
    [detailItem, showQuoteAmounts, isBrochurePreview],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!quotationId) return;
      setLoading(true);
      setErrorText("");
      try {
        const [quoteData, backlogData, jobsData] = await Promise.all([
          getQuotation(quotationId),
          getJobQuotationBacklog("", 0, 100),
          getJobs("", 0, 100, "", quotationId),
        ]);
        if (cancelled) return;
        const q = quoteData.quotation || quoteData;
        setQuotation(q);
        setQuoteJobs(jobsData.items || []);

        const backlogEntry = (backlogData.items || []).find((item) => item.id === quotationId);
        const map = new Map();
        for (const line of backlogEntry?.lineItems || []) {
          map.set(line.lineIndex, line.isJobbed);
        }
        setJobbedByIndex(map);

        if (canEditJob) {
          const membersData = await getOrganizationMembers();
          if (!cancelled) {
            setMembers((membersData.members || []).filter((m) => m.memberActive !== false));
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErrorText(e.response?.data?.message || "Failed to load quotation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quotationId, canEditJob]);

  useEffect(() => {
    if (!lineItems.length) return;
    setDetailLineIndex((prev) => (prev >= 0 && prev < lineItems.length ? prev : 0));
  }, [lineItems.length]);

  const memberOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...members.map((m) => ({ value: m.userId, label: m.displayName || m.email })),
    ],
    [members],
  );

  function toggleLine(index) {
    if (!canEditJob || jobbedByIndex.get(index)) return;
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort((a, b) => a - b),
    );
  }

  async function handleCreateJob() {
    if (!canEditJob || !selectedIndices.length || !quotationId) return;
    setCreateBusy(true);
    setErrorText("");
    try {
      const payload = {
        quotationId,
        lineIndices: selectedIndices,
      };
      if (createTitle.trim()) payload.title = createTitle.trim();
      if (createAssignee) payload.assignedToUserId = createAssignee;
      if (createNotes.trim()) payload.notes = createNotes.trim();
      await createJobFromQuotation(payload);
      setCreateDrawerOpen(false);
      setSelectedIndices([]);
      setCreateTitle("");
      setCreateAssignee("");
      setCreateNotes("");
      navigate("/dashboard/jobs", { state: { tab: "open" }, replace: false });
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to create job.");
    } finally {
      setCreateBusy(false);
    }
  }

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
        <button type="button" onClick={() => navigate("/dashboard/jobs")} className="gov-btn-secondary">
          Back to jobs
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

      {!canEditJob && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 shrink-0">
          View only — creating jobs requires edit_jobs permission.
        </div>
      )}

      {canEditJob && !showQuoteAmounts && (
        <div className="border-b border-gov-blue/20 bg-gov-blue-light/40 px-3 py-2 text-[11px] text-gov-blue shrink-0">
          Production view — plain-language details shown without quote amounts.
        </div>
      )}

      <section className="border-b border-gov-border bg-white px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/dashboard/jobs")}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 border border-gov-border shrink-0"
            title="Back to jobs"
          >
            <MdArrowBack className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-[240px] max-w-[340px] border border-gov-border px-2 py-1 bg-white text-[11px] leading-tight">
            <div className="text-[9px] text-gray-400 mb-0.5">Quotation for job creation</div>
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
          <QuoteProductionStatus
            quotation={quotation}
            quoteJobs={quoteJobs}
            title="Items"
            pickMode={canEditJob}
            selectedIndices={selectedIndices}
            detailLineIndex={detailLineIndex}
            onToggleLine={toggleLine}
            onSelectLine={setDetailLineIndex}
            fillHeight
            headerAction={
              canEditJob && selectedIndices.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCreateDrawerOpen(true)}
                  className="gov-btn-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                >
                  Create job ({selectedIndices.length})
                </button>
              ) : null
            }
          />
        </div>

        <aside className={JOB_PREVIEW_PANEL_CLASS}>
          <div className="flex items-stretch border-b border-gov-border bg-gray-50 shrink-0">
            <div className="flex items-center px-3 min-h-10 border-r border-gov-border bg-gov-blue text-white shrink-0">
              <span className="text-xs font-semibold whitespace-nowrap">Task preview</span>
            </div>
            <div className="flex flex-col justify-center px-3 flex-1 min-w-0 min-h-10 py-1">
              {detailItem ? (
                <>
                  <span className="text-sm font-bold text-gov-blue truncate">
                    {detailItemTitle || "Untitled"}
                  </span>
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
                  <div className={JOB_PREVIEW_SPECS_CLASS}>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      What production needs to know
                    </div>
                    <SpecGrid specs={detailPlainSpecs} compact />
                    {canEditJob && !jobbedByIndex.get(detailLineIndex) && (
                      <button
                        type="button"
                        className="gov-btn-secondary text-xs w-full"
                        onClick={() => toggleLine(detailLineIndex)}
                      >
                        {selectedIndices.includes(detailLineIndex) ? "Remove from selection" : "Add to job selection"}
                      </button>
                    )}
                  </div>
                )}

                {isBrochurePreview && canEditJob && !jobbedByIndex.get(detailLineIndex) && (
                  <button
                    type="button"
                    className="gov-btn-secondary text-xs w-full"
                    onClick={() => toggleLine(detailLineIndex)}
                  >
                    {selectedIndices.includes(detailLineIndex) ? "Remove from selection" : "Add to job selection"}
                  </button>
                )}

                <div className={JOB_PREVIEW_DETAILS_CLASS}>
                  <JobItemProductionDetails
                    item={detailItem}
                    hidePricing={!showQuoteAmounts}
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

      <FormDrawer
        open={createDrawerOpen && canEditJob && selectedIndices.length > 0}
        onClose={() => !createBusy && setCreateDrawerOpen(false)}
        title="Create production job"
        subtitle={`${selectedIndices.length} task${selectedIndices.length === 1 ? "" : "s"} from ${quotation.quoteNumber || "quotation"}`}
        icon={<MdWork className="w-4 h-4" />}
        disableClose={createBusy}
        footer={
          <>
            <button
              type="button"
              disabled={createBusy}
              onClick={() => {
                setCreateDrawerOpen(false);
                setSelectedIndices([]);
              }}
              className="gov-btn-secondary px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
            >
              Cancel
            </button>
            <PrimaryButton
              type="button"
              disabled={createBusy}
              onClick={handleCreateJob}
              className="px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wide w-auto"
            >
              {createBusy ? "Creating…" : "Create job"}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Selected tasks</div>
            <ul className="border border-gov-border divide-y divide-gov-border bg-white">
              {selectedIndices.map((idx) => {
                const item = lineItems[idx];
                if (!item) return null;
                return (
                  <li key={idx} className="px-3 py-2 text-xs">
                    <div className="font-semibold text-gov-blue">
                      Line {idx + 1} · {item.meta?.itemTitle || item.title || "Untitled"}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{item.description}</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-0.5">Qty {item.quantity ?? 1}</div>
                  </li>
                );
              })}
            </ul>
          </div>

          <TextField label="Job title (optional)" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
          <SelectField
            label="Assign job to"
            value={createAssignee}
            onChange={(e) => setCreateAssignee(e.target.value)}
            options={memberOptions}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
            <textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              rows={3}
              className="gov-input w-full text-sm resize-y min-h-[4.5rem]"
              placeholder="Instructions for production…"
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
