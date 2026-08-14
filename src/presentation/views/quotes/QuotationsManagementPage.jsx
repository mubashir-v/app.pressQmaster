import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuotations, deleteQuotation } from "../../../infrastructure/api/backendService.js";
import { 
  MdAdd, MdSearch, MdChevronLeft, MdChevronRight, 
  MdOutlineDelete, MdEdit, MdCalendarToday
} from "react-icons/md";

import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { canEditQuotes } from "../../../application/auth/orgScopes.js";
import QuotationOpenModeModal from "../../components/quotes/QuotationOpenModeModal.jsx";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", class: "bg-gray-100 text-gray-600" },
  SENT: { label: "Sent", class: "bg-gov-blue-light text-gov-blue" },
  ACCEPTED: { label: "Accepted", class: "bg-gov-blue-light text-gov-blue-dark border border-gov-blue/20" },
  REJECTED: { label: "Rejected", class: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expired", class: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Cancelled", class: "bg-gray-200 text-gray-500" }
};

export default function QuotationsManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");



  // Roster State
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOpenModeModal, setShowOpenModeModal] = useState(false);
  const [openModeTarget, setOpenModeTarget] = useState(null);
  const [openModeAnchor, setOpenModeAnchor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  const canEdit = canEditQuotes(user?.scopes, user);

  async function fetchItems(query = "", currentOffset = 0) {
    setLoading(true);
    setErrorText("");
    try {
      const data = await getQuotations(query, currentOffset, limit);
      setItems(data.items || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(searchQuery, offset);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, offset]);

  useEffect(() => {
    setOffset(0);
  }, [searchQuery]);

  async function handleApplyDelete() {
    if (!deleteTargetItem) return;
    setBusy(true);
    try {
      await deleteQuotation(deleteTargetItem.id);
      setShowDeleteModal(false);
      setDeleteTargetItem(null);
      fetchItems(searchQuery, offset);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to delete quotation.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuoteRowClick(item, event) {
    if (canEdit) {
      setOpenModeTarget(item);
      setOpenModeAnchor({ x: event.clientX, y: event.clientY });
      setShowOpenModeModal(true);
      return;
    }
    navigate(`/dashboard/quotes/${item.id}/view`);
  }

  function closeOpenModeModal() {
    if (busy) return;
    setShowOpenModeModal(false);
    setOpenModeTarget(null);
    setOpenModeAnchor(null);
  }

  function openQuoteEditMode() {
    if (!openModeTarget) return;
    navigate(`/dashboard/quotes/${openModeTarget.id}`);
    closeOpenModeModal();
  }

  function openQuoteViewMode() {
    if (!openModeTarget) return;
    navigate(`/dashboard/quotes/${openModeTarget.id}/view`);
    closeOpenModeModal();
  }

  return (
    <div className="relative pb-12">
      {errorText && (
         <div className="mb-4 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 flex gap-3 items-center">
            {errorText}
         </div>
      )}

      <div className="gov-panel">
        <div className="gov-panel-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Quotation Pipeline</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, number, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gov-input pl-9 w-full sm:w-72"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => navigate("/dashboard/quotes/new")}
                className="gov-btn-primary whitespace-nowrap"
              >
                <MdAdd className="w-4 h-4" />
                New Quotation
              </button>
            )}
          </div>
        </div>

      {loading ? (
          <div className="flex justify-center p-20">
             <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin"></div>
          </div>
      ) : (
          <>
              <div className="overflow-x-auto">
                  <table className="gov-table">
                      <thead>
                          <tr>
                              <th>Quotation Info</th>
                              <th>Client</th>
                              <th>Financials</th>
                              <th>Status</th>
                              {canEdit && <th className="text-right">Actions</th>}
                          </tr>
                      </thead>
                      <tbody>
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan={canEdit ? 5 : 4} className="py-8 text-center text-gov-blue/40 font-bold italic underline decoration-brand-teal/20 decoration-2 underline-offset-4">No quotations found in this organization.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr
                                    key={item.id}
                                    onClick={(event) => handleQuoteRowClick(item, event)}
                                    className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                                  >
                                      <td>
                                          <div className="text-left">
                                            <div className="font-bold text-gov-blue text-xs leading-tight">
                                                {item.quoteNumber || <span className="text-gov-blue/30 font-medium italic">No Number</span>}
                                            </div>
                                            <div className="text-[11px] font-semibold text-gov-blue/50 line-clamp-1">{item.title || "Untitiled Presentation"}</div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                               <div className="text-[9px] font-bold text-gov-blue/20 flex items-center gap-1 uppercase tracking-wider">
                                                 <MdCalendarToday className="w-3 h-3"/> {new Date(item.createdAt).toLocaleDateString()}
                                               </div>
                                               {item.createdBy && (
                                                 <div className="text-[9px] font-black text-gov-blue uppercase tracking-wide px-1 py-px bg-gov-blue/5 rounded inline-block">
                                                    BY {item.createdBy.displayName || item.createdBy.name}
                                                 </div>
                                               )}
                                             </div>
                                          </div>
                                      </td>

                                      <td>
                                          {item.customer ? (
                                            <>
                                              <div className="text-xs font-bold text-gov-blue">{item.customer.name}</div>
                                              {item.customer.companyName && <div className="text-[10px] font-bold text-gov-blue/40 uppercase tracking-tighter mt-0.5">{item.customer.companyName}</div>}
                                            </>
                                          ) : (
                                            <span className="text-[10px] font-bold text-gov-blue/20 uppercase tracking-widest italic">Personal Quote</span>
                                          )}
                                      </td>
                                      <td>
                                          <div className="text-xs font-black text-gov-blue flex items-center gap-1 leading-none tabular-nums">
                                              <span className="text-[10px] text-gov-blue font-black">{item.currency || 'INR'}</span>
                                              {(item.totalAmount || 0).toLocaleString()}
                                          </div>
                                          <div className="text-[9px] font-black text-gov-blue/20 uppercase tracking-widest mt-0.5">Total Aggregate</div>
                                      </td>
                                      <td>
                                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${STATUS_CONFIG[item.status]?.class || 'bg-zinc-100'}`}>
                                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                              {STATUS_CONFIG[item.status]?.label || item.status}
                                          </div>
                                      </td>
                                      {canEdit && (
                                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex justify-end gap-0.5">
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/dashboard/quotes/${item.id}`);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-gov-blue hover:bg-gray-50 transition-colors"
                                                    title="Edit quotation"
                                                  >
                                                      <MdEdit className="w-4 h-4" />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDeleteTargetItem(item);
                                                      setShowDeleteModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                  >
                                                      <MdOutlineDelete className="w-4 h-4" />
                                                  </button>
                                              </div>
                                      </td>
                                      )}
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>

              {totalItems > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gov-border flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-semibold text-gray-500">
                          Viewing {offset + 1}–{Math.min(offset + limit, totalItems)} of {totalItems} estimates
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0 || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronLeft className="w-4 h-4" /></button>
                          <button onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= totalItems || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronRight className="w-4 h-4" /></button>
                      </div>
                  </div>
              )}
          </>
      )}
      </div>

      {/* Open mode picker */}
      <QuotationOpenModeModal
        open={showOpenModeModal && Boolean(openModeTarget)}
        anchor={openModeAnchor}
        quoteLabel={openModeTarget?.quoteNumber || openModeTarget?.title || "Quotation"}
        canEdit={canEdit}
        busy={busy}
        onClose={closeOpenModeModal}
        onEdit={openQuoteEditMode}
        onView={openQuoteViewMode}
      />

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
          <div className="w-full max-w-sm bg-white border border-gov-border p-8 text-center space-y-6 relative z-10">
             <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center mx-auto"><MdOutlineDelete className="w-10 h-10" /></div>
             <div className="space-y-3">
               <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tighter">Discard Estimate?</h2>
               <p className="text-xs font-bold text-gov-blue/40 uppercase tracking-widest leading-relaxed px-4">Terminating record <span className="text-gov-blue font-black">{deleteTargetItem.quoteNumber || "DRAFT"}</span> cannot be undone. Proceed?</p>
             </div>
             <div className="grid grid-cols-1 gap-3 pt-4">
                 <button onClick={handleApplyDelete} className="w-full py-3 bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">Yes, Delete Permanently</button>
                 <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-gov-blue/40 hover:text-gov-blue transition-all uppercase tracking-widest">Abandon</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

