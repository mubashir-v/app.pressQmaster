import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getJob, updateJob, getOrganizationMembers, getQuotation, getJobs } from "../../../infrastructure/api/backendService.js";
import { SelectField, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import JobItemProductionDetails, { SpecGrid, detectWorkType } from "./JobItemProductionDetails.jsx";
import { layoutPreviewPropsFromItem } from "../../components/quotes/layoutPreviewProps.js";
import { buildPlainProductionSpecs, findJobForQuotationLine } from "./productionPlainLanguage.js";
import QuoteProductionStatus from "./QuoteProductionStatus.jsx";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { canEditJobs, canShowQuoteAmountsInJobsContext } from "../../../application/auth/orgScopes.js";
import { MdArrowBack, MdWork } from "react-icons/md";

const JOB_STATUS_CONFIG = {
  OPEN: { label: "Open", class: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "In progress", class: "bg-gov-blue-light text-gov-blue border border-gov-blue/20" },
  ON_HOLD: { label: "On hold", class: "bg-amber-100 text-amber-800" },
  COMPLETED: { label: "Completed", class: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", class: "bg-gray-200 text-gray-500" },
};

const TASK_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TASK_STATUS_BUTTON = {
  PENDING: {
    active: "bg-gray-600 text-white border-gray-600",
    idle: "bg-white text-gray-600 border-gov-border hover:bg-gray-50",
  },
  IN_PROGRESS: {
    active: "bg-gov-blue text-white border-gov-blue",
    idle: "bg-white text-gov-blue border-gov-border hover:bg-gov-blue-light/30",
  },
  COMPLETED: {
    active: "bg-green-700 text-white border-green-700",
    idle: "bg-white text-green-700 border-gov-border hover:bg-green-50",
  },
  CANCELLED: {
    active: "bg-gray-400 text-white border-gray-400",
    idle: "bg-white text-gray-500 border-gov-border hover:bg-gray-50",
  },
};

function TaskStatusButtons({ value, disabled, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
      {TASK_STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const styles = TASK_STATUS_BUTTON[opt.value] || TASK_STATUS_BUTTON.PENDING;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-1.5 text-[10px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active ? styles.active : styles.idle
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const JOB_PREVIEW_PANEL_CLASS =
  "w-full lg:flex-[2] lg:min-w-[440px] lg:max-w-[58%] shrink-0 flex flex-col min-h-0 lg:min-h-0 border-t lg:border-t-0 lg:border-l border-gov-border bg-white";
const JOB_PREVIEW_SPECS_CLASS = "space-y-3 border border-gov-border bg-white p-3";
const JOB_PREVIEW_DETAILS_CLASS =
  "overflow-hidden border border-gov-border border-solid border-gov-blue bg-gov-blue-light p-2 lg:p-3 flex flex-col min-h-[240px]";
const JOB_TASK_UPDATE_CLASS = "space-y-3 border border-gov-border bg-white p-3";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function displayUser(user) {
  if (!user) return "—";
  return user.displayName || user.name || user.email || "—";
}

function itemIsComplete(item) {
  const tasks = item?.tasks || [];
  if (!tasks.length) return false;
  return tasks.every((t) => t.status === "COMPLETED");
}

function itemPrimaryStatus(item) {
  const tasks = item?.tasks || [];
  if (!tasks.length) return "PENDING";
  if (tasks.length === 1) return tasks[0].status;
  if (tasks.every((t) => t.status === "COMPLETED")) return "COMPLETED";
  if (tasks.some((t) => t.status === "IN_PROGRESS")) return "IN_PROGRESS";
  if (tasks.every((t) => t.status === "CANCELLED")) return "CANCELLED";
  return tasks[0].status;
}

function itemPrimaryTask(item) {
  return item?.tasks?.[0] || null;
}

function jobProgress(job) {
  const items = job?.items || [];
  if (!items.length) return 0;
  return Math.round((items.filter(itemIsComplete).length / items.length) * 100);
}

function jobItemToPatchInput(item) {
  return {
    quotationLineIndex: item.quotationLineIndex,
    lineKind: item.lineKind,
    title: item.title,
    description: item.description,
    quantity: item.quantity,
    meta: item.meta,
    tasks: (item.tasks || []).map((t) => ({
      category: t.category,
      title: t.title,
      status: t.status,
      sortOrder: t.sortOrder,
      assignedToUserId: t.assignedToUserId,
      notes: t.notes,
    })),
  };
}

function customerLabel(job) {
  return job?.customer?.name || job?.customer?.companyName || "—";
}

function itemKey(item, index = 0) {
  if (!item) return String(index);
  return item.id || item._id || `line-${item.quotationLineIndex ?? index}`;
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canEdit = canEditJobs(user?.scopes, user);
  const hidePricing = !canShowQuoteAmountsInJobsContext(user?.scopes, user);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  const [taskNotesDraft, setTaskNotesDraft] = useState("");
  const [quoteContext, setQuoteContext] = useState(null);
  const [quoteJobs, setQuoteJobs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!jobId) return;
      setLoading(true);
      setErrorText("");
      try {
        const [jobData, membersData] = await Promise.all([
          getJob(jobId),
          canEdit ? getOrganizationMembers() : Promise.resolve({ members: [] }),
        ]);
        if (cancelled) return;
        const loadedJob = jobData.job;
        setJob(loadedJob);
        if (loadedJob?.items?.length) {
          setSelectedLineIndex((prev) => {
            if (prev != null) return prev;
            return loadedJob.items[0].quotationLineIndex ?? 0;
          });
        }
        setMembers((membersData.members || []).filter((m) => m.memberActive !== false));
      } catch (e) {
        if (!cancelled) setErrorText(e.response?.data?.message || "Failed to load job.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, canEdit]);

  useEffect(() => {
    if (!job?.items?.length) return;
    setSelectedLineIndex((prev) => {
      if (prev != null) return prev;
      return job.items[0].quotationLineIndex ?? 0;
    });
  }, [job]);

  const selectedItem = useMemo(() => {
    if (!job?.items?.length || selectedLineIndex == null) return null;
    return job.items.find((item) => item.quotationLineIndex === selectedLineIndex) ?? null;
  }, [job, selectedLineIndex]);

  const isCurrentJobLine = Boolean(selectedItem);

  const previewItem = useMemo(() => {
    if (selectedLineIndex == null) return null;
    if (selectedItem) return selectedItem;
    const match = findJobForQuotationLine(quoteJobs, selectedLineIndex);
    if (match?.item) return match.item;
    return quoteContext?.lineItems?.[selectedLineIndex] ?? null;
  }, [selectedLineIndex, selectedItem, quoteJobs, quoteContext]);

  const otherJobForLine = useMemo(() => {
    if (selectedLineIndex == null || isCurrentJobLine) return null;
    return findJobForQuotationLine(quoteJobs, selectedLineIndex);
  }, [selectedLineIndex, isCurrentJobLine, quoteJobs]);

  useEffect(() => {
    setTaskNotesDraft(itemPrimaryTask(selectedItem)?.notes || "");
  }, [selectedItem]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuoteContext() {
      const quotationId = job?.quotationId || job?.quotation?.id;
      if (!quotationId) {
        setQuoteContext(null);
        setQuoteJobs([]);
        return;
      }
      try {
        const [quoteData, jobsData] = await Promise.all([
          getQuotation(quotationId),
          getJobs("", 0, 100, "", quotationId),
        ]);
        if (cancelled) return;
        setQuoteContext(quoteData.quotation || quoteData);
        setQuoteJobs(jobsData.items || []);
      } catch {
        if (!cancelled) {
          setQuoteContext(null);
          setQuoteJobs([]);
        }
      }
    }
    loadQuoteContext();
    return () => {
      cancelled = true;
    };
  }, [job?.quotationId, job?.quotation?.id]);

  const memberOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((m) => ({ value: m.userId, label: m.displayName || m.email })),
  ];

  async function patchJob(fields) {
    if (!canEdit || !job) return;
    setBusy(true);
    setErrorText("");
    try {
      const data = await updateJob(job.id, fields);
      setJob(data.job);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to update job.");
    } finally {
      setBusy(false);
    }
  }

  async function patchSelectedItemTask(updates) {
    if (!job || !selectedItem || !isCurrentJobLine) return;
    const selectedKey = itemKey(selectedItem);
    const items = job.items.map((item, idx) => {
      if (itemKey(item, idx) !== selectedKey) return jobItemToPatchInput(item);
      const existing = itemPrimaryTask(item);
      return {
        ...jobItemToPatchInput(item),
        tasks: [
          {
            category: existing?.category || "PRINTING",
            title: existing?.title || item.title || "Production",
            status: updates.status ?? existing?.status ?? "PENDING",
            sortOrder: 0,
            assignedToUserId:
              updates.assignedToUserId !== undefined
                ? updates.assignedToUserId
                : existing?.assignedToUserId ?? null,
            notes: updates.notes !== undefined ? updates.notes : existing?.notes ?? null,
          },
        ],
      };
    });
    await patchJob({ items });
  }

  async function handleTaskStatusChange(newStatus) {
    await patchSelectedItemTask({ status: newStatus });
  }

  async function handleTaskAssigneeChange(userId) {
    await patchSelectedItemTask({ assignedToUserId: userId || null });
  }

  async function handleTaskNotesBlur() {
    const existing = itemPrimaryTask(selectedItem);
    const trimmed = taskNotesDraft.trim();
    if ((existing?.notes || "") === trimmed) return;
    await patchSelectedItemTask({ notes: trimmed || null });
  }

  function goBack() {
    navigate("/dashboard/jobs", { state: { tab: location.state?.tab } });
  }

  function handleSelectQuotationLine(lineIndex) {
    setSelectedLineIndex(lineIndex);
  }

  const previewMeta = previewItem?.meta || {};
  const previewWorkType = detectWorkType(previewMeta);
  const previewItemTitle = previewItem?.meta?.itemTitle || previewItem?.title || null;
  const isBrochurePreview = previewWorkType === "brochure";
  const previewLayoutPreview = previewItem
    ? layoutPreviewPropsFromItem(previewItem, previewMeta, { hidePricing })
    : null;
  const previewPlainSpecs = useMemo(
    () =>
      previewItem && !isBrochurePreview
        ? buildPlainProductionSpecs(previewItem, {
            hidePricing,
            workType: previewWorkType,
            layoutPreview: previewLayoutPreview,
          })
        : [],
    [previewItem, hidePricing, isBrochurePreview, previewWorkType, previewLayoutPreview],
  );
  const previewCurrency = quoteContext?.currency || job?.quotation?.currency || "INR";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold mb-4">{errorText || "Job not found."}</p>
        <button type="button" onClick={goBack} className="gov-btn-secondary">
          Back to jobs
        </button>
      </div>
    );
  }

  const progress = jobProgress(job);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-gov-bg overflow-x-hidden select-none">
      {errorText && (
        <div className="shrink-0 mb-2 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200">
          {errorText}
        </div>
      )}

      {/* Job header — mirrors quotation header density */}
      <section className="shrink-0 border-b border-gov-border bg-white px-3 py-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={goBack}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 border border-gov-border shrink-0"
            title="Back to jobs"
          >
            <MdArrowBack className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-[220px] border border-gov-border px-2 py-1 bg-white text-[11px] leading-tight">
            <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
              <span>{formatDate(job.createdAt)}</span>
              {busy && <div className="w-2.5 h-2.5 border border-gov-border border-t-gov-blue animate-spin" />}
            </div>
            <div className="grid grid-cols-[52px_1fr] gap-x-1 gap-y-0.5">
              <span className="text-gray-500">Cust :</span>
              <span className="font-semibold text-gov-blue truncate">{customerLabel(job)}</span>
              <span className="text-gray-500">Quote :</span>
              <span className="font-medium text-gov-blue truncate">{job.quotation?.quoteNumber || "—"}</span>
            </div>
          </div>

          <div className="flex items-end gap-2 flex-1 min-w-[240px]">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Job title</label>
              <input
                type="text"
                readOnly={!canEdit}
                value={job.title || ""}
                onChange={(e) => setJob({ ...job, title: e.target.value })}
                onBlur={() => canEdit && patchJob({ title: job.title?.trim() || null })}
                className={`gov-input py-1 text-xs ${!canEdit ? "bg-gray-50 cursor-default" : ""}`}
                placeholder="Untitled job"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Job status</label>
              <select
                value={job.status}
                disabled={!canEdit || busy}
                onChange={(e) => patchJob({ status: e.target.value })}
                className={`gov-input py-1 text-xs ${canEdit ? "cursor-pointer" : "bg-gray-50 cursor-default"}`}
              >
                {Object.entries(JOB_STATUS_CONFIG).map(([value, cfg]) => (
                  <option key={value} value={value}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Assigned to</label>
              <select
                value={job.assignedToUserId || ""}
                disabled={!canEdit || busy}
                onChange={(e) => patchJob({ assignedToUserId: e.target.value || null })}
                className={`gov-input py-1 text-xs ${canEdit ? "cursor-pointer" : "bg-gray-50 cursor-default"}`}
              >
                {memberOptions.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <MdWork className="w-5 h-5 text-gov-blue" />
            <span className="px-2 py-1 bg-gov-blue text-white text-[11px] font-bold">{job.jobNumber || "Job"}</span>
            <div className="hidden sm:flex flex-col items-end min-w-[72px]">
              <span className="text-[9px] text-gray-400 uppercase">Done</span>
              <span className="text-sm font-bold text-gov-blue tabular-nums">{progress}%</span>
            </div>
          </div>
        </div>
      </section>

      {quoteContext ? (
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 lg:flex-[3] min-w-0 min-h-0 flex flex-col">
            <QuoteProductionStatus
              quotation={quoteContext}
              quoteJobs={quoteJobs}
              currentJobId={job.id}
              title="Items"
              groupByCurrentJob
              fillHeight
              detailLineIndex={selectedLineIndex}
              onSelectLine={handleSelectQuotationLine}
            />
          </div>

          <aside className={JOB_PREVIEW_PANEL_CLASS}>
            <div className="flex items-stretch border-b border-gov-border bg-gray-50 shrink-0">
              <div className="flex items-center px-3 min-h-10 border-r border-gov-border bg-gov-blue text-white shrink-0">
                <span className="text-xs font-semibold whitespace-nowrap">
                  {isCurrentJobLine ? "Task update" : "Item details"}
                </span>
              </div>
              <div className="flex flex-col justify-center px-3 flex-1 min-w-0 min-h-10 py-1">
                {previewItem ? (
                  <>
                    <span className="text-sm font-bold text-gov-blue truncate">
                      {previewItemTitle || "Untitled"}
                    </span>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      Line {(selectedLineIndex ?? 0) + 1}
                      {!isCurrentJobLine && <span className="text-gray-400"> · View only</span>}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">Select an item</span>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {previewItem ? (
                <>
                  {!isCurrentJobLine && (
                    <div className="border border-gov-border bg-gray-50 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                      {otherJobForLine ? (
                        <>
                          <span className="text-[11px] text-gray-600">
                            On job{" "}
                            <strong className="text-gov-blue">{otherJobForLine.job.jobNumber || "—"}</strong> — view
                            only
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center px-2 py-1 text-[10px] font-semibold text-gov-blue border border-gov-border bg-white hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => navigate(`/dashboard/jobs/${otherJobForLine.job.id}`)}
                          >
                            Go to job
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-600">Not on a job yet — view only</span>
                      )}
                    </div>
                  )}

                  {previewItem.description && (
                    <div className="border border-gov-border bg-white px-3 py-2">
                      <div className="text-[11px] text-gray-600 leading-relaxed">{previewItem.description}</div>
                    </div>
                  )}

                  {isCurrentJobLine && selectedItem && (
                    <div className={JOB_TASK_UPDATE_CLASS}>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Update task</div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">Task status</label>
                        <TaskStatusButtons
                          value={itemPrimaryStatus(selectedItem)}
                          disabled={!canEdit || busy}
                          onChange={handleTaskStatusChange}
                        />
                      </div>
                      <SelectField
                        label="Task assignee"
                        value={itemPrimaryTask(selectedItem)?.assignedToUserId || ""}
                        onChange={(e) => handleTaskAssigneeChange(e.target.value)}
                        disabled={!canEdit || busy}
                        options={memberOptions}
                      />
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Production notes</label>
                        <textarea
                          value={taskNotesDraft}
                          readOnly={!canEdit}
                          disabled={busy}
                          onChange={(e) => setTaskNotesDraft(e.target.value)}
                          onBlur={() => canEdit && handleTaskNotesBlur()}
                          rows={3}
                          placeholder="Notes for production staff…"
                          className={`gov-input w-full text-xs resize-y min-h-16 ${!canEdit ? "bg-gray-50 cursor-default" : ""}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <TextField label="Quantity" value={String(selectedItem.quantity ?? "")} disabled className="opacity-90" />
                        <TextField label="Line type" value={selectedItem.lineKind || "PRINTING"} disabled className="opacity-90" />
                      </div>
                    </div>
                  )}

                  {!isBrochurePreview && previewPlainSpecs.length > 0 && (
                    <div className={JOB_PREVIEW_SPECS_CLASS}>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        What production needs to know
                      </div>
                      <SpecGrid specs={previewPlainSpecs} compact />
                    </div>
                  )}

                  <div className={JOB_PREVIEW_DETAILS_CLASS}>
                    <JobItemProductionDetails
                      item={previewItem}
                      hidePricing={hidePricing}
                      currency={previewCurrency}
                      variant="panel"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center py-12 px-4 text-center">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                    Click any item to view production details
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <section className="flex-1 flex items-center justify-center bg-white text-[11px] text-gray-400 uppercase tracking-wider">
          Quotation context unavailable
        </section>
      )}
    </div>
  );
}
