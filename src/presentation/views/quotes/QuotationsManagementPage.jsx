import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuotations, deleteQuotation } from "../../../infrastructure/api/backendService.js";
import { 
  MdAdd, MdSearch, MdChevronLeft, MdChevronRight, 
  MdOutlineDelete, MdEdit, MdCalendarToday, MdArrowBack
} from "react-icons/md";

import { useAuth } from "../../../application/hooks/useAuth.jsx";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", class: "bg-zinc-100 text-brand-navy/60" },
  SENT: { label: "Sent", class: "bg-brand-mint/30 text-brand-teal" },
  ACCEPTED: { label: "Accepted", class: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", class: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expired", class: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Cancelled", class: "bg-zinc-200 text-zinc-500" }
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
  const [busy, setBusy] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  const canEdit = user?.scopes?.includes("all_scope") || user?.scopes?.includes("edit_quotes") || user?.scopes?.includes("manage_quotes");

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

  return (
    <div className="max-w-7xl mx-auto animate-fade-in relative pb-12 pt-6">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-6">
           <button 
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-xl bg-white border border-brand-navy/10 flex items-center justify-center text-brand-navy/40 hover:bg-brand-navy hover:text-white transition-all shadow-sm group"
           >
              <MdArrowBack className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
           </button>
           <div>
              <h1 className="text-3xl font-bold text-brand-navy tracking-tight text-gradient">Quotation Pipeline</h1>
              <p className="mt-1 text-xs font-bold text-brand-navy/30 uppercase tracking-[0.2em]">Scale your organizational revenue tracking</p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20 group-focus-within:text-brand-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search by title, number, notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-brand-navy/10 rounded-xl text-sm font-semibold text-brand-navy placeholder:text-brand-navy/20 outline-none focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/5 transition-all w-full sm:w-80"
            />
          </div>
          {canEdit && (
            <button 
               onClick={() => navigate("/dashboard/quotes/new")}
               className="flex items-center gap-2 px-6 py-3 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
               <MdAdd className="w-5 h-5" />
               New Quotation
            </button>
          )}
        </div>
      </div>

      {errorText && (
         <div className="mb-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100 flex gap-3 items-center">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            {errorText}
         </div>
      )}

      {loading ? (
          <div className="flex justify-center p-20">
             <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
          </div>
      ) : (
          <div className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-zinc-50/50 border-b border-brand-navy/5">
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Quotation Info</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Client</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Financials</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Status</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em] text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="5" className="px-6 py-12 text-center text-brand-navy/40 font-bold italic underline decoration-brand-teal/20 decoration-2 underline-offset-4">No quotations found in this organization.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                                      <td className="px-6 py-4">
                                          <button 
                                            onClick={() => navigate(`/dashboard/quotes/${item.id}`)}
                                            className="text-left group/cell"
                                          >
                                            <div className="font-bold text-brand-navy text-sm group-hover/cell:text-brand-teal transition-colors">
                                                {item.quoteNumber || <span className="text-brand-navy/30 font-medium italic">No Number</span>}
                                            </div>
                                            <div className="text-xs font-semibold text-brand-navy/50 mt-0.5 line-clamp-1">{item.title || "Untitiled Presentation"}</div>
                                            <div className="text-[10px] font-bold text-brand-navy/20 flex items-center gap-1 mt-1 text-xs"><MdCalendarToday className="w-3 h-3"/> {new Date(item.createdAt).toLocaleDateString()}</div>
                                          </button>
                                      </td>

                                      <td className="px-6 py-4">
                                          {item.customer ? (
                                            <>
                                              <div className="text-xs font-bold text-brand-navy">{item.customer.name}</div>
                                              {item.customer.companyName && <div className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-tighter mt-0.5">{item.customer.companyName}</div>}
                                            </>
                                          ) : (
                                            <span className="text-[10px] font-bold text-brand-navy/20 uppercase tracking-widest italic">Personal Quote</span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-sm font-black text-brand-navy flex items-center gap-1.5 leading-none">
                                              <span className="text-[10px] text-brand-teal font-black">{item.currency || 'INR'}</span>
                                              {(item.totalAmount || 0).toLocaleString()}
                                          </div>
                                          <div className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest mt-1">Total Aggregate</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_CONFIG[item.status]?.class || 'bg-zinc-100'}`}>
                                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                              {STATUS_CONFIG[item.status]?.label || item.status}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                  <button 
                                                    onClick={() => navigate(`/dashboard/quotes/${item.id}`)}
                                                    className="p-2 text-brand-navy hover:text-brand-teal hover:bg-brand-mint/10 rounded-xl transition-all"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    className="p-2 text-brand-navy/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                  >
                                                      <MdOutlineDelete className="w-5 h-5" />
                                                  </button>
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>

              {totalItems > 0 && (
                  <div className="px-6 py-4 bg-zinc-50/50 border-t border-brand-navy/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest">
                          Viewing {offset + 1}–{Math.min(offset + limit, totalItems)} of {totalItems} estimates
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0 || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30 flex items-center transition-all hover:bg-white active:scale-95"><MdChevronLeft className="w-4 h-4" /></button>
                          <button onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= totalItems || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30 flex items-center transition-all hover:bg-white active:scale-95"><MdChevronRight className="w-4 h-4" /></button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-8 relative z-10 animate-scale-in border border-brand-navy/5">
             <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><MdOutlineDelete className="w-12 h-12" /></div>
             <div className="space-y-3">
               <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Discard Estimate?</h2>
               <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest leading-relaxed px-4">Terminating record <span className="text-brand-navy font-black">{deleteTargetItem.quoteNumber || "DRAFT"}</span> cannot be undone. Proceed?</p>
             </div>
             <div className="grid grid-cols-1 gap-3 pt-4">
                 <button onClick={handleApplyDelete} className="w-full py-5 bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-red-500/30 active:scale-95 transition-all">Yes, Delete Permanently</button>
                 <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-brand-navy/40 hover:text-brand-navy transition-all uppercase tracking-widest">Abandon</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

