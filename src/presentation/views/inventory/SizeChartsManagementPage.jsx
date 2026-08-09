import React, { useState, useEffect } from "react";
import { 
  getSizeCharts, createSizeChart, updateSizeChart, deleteSizeChart 
} from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { 
  MdAdd, MdClose, MdSearch, MdChevronLeft, MdChevronRight, 
  MdOutlineDelete, MdEdit, MdCheckCircle
} from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

export default function SizeChartsManagementPage() {
  const { user } = useAuth();
  
  // Scopes protection
  const canEdit = user?.scopes?.includes("all_scope")
    || user?.scopes?.includes("edit_sizeChart")
    || user?.scopes?.includes("manage_sizeChart")
    || user?.scopes?.includes("edit_stocks")
    || user?.scopes?.includes("manage_stocks");
  const canDelete = user?.scopes?.includes("all_scope")
    || user?.scopes?.includes("manage_sizeChart")
    || user?.scopes?.includes("manage_stocks");

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
    <div className="relative pb-12">
      {errorText && (
         <div className="mb-4 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 flex gap-3 items-center">
            {errorText}
         </div>
      )}

      <div className="gov-panel">
        <div className="gov-panel-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Size Charts</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or unit..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gov-input pl-9 w-full sm:w-72"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="gov-btn-primary whitespace-nowrap"
              >
                <MdAdd className="w-4 h-4" /> New Size
              </button>
            )}
          </div>
        </div>

      {loading ? (
          <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin"></div></div>
      ) : (
          <>
              <div className="overflow-x-auto">
                  <table className="gov-table">
                      <thead>
                          <tr>
                              <th>Name / Label</th>
                              <th className="text-center">Dimensions</th>
                              <th className="text-center">Unit</th>
                              <th className="text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {items.length === 0 ? (
                              <tr><td colSpan="4" className="py-8 text-center text-gov-blue/40 font-bold italic underline decoration-brand-navy/10 underline-offset-4">No size charts registered yet.</td></tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id}>
                                      <td>
                                          <div className="font-bold text-gov-blue text-sm flex items-center gap-2">
                                             {item.name}
                                             {!item.isActive && <span className="text-[9px] font-black text-red-400 border border-red-400 bg-red-50 px-1.5 py-0.5 uppercase">Inactive</span>}
                                          </div>
                                      </td>

                                      <td className="text-center">
                                          <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gov-border">
                                             <span className="text-sm font-black text-gov-blue tabular-nums">{item.width}</span>
                                             <span className="text-[10px] font-black text-gov-blue/30 uppercase">x</span>
                                             <span className="text-sm font-black text-gov-blue tabular-nums">{item.breadth}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                          <span className="px-3 py-1 rounded-full bg-gov-blue-light/20 text-gov-blue text-[10px] font-black uppercase tracking-widest">
                                             {item.unit}
                                          </span>
                                      </td>
                                      <td className="text-right">
                                          <div className="flex justify-end gap-1">
                                              {canEdit && (
                                                <button onClick={() => handleEditClick(item)} className="p-2 text-gray-400 hover:text-gov-blue hover:bg-gray-50 transition-colors"><MdEdit className="w-5 h-5" /></button>
                                              )}
                                              {canDelete && (
                                                <button onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><MdOutlineDelete className="w-5 h-5" /></button>
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
                <div className="px-4 py-3 bg-gray-50 border-t border-gov-border flex items-center justify-between">
                   <div className="text-xs font-semibold text-gray-500">
                      Showing {offset + 1} - {Math.min(offset + limit, totalItems)} of {totalItems} sizes
                   </div>
                   <div className="flex gap-1">
                       <button 
                        disabled={offset === 0 || loading}
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"
                       >
                          <MdChevronLeft className="w-5 h-5" />
                       </button>
                       <button 
                        disabled={offset + limit >= totalItems || loading}
                        onClick={() => setOffset(offset + limit)}
                        className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"
                       >
                          <MdChevronRight className="w-5 h-5" />
                       </button>
                   </div>
                </div>
              )}

          </>
      )}
      </div>

      <FormDrawer
        open={showModal}
        onClose={() => !busy && setShowModal(false)}
        disableClose={busy}
        title={`${editingItemId ? "Update" : "Define"} Size`}
        subtitle={editingItemId ? "Refine existing chart" : "Register a new standard dimension"}
        icon={<MdEdit className="w-4 h-4" />}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="gov-btn-secondary" disabled={busy}>Cancel</button>
            <PrimaryButton onClick={handleSave} disabled={busy}>{busy ? "Saving..." : editingItemId ? "Update Size" : "Publish Size"}</PrimaryButton>
          </>
        }
      >
         {modalError && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs font-semibold border border-red-200">{modalError}</div>}
         
         <div className="space-y-4">
           <TextField label="Size Name / Label" placeholder="e.g. A4, 12x18, Crown" value={name} onChange={e => setName(e.target.value)} disabled={busy} error={fieldErrors.name?.[0]} />
           
           <div className="grid grid-cols-2 gap-3">
              <TextField label="Width" placeholder="0.00" value={width} onChange={e => setWidth(e.target.value)} disabled={busy} type="number" error={fieldErrors.width?.[0]} />
              <TextField label="Breadth" placeholder="0.00" value={breadth} onChange={e => setBreadth(e.target.value)} disabled={busy} type="number" error={fieldErrors.breadth?.[0]} />
           </div>

           <SelectField label="Unit of Measure" value={unit} onChange={e => setUnit(e.target.value)} disabled={busy} error={fieldErrors.unit?.[0]}>
              <option value="mm">Millimeters (mm)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="inch">Inches (in)</option>
           </SelectField>

           <div className="pt-2 border-t border-gov-border">
              <button 
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-3 border transition-all flex items-center justify-center gap-2 font-semibold text-xs uppercase tracking-wide ${isActive ? 'bg-blue-50 border-gov-blue text-gov-blue' : 'bg-gray-50 border-gov-border text-gray-400'}`}
              >
                {isActive ? <MdCheckCircle className="w-4 h-4"/> : <MdClose className="w-4 h-4"/>}
                {isActive ? 'Size Active' : 'Size Inactive'}
              </button>
           </div>
         </div>
      </FormDrawer>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md" onClick={() => !busy && setShowDeleteModal(false)}></div>
           <div className="w-full max-w-sm bg-white border border-gov-border p-8 text-center space-y-6 relative z-10">
              <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center mx-auto"><MdOutlineDelete className="w-10 h-10" /></div>
              <div className="space-y-3">
                 <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tighter leading-none">Remove Size?</h2>
                 <p className="text-[10px] font-bold text-gov-blue/40 uppercase tracking-widest">This will permanently delete the <span className="text-gov-blue">{deleteTargetItem?.name}</span> configuration. This cannot be undone.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 <button onClick={handleApplyDelete} className="w-full py-3 bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">Yes, Remove Chart</button>
                 <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-gov-blue/40 hover:text-gov-blue transition-all uppercase tracking-widest">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
