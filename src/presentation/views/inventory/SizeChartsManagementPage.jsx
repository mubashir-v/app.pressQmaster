import React, { useState, useEffect } from "react";
import { 
  getSizeCharts, createSizeChart, updateSizeChart, deleteSizeChart 
} from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import { 
  MdAdd, MdClose, MdSearch, MdChevronLeft, MdChevronRight, 
  MdOutlineDelete, MdEdit, MdFormatSize, MdCheckCircle, MdLayers
} from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

export default function SizeChartsManagementPage() {
  const { user } = useAuth();
  
  // Scopes protection
  const canEdit = user?.scopes?.includes("all_scope") || user?.scopes?.includes("edit_sizeChart") || user?.scopes?.includes("manage_sizeChart");
  const canDelete = user?.scopes?.includes("all_scope") || user?.scopes?.includes("manage_sizeChart");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [breadth, setBreadth] = useState("");
  const [unit, setUnit] = useState(user.settings?.defaultLengthUnit || "inch");
  const [isActive, setIsActive] = useState(true);


  async function fetchItems(q = "", currentOffset = 0) {
    setLoading(true);
    setErrorText("");
    try {
      const data = await getSizeCharts(q, currentOffset, limit);
      setItems(data.items || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load size charts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(searchQuery, offset), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, offset]);

  function resetForm() {
    setName(""); setWidth(""); setBreadth(""); setUnit(user.settings?.defaultLengthUnit || "inch"); setIsActive(true);
    setEditingItemId(null); setModalError(""); setFieldErrors({});
  }


  function handleEditClick(item) {
    resetForm();
    setEditingItemId(item.id);
    setName(item.name || "");
    setWidth(item.width || "");
    setBreadth(item.breadth || "");
    setUnit(item.unit || "inch");
    setIsActive(item.isActive ?? true);
    setShowModal(true);

  }

  async function handleSave() {
    if (!name.trim()) { setModalError("Name is required."); return; }
    setBusy(true); setModalError(""); setFieldErrors({});
    try {
      const payload = {
        name: name.trim(),
        width: Number(width),
        breadth: Number(breadth),
        unit,
        isActive
      };


      if (editingItemId) await updateSizeChart(editingItemId, payload);
      else await createSizeChart(payload);
      
      setShowModal(false); resetForm(); fetchItems(searchQuery, offset);
    } catch (e) {
      if (e.response?.data?.code === "VALIDATION_ERROR") {
        setFieldErrors(e.response.data.issues?.fieldErrors || {});
        setModalError("Please correct the highlighted fields.");
      } else {
        setModalError(e.response?.data?.message || "Failed to save size chart.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyDelete() {
    if (!deleteTargetItem) return;
    setBusy(true);
    try {
      await deleteSizeChart(deleteTargetItem.id);
      setShowDeleteModal(false); setDeleteTargetItem(null); fetchItems(searchQuery, offset);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to delete item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Size Charts</h1>
           <p className="mt-2 text-brand-navy/60 font-medium">Standardize dimensions for printing jobs (A4, A3, Custom sizes).</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20 group-focus-within:text-brand-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or unit..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-brand-navy/10 rounded-xl text-sm font-semibold text-brand-navy placeholder:text-brand-navy/20 outline-none focus:border-brand-teal/40 transition-all w-full sm:w-80"
            />
          </div>
          {canEdit && (
            <button 
               onClick={() => { resetForm(); setShowModal(true); }}
               className="flex items-center gap-2 px-6 py-3 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
               <MdAdd className="w-5 h-5" /> New Size
            </button>
          )}
        </div>
      </div>

      {errorText && (
         <div className="mb-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100 flex gap-3 items-center">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> {errorText}
         </div>
      )}

      {loading ? (
          <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div></div>
      ) : (
          <div className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-zinc-50 border-b border-brand-navy/5">
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest pl-10">Name / Label</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest text-center">Dimensions</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest text-center">Unit</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest text-right pr-10">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                          {items.length === 0 ? (
                              <tr><td colSpan="4" className="px-6 py-12 text-center text-brand-navy/40 font-bold italic underline decoration-brand-navy/10 underline-offset-4">No size charts registered yet.</td></tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors group">
                                      <td className="px-6 py-5 relative pl-10">
                                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${item.isActive ? 'bg-brand-mint' : 'bg-zinc-100'}`}></div>
                                          <div className="font-bold text-brand-navy text-sm flex items-center gap-2">
                                             {item.name}
                                             {!item.isActive && <span className="text-[9px] font-black text-red-400 border border-red-400 bg-red-50 px-1.5 py-0.5 rounded uppercase">Inactive</span>}
                                          </div>
                                      </td>

                                      <td className="px-6 py-5 text-center">
                                          <div className="inline-flex items-center gap-1.5 bg-brand-navy/5 px-3 py-1.5 rounded-lg border border-brand-navy/5">
                                             <span className="text-sm font-black text-brand-navy tabular-nums">{item.width}</span>
                                             <span className="text-[10px] font-black text-brand-navy/30 uppercase">x</span>
                                             <span className="text-sm font-black text-brand-navy tabular-nums">{item.breadth}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                          <span className="px-3 py-1 rounded-full bg-brand-mint/20 text-brand-teal text-[10px] font-black uppercase tracking-widest">
                                             {item.unit}
                                          </span>
                                      </td>
                                      <td className="px-6 py-5 text-right pr-10">
                                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {canEdit && (
                                                <button onClick={() => handleEditClick(item)} className="p-2 text-brand-navy/40 hover:text-brand-teal hover:bg-brand-mint/10 rounded-xl transition-all"><MdEdit className="w-5 h-5" /></button>
                                              )}
                                              {canDelete && (
                                                <button onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }} className="p-2 text-brand-navy/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><MdOutlineDelete className="w-5 h-5" /></button>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Pagination Footer */}
              {totalItems > limit && (
                <div className="px-10 py-6 bg-zinc-50/50 border-t border-brand-navy/5 flex items-center justify-between">
                   <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">
                      Showing {offset + 1} - {Math.min(offset + limit, totalItems)} of {totalItems} sizes
                   </div>
                   <div className="flex gap-2">
                       <button 
                        disabled={offset === 0 || loading}
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        className="w-10 h-10 rounded-xl border border-brand-navy/10 flex items-center justify-center text-brand-navy/40 hover:bg-white hover:text-brand-navy hover:shadow-sm transition-all disabled:opacity-20"
                       >
                          <MdChevronLeft className="w-6 h-6" />
                       </button>
                       <button 
                        disabled={offset + limit >= totalItems || loading}
                        onClick={() => setOffset(offset + limit)}
                        className="w-10 h-10 rounded-xl border border-brand-navy/10 flex items-center justify-center text-brand-navy/40 hover:bg-white hover:text-brand-navy hover:shadow-sm transition-all disabled:opacity-20"
                       >
                          <MdChevronRight className="w-6 h-6" />
                       </button>
                   </div>
                </div>
              )}

          </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm" onClick={() => !busy && setShowModal(false)}></div>
           <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl relative z-10 flex flex-col animate-fade-in max-h-[90vh]">
              <div className="p-8 border-b border-brand-navy/5 flex items-center justify-between bg-zinc-50/50 rounded-t-[2rem]">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-navy text-white flex items-center justify-center shadow-xl"><MdFormatSize className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-2xl font-bold text-brand-navy leading-none mb-1">{editingItemId ? 'Update' : 'Define'} Size</h2>
                        <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">{editingItemId ? 'Refine existing chart' : 'Register a new standard dimension'}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy/40 hover:bg-zinc-100 transition-colors"><MdClose className="w-5 h-5" /></button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar bg-white">
                 {modalError && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-shake"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> {modalError}</div>}
                 
                 <TextField label="Size Name / Label" placeholder="e.g. A4, 12x18, Crown" value={name} onChange={e => setName(e.target.value)} disabled={busy} error={fieldErrors.name?.[0]} />
                 
                 <div className="grid grid-cols-2 gap-4">
                    <TextField label="Width" placeholder="0.00" value={width} onChange={e => setWidth(e.target.value)} disabled={busy} type="number" error={fieldErrors.width?.[0]} />
                    <TextField label="Breadth" placeholder="0.00" value={breadth} onChange={e => setBreadth(e.target.value)} disabled={busy} type="number" error={fieldErrors.breadth?.[0]} />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <SelectField label="Unit of Measure" value={unit} onChange={e => setUnit(e.target.value)} disabled={busy} error={fieldErrors.unit?.[0]}>
                       <option value="mm">Millimeters (mm)</option>
                       <option value="cm">Centimeters (cm)</option>
                       <option value="inch">Inches (in)</option>
                    </SelectField>
                 </div>


                 <div className="pt-4 border-t border-brand-navy/5">
                    <button 
                      onClick={() => setIsActive(!isActive)}
                      className={`w-full py-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest ${isActive ? 'bg-brand-mint/20 border-brand-mint text-brand-teal' : 'bg-zinc-50 border-brand-navy/10 text-brand-navy/40'}`}
                    >
                      {isActive ? <MdCheckCircle className="w-4 h-4"/> : <MdClose className="w-4 h-4"/>}
                      {isActive ? 'Size Active' : 'Size Inactive'}
                    </button>
                 </div>
              </div>

              <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex justify-end gap-3 rounded-b-[2rem]">
                 <button onClick={() => setShowModal(false)} className="px-6 py-3 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest hover:text-brand-navy transition-colors">Cancel</button>
                 <PrimaryButton onClick={handleSave} disabled={busy} className="shadow-lg shadow-brand-teal/20">{busy ? "Saving..." : editingItemId ? "Update Size" : "Publish Size"}</PrimaryButton>
              </div>
           </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md" onClick={() => !busy && setShowDeleteModal(false)}></div>
           <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-8 relative z-10 animate-scale-in shadow-2xl">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><MdOutlineDelete className="w-12 h-12" /></div>
              <div className="space-y-3">
                 <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tighter leading-none">Remove Size?</h2>
                 <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">This will permanently delete the <span className="text-brand-navy">{deleteTargetItem?.name}</span> configuration. This cannot be undone.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 <button onClick={handleApplyDelete} className="w-full py-5 bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-500/30 active:scale-95 transition-all">Yes, Remove Chart</button>
                 <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-brand-navy/40 hover:text-brand-navy transition-all uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
