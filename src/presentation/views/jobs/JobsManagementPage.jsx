import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getJobs,
  getJobQuotationBacklog,
} from "../../../infrastructure/api/backendService.js";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { canEditJobs, canShowQuoteAmountsInJobsContext } from "../../../application/auth/orgScopes.js";
import {
  MdSearch,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

const JOB_TABS = [
  { id: "all", label: "All jobs" },
  { id: "open", label: "Open", status: "OPEN" },
  { id: "in_progress", label: "In progress", status: "IN_PROGRESS" },
  { id: "completed", label: "Completed", status: "COMPLETED" },
];

const ALL_JOBS_PAGE_SIZE = 20;

const NOT_CREATED_CONFIG = {
  label: "Not created",
  class: "bg-amber-100 text-amber-800 border border-amber-200",
};

const JOB_STATUS_CONFIG = {
  OPEN: { label: "Open", class: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "In progress", class: "bg-gov-blue-light text-gov-blue border border-gov-blue/20" },
  ON_HOLD: { label: "On hold", class: "bg-amber-100 text-amber-800" },
  COMPLETED: { label: "Completed", class: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", class: "bg-gray-200 text-gray-500" },
};

function displayUser(user) {
  if (!user) return "—";
  return user.displayName || user.name || user.email || "—";
}

function itemIsComplete(item) {
  const tasks = item?.tasks || [];
  if (!tasks.length) return false;
  return tasks.every((t) => t.status === "COMPLETED");
}

function jobProgress(job) {
  const items = job?.items || [];
  if (!items.length) return 0;
  return Math.round((items.filter(itemIsComplete).length / items.length) * 100);
}

function customerLabel(job) {
  return job.customer?.name || job.customer?.companyName || "—";
}

function pendingBacklogItems(items = []) {
  return items.filter((q) => (q.lineItems || []).some((l) => !l.isJobbed));
}

function pendingCount(quote) {
  return (quote.lineItems || []).filter((l) => !l.isJobbed).length;
}

function normalizeTab(tab) {
  if (tab === "not_created") return "all";
  return tab || "all";
}

const COMPACT_TABLE = "gov-table w-full";

function JobsTable({ jobs, onOpenJob }) {
  return (
    <div className="overflow-x-auto">
      <table className={COMPACT_TABLE}>
        <thead>
          <tr>
            <th className="w-24">Quotation</th>
            <th className="min-w-[120px]">Customer</th>
            <th className="min-w-[140px]">Job title</th>
            <th className="w-24">Progress</th>
            <th className="w-28">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gov-blue/40 font-bold italic">
                No jobs in this stage.
              </td>
            </tr>
          ) : (
            jobs.map((job) => {
              const progress = jobProgress(job);
              return (
                <tr
                  key={job.id}
                  className="cursor-pointer hover:bg-zinc-50/80"
                  onClick={() => onOpenJob(job.id)}
                >
                  <td>
                    <div className="font-bold text-gov-blue leading-tight">{job.quotation?.quoteNumber || "—"}</div>
                    {job.jobNumber && <div className="text-[10px] text-gray-400 leading-tight">{job.jobNumber}</div>}
                  </td>
                  <td className="font-semibold text-gray-800 truncate max-w-[160px]">{customerLabel(job)}</td>
                  <td>
                    <div className="font-semibold text-gov-blue truncate">{job.title || "Untitled job"}</div>
                    <span
                      className={`inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-px ${(JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.OPEN).class}`}
                    >
                      {(JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.OPEN).label}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 bg-gray-100 border border-gov-border">
                        <div className="h-full bg-gov-blue transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-gov-blue tabular-nums">{progress}%</span>
                    </div>
                  </td>
                  <td className="truncate max-w-[120px]">{displayUser(job.assignedTo)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function AllJobsTable({ backlog, jobs, showQuoteAmounts, onOpenQuotation, onOpenJob }) {
  const hasBacklog = backlog.length > 0;
  const hasJobs = jobs.length > 0;
  const colSpan = showQuoteAmounts ? 6 : 5;

  if (!hasBacklog && !hasJobs) {
    return (
      <div className="px-6 py-8 text-center text-gov-blue/40 font-bold italic">
        No quotations or jobs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={COMPACT_TABLE}>
        <thead>
          <tr>
            <th className="w-24">Quotation</th>
            <th className="min-w-[120px]">Customer</th>
            <th className="min-w-[140px]">Title / status</th>
            <th className="w-24">Progress</th>
            <th className="w-28">Assigned</th>
            {showQuoteAmounts && <th className="w-24 text-right pr-2">Total</th>}
          </tr>
        </thead>
        <tbody>
          {hasBacklog && (
            <>
              <tr className="bg-amber-50/60">
                <td colSpan={colSpan} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Awaiting job creation ({backlog.length})
                </td>
              </tr>
              {backlog.map((quote) => {
                const pending = pendingCount(quote);
                return (
                  <tr
                    key={`backlog-${quote.id}`}
                    className="cursor-pointer hover:bg-zinc-50/80"
                    onClick={() => onOpenQuotation(quote.id)}
                  >
                    <td>
                      <div className="font-bold text-gov-blue leading-tight">{quote.quoteNumber || "—"}</div>
                    </td>
                    <td className="font-semibold text-gray-800 truncate max-w-[160px]">{quote.customerName || "—"}</td>
                    <td>
                      <div className="font-semibold text-gov-blue truncate">{quote.title || "Untitled quotation"}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-px ${NOT_CREATED_CONFIG.class}`}>
                          {NOT_CREATED_CONFIG.label}
                        </span>
                        <span className="text-[10px] text-brand-teal font-bold">
                          {pending} pending
                        </span>
                      </div>
                    </td>
                    <td className="text-[10px] text-gray-400">—</td>
                    <td className="text-[10px] text-gray-400">—</td>
                    {showQuoteAmounts && (
                      <td className="font-bold text-gov-blue tabular-nums text-right pr-2">
                        ₹ {(quote.totalAmount || 0).toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </>
          )}

          {hasBacklog && hasJobs && (
            <tr className="bg-gray-50">
              <td colSpan={colSpan} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Production jobs ({jobs.length}{jobs.length >= ALL_JOBS_PAGE_SIZE ? "+" : ""})
              </td>
            </tr>
          )}

          {jobs.map((job) => {
            const progress = jobProgress(job);
            return (
              <tr
                key={job.id}
                className="cursor-pointer hover:bg-zinc-50/80"
                onClick={() => onOpenJob(job.id)}
              >
                <td>
                  <div className="font-bold text-gov-blue leading-tight">{job.quotation?.quoteNumber || "—"}</div>
                  {job.jobNumber && <div className="text-[10px] text-gray-400 leading-tight">{job.jobNumber}</div>}
                </td>
                <td className="font-semibold text-gray-800 truncate max-w-[160px]">{customerLabel(job)}</td>
                <td>
                  <div className="font-semibold text-gov-blue truncate">{job.title || "Untitled job"}</div>
                  <span
                    className={`inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-px ${(JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.OPEN).class}`}
                  >
                    {(JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.OPEN).label}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-14 bg-gray-100 border border-gov-border">
                      <div className="h-full bg-gov-blue transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gov-blue tabular-nums">{progress}%</span>
                  </div>
                </td>
                <td className="truncate max-w-[120px]">{displayUser(job.assignedTo)}</td>
                {showQuoteAmounts && <td className="text-right pr-2 text-[10px] text-gray-400">—</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function JobsManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit = canEditJobs(user?.scopes, user);
  const showQuoteAmounts = canShowQuoteAmountsInJobsContext(user?.scopes, user);

  const [activeTab, setActiveTab] = useState(normalizeTab(location.state?.tab));
  const [errorText, setErrorText] = useState("");
  const [jobSearch, setJobSearch] = useState("");

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobOffset, setJobOffset] = useState(0);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobLimit] = useState(10);

  const [allBacklog, setAllBacklog] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [allTabLoading, setAllTabLoading] = useState(false);
  const [allTabLoadingMore, setAllTabLoadingMore] = useState(false);
  const [allBacklogOffset, setAllBacklogOffset] = useState(0);
  const [allBacklogHasMore, setAllBacklogHasMore] = useState(true);
  const [allJobsOffset, setAllJobsOffset] = useState(0);
  const [allJobsHasMore, setAllJobsHasMore] = useState(true);
  const loadMoreRef = useRef(null);
  const allBacklogOffsetRef = useRef(0);
  const allJobsOffsetRef = useRef(0);
  const allBacklogHasMoreRef = useRef(true);
  const allJobsHasMoreRef = useRef(true);

  const activeStatusTab = JOB_TABS.find((t) => t.id === activeTab);
  const isStatusTab = Boolean(activeStatusTab?.status);
  const isAllJobsTab = activeTab === "all";

  const resetAllTab = useCallback(() => {
    setAllBacklog([]);
    setAllJobs([]);
    setAllBacklogOffset(0);
    setAllJobsOffset(0);
    setAllBacklogHasMore(true);
    setAllJobsHasMore(true);
    allBacklogOffsetRef.current = 0;
    allJobsOffsetRef.current = 0;
    allBacklogHasMoreRef.current = true;
    allJobsHasMoreRef.current = true;
  }, []);

  const loadAllTabInitial = useCallback(async (query = "") => {
    setAllTabLoading(true);
    setErrorText("");
    try {
      const [backlogData, jobsData] = await Promise.all([
        getJobQuotationBacklog(query, 0, ALL_JOBS_PAGE_SIZE),
        getJobs(query, 0, ALL_JOBS_PAGE_SIZE, ""),
      ]);

      const backlogItems = pendingBacklogItems(backlogData.items || []);
      const jobItems = jobsData.items || [];
      const backlogTotal = backlogData.pagination?.total || 0;
      const jobsTotal = jobsData.pagination?.total || 0;

      setAllBacklog(backlogItems);
      setAllJobs(jobItems);

      const nextBacklogOffset = ALL_JOBS_PAGE_SIZE;
      const nextJobsOffset = jobItems.length;

      allBacklogOffsetRef.current = nextBacklogOffset;
      allJobsOffsetRef.current = nextJobsOffset;
      setAllBacklogOffset(nextBacklogOffset);
      setAllJobsOffset(nextJobsOffset);

      const backlogHasMore = nextBacklogOffset < backlogTotal;
      const jobsHasMore = nextJobsOffset < jobsTotal;
      allBacklogHasMoreRef.current = backlogHasMore;
      allJobsHasMoreRef.current = jobsHasMore;
      setAllBacklogHasMore(backlogHasMore);
      setAllJobsHasMore(jobsHasMore);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load jobs.");
      setAllBacklog([]);
      setAllJobs([]);
      allBacklogHasMoreRef.current = false;
      allJobsHasMoreRef.current = false;
      setAllBacklogHasMore(false);
      setAllJobsHasMore(false);
    } finally {
      setAllTabLoading(false);
    }
  }, []);

  const loadMoreAllTab = useCallback(async (query = "") => {
    if (!allBacklogHasMoreRef.current && !allJobsHasMoreRef.current) return;

    setAllTabLoadingMore(true);
    setErrorText("");
    try {
      if (allBacklogHasMoreRef.current) {
        const data = await getJobQuotationBacklog(query, allBacklogOffsetRef.current, ALL_JOBS_PAGE_SIZE);
        const items = pendingBacklogItems(data.items || []);
        const total = data.pagination?.total || 0;
        const nextOffset = allBacklogOffsetRef.current + ALL_JOBS_PAGE_SIZE;

        setAllBacklog((prev) => [...prev, ...items]);
        allBacklogOffsetRef.current = nextOffset;
        setAllBacklogOffset(nextOffset);

        const hasMore = nextOffset < total;
        allBacklogHasMoreRef.current = hasMore;
        setAllBacklogHasMore(hasMore);
      } else if (allJobsHasMoreRef.current) {
        const data = await getJobs(query, allJobsOffsetRef.current, ALL_JOBS_PAGE_SIZE, "");
        const items = data.items || [];
        const total = data.pagination?.total || 0;
        const nextOffset = allJobsOffsetRef.current + items.length;

        setAllJobs((prev) => [...prev, ...items]);
        allJobsOffsetRef.current = nextOffset;
        setAllJobsOffset(nextOffset);

        const hasMore = nextOffset < total;
        allJobsHasMoreRef.current = hasMore;
        setAllJobsHasMore(hasMore);
      }
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load more.");
      allBacklogHasMoreRef.current = false;
      allJobsHasMoreRef.current = false;
      setAllBacklogHasMore(false);
      setAllJobsHasMore(false);
    } finally {
      setAllTabLoadingMore(false);
    }
  }, []);

  async function fetchJobs(query = "", offset = 0, status = "") {
    setJobsLoading(true);
    setErrorText("");
    try {
      const data = await getJobs(query, offset, jobLimit, status);
      setJobs(data.items || []);
      setJobTotal(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load jobs.");
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(normalizeTab(location.state.tab));
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.tab]);

  useEffect(() => {
    if (!isStatusTab) return;
    const timer = setTimeout(() => {
      fetchJobs(jobSearch, jobOffset, activeStatusTab?.status || "");
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, jobSearch, jobOffset, activeStatusTab?.status, isStatusTab]);

  useEffect(() => {
    if (!isAllJobsTab) return;
    const timer = setTimeout(() => {
      resetAllTab();
      loadAllTabInitial(jobSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, jobSearch, isAllJobsTab, loadAllTabInitial, resetAllTab]);

  useEffect(() => {
    setJobOffset(0);
  }, [jobSearch, activeTab]);

  useEffect(() => {
    if (!isAllJobsTab) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || allTabLoading || allTabLoadingMore) return;
        if (allBacklogHasMoreRef.current || allJobsHasMoreRef.current) {
          loadMoreAllTab(jobSearch);
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isAllJobsTab, allTabLoading, allTabLoadingMore, jobSearch, loadMoreAllTab]);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setJobSearch("");
    resetAllTab();
  }

  function openJob(jobId) {
    navigate(`/dashboard/jobs/${jobId}`, { state: { tab: activeTab } });
  }

  function openQuotation(quotationId) {
    navigate(`/dashboard/jobs/quotation/${quotationId}`);
  }

  const listLoading = isAllJobsTab ? allTabLoading : jobsLoading;
  const hasMoreAll = allBacklogHasMore || allJobsHasMore;
  const allCount = allBacklog.length + allJobs.length;

  return (
    <div className="relative pb-12">
      {errorText && (
        <div className="mb-4 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200">
          {errorText}
        </div>
      )}

      {!canEdit && (
        <div className="mb-4 bg-amber-50 p-3 text-sm font-semibold text-amber-800 border border-amber-200">
          View only — you can browse quotations and jobs but cannot create or update them.
        </div>
      )}

      {canEdit && !showQuoteAmounts && (
        <div className="mb-4 bg-gov-blue-light/40 p-3 text-sm text-gov-blue border border-gov-blue/20">
          Production view — line item details are shown without quote amounts.
        </div>
      )}

      <div className="gov-panel">
        <div className="gov-panel-header">
          <div className="flex flex-wrap border border-gov-border w-fit">
            {JOB_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-l border-gov-border first:border-l-0 whitespace-nowrap ${
                  activeTab === tab.id ? "bg-gov-blue text-white" : "bg-white text-gov-blue hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gov-border">
          <div className="relative max-w-md">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                isAllJobsTab
                  ? "Search quotation, customer, or job title..."
                  : "Search customer, quotation, or job title..."
              }
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="gov-input pl-9 w-full"
            />
          </div>
        </div>

        {listLoading ? (
          <div className="flex justify-center p-20">
            <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin" />
          </div>
        ) : isAllJobsTab ? (
          <>
            <AllJobsTable
              backlog={allBacklog}
              jobs={allJobs}
              showQuoteAmounts={showQuoteAmounts}
              onOpenQuotation={openQuotation}
              onOpenJob={openJob}
            />
            <div ref={loadMoreRef} className="h-1" aria-hidden />
            {allTabLoadingMore && (
              <div className="flex justify-center py-4 border-t border-gov-border">
                <div className="w-6 h-6 border-2 border-gov-border border-t-gov-blue animate-spin" />
              </div>
            )}
            {!allTabLoading && allCount > 0 && (
              <div className="px-4 py-3 border-t border-gov-border text-xs text-gray-500">
                {hasMoreAll
                  ? `Showing ${allCount} entries — scroll for more`
                  : `Showing all ${allCount} entr${allCount === 1 ? "y" : "ies"}`}
              </div>
            )}
          </>
        ) : (
          <>
            <JobsTable jobs={jobs} onOpenJob={openJob} />
            {jobTotal > jobLimit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gov-border">
                <span className="text-xs text-gray-500">
                  {jobOffset + 1}–{Math.min(jobOffset + jobLimit, jobTotal)} of {jobTotal}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={jobOffset === 0}
                    onClick={() => setJobOffset(Math.max(0, jobOffset - jobLimit))}
                    className="gov-btn-secondary disabled:opacity-40"
                  >
                    <MdChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={jobOffset + jobLimit >= jobTotal}
                    onClick={() => setJobOffset(jobOffset + jobLimit)}
                    className="gov-btn-secondary disabled:opacity-40"
                  >
                    <MdChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
