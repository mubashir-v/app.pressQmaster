import React, { useState, useEffect } from "react";
import { getPrinterModels, createPrinterModel, updatePrinterModel, deletePrinterModel } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField, SearchableSelect } from "../../components/auth/AuthFormPrimitives.jsx";
import { 
  MdAdd, MdClose, MdPrint, MdSettings, MdSearch, 
  MdChevronLeft, MdChevronRight, MdOutlineDelete,
  MdLayers, MdInvertColors, MdNotes, MdLabel, MdEdit
} from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";


const PRINTER_TECHS = [
  { value: "OFFSET", label: "Offset Printing" },
  { value: "LASER", label: "Laser / Digital" },
];

const CLIP_KINDS = [
  { value: "COLOR", label: "Color" },
  { value: "BW", label: "Black & White" },
  { value: "UNSPECIFIED", label: "Unspecified" },
];

const OFFSET_COLOURS = [
  { value: "Single", label: "Single" },
  { value: "Two Colour", label: "Two Colour" },
  { value: "Three Colour", label: "Three Colour" },
  { value: "Multi", label: "Multi" },
];

const LASER_COLOURS = [
  { value: "Clip", label: "Clip" },
  { value: "Clip BW", label: "Clip BW" },
];


export default function PrintersManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);

  // Search & Delete Modals
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Form State - Step 1 (Physical)
  const [name, setName] = useState("");
  const [printerTechnology, setPrinterTechnology] = useState("OFFSET");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("");
  
  // maxSheet
  const [maxWidth, setMaxWidth] = useState("");
  const [maxBreadth, setMaxBreadth] = useState("");
  const [maxUnit, setMaxUnit] = useState("inch");


  // Form State - Step 2 (Pricing Modes)
  const [pricingModes, setPricingModes] = useState([]);

  const canEdit = user?.scopes?.includes("all_scope") || user?.scopes?.includes("edit_printers") || user?.scopes?.includes("manage_printers");

  async function fetchItems(query = "", page = 1) {
    setLoading(true);
    setErrorText("");
    try {
      const data = await getPrinterModels(query, page, pageSize);
      setItems(data.items || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load printer catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(searchQuery, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function resetForm() {
    setName("");
    setPrinterTechnology("OFFSET");
    setNotes("");
    setIsActive(true);
    setSortOrder("");
    setMaxWidth("");
    setMaxBreadth("");
    setMaxUnit("inch");
    setPricingModes([]);
    setModalStep(1);
    setEditingItemId(null);
    setModalError("");
  }


  function handleAddMode() {
    const existingColours = pricingModes.map(m => m.colour_type);
    const availableOffset = OFFSET_COLOURS.map(oc => oc.value).filter(v => !existingColours.includes(v));
    const availableLaser = LASER_COLOURS.map(lc => lc.value).filter(v => !existingColours.includes(v));

    if (printerTechnology === "OFFSET") {
      setPricingModes([...pricingModes, {
        colour_type: availableOffset[0] || "Single",
        pricingStyle: "OFFSET_TIERED",
        plateCharge: "0",
        minChargeAmount: "0",
        minChargePrintVolume: "1000",
        extraChargePerVolumeStep: "0",
        volumeStepPrints: "1000",
        bulkPrintCountThreshold: "",
        aboveBulkChargePolicy: "USE_EXTRA_CHARGE_EXCLUDE_MINIMUM",
        applicability: { minCharge: true, extraCharge: true, bulkThreshold: true }
      }]);
    } else {
      setPricingModes([...pricingModes, {
        colour_type: availableLaser[0] || "Clip",
        pricingStyle: "LASER_CLIP",
        clipChargeAmount: "0",
        clipChargeKind: availableLaser[0] === "Clip BW" ? "BW" : "COLOR",
        applicability: { minCharge: false, extraCharge: false, bulkThreshold: false }
      }]);
    }
  }


  function handleRemoveMode(index) {
    setPricingModes(pricingModes.filter((_, i) => i !== index));
  }

  function handleEditClick(item) {
    resetForm();
    setEditingItemId(item.id);
    setName(item.name || "");
    setPrinterTechnology(item.printerTechnology || "OFFSET");
    setNotes(item.notes || "");
    setIsActive(item.isActive ?? true);
    setSortOrder(item.sortOrder?.toString() || "");
    
    if (item.maxSheet) {
      setMaxWidth(item.maxSheet.width?.toString() || "");
      setMaxBreadth(item.maxSheet.breadth?.toString() || "");
      setMaxUnit(item.maxSheet.unit || "mm");
    } else {
      setMaxWidth("");
      setMaxBreadth("");
      setMaxUnit("inch");
    }

    
    // Map pricing modes from record to form state (ensure numbers are strings for inputs)
    setPricingModes(item.pricingModes?.map(m => ({
      ...m,
      plateCharge: String(m.plateCharge ?? "0"),
      minChargeAmount: String(m.minChargeAmount ?? "0"),
      minChargePrintVolume: String(m.minChargePrintVolume ?? "1000"),
      extraChargePerVolumeStep: String(m.extraChargePerVolumeStep ?? "0"),
      volumeStepPrints: String(m.volumeStepPrints ?? "1000"),
      bulkPrintCountThreshold: String(m.bulkPrintCountThreshold ?? ""),
      clipChargeAmount: String(m.clipChargeAmount ?? "0")
    })) || []);
    
    setShowModal(true);
  }

  function updateMode(index, field, value) {

    const newModes = [...pricingModes];
    newModes[index][field] = value;
    setPricingModes(newModes);
  }

  async function handleCreatePrinter() {
    if (!name.trim()) { setModalError("Name is required."); return; }
    setModalStep(2);
    if (pricingModes.length === 0) handleAddMode();
  }

  async function handleSavePrinter() {
    setBusy(true);
    setModalError("");
    try {
      const payload = {
        name: name.trim(),
        printerTechnology,
        notes: notes.trim() || null,
        isActive,
        sortOrder: sortOrder ? parseInt(sortOrder) : null,
        maxSheet: (maxWidth && maxBreadth) ? {
          width: parseFloat(maxWidth),
          breadth: parseFloat(maxBreadth),
          unit: maxUnit
        } : null,

        pricingModes: pricingModes.map(m => {
          if (m.pricingStyle === "OFFSET_TIERED") {
            return {
              colour_type: m.colour_type,
              pricingStyle: m.pricingStyle,
              plateCharge: parseFloat(m.plateCharge) || 0,
              minChargeAmount: parseFloat(m.minChargeAmount) || 0,
              minChargePrintVolume: parseInt(m.minChargePrintVolume) || 1000,
              extraChargePerVolumeStep: parseFloat(m.extraChargePerVolumeStep) || 0,
              volumeStepPrints: parseInt(m.volumeStepPrints) || 1000,
              bulkPrintCountThreshold: m.bulkPrintCountThreshold ? parseInt(m.bulkPrintCountThreshold) : null,
              aboveBulkChargePolicy: m.aboveBulkChargePolicy,
              applicability: m.applicability
            };
          } else {
            return {
              colour_type: m.colour_type,
              pricingStyle: m.pricingStyle,
              clipChargeAmount: parseFloat(m.clipChargeAmount) || 0,
              clipChargeKind: m.clipChargeKind,
              applicability: m.applicability
            };
          }
        })
      };


      if (editingItemId) {
        await updatePrinterModel(editingItemId, payload);
      } else {
        await createPrinterModel(payload);
      }
      setShowModal(false);
      resetForm();
      fetchItems(searchQuery, editingItemId ? currentPage : 1);
    } catch (e) {
      setModalError(e.response?.data?.message || "Failed to save printer model.");
    } finally {
      setBusy(false);
    }
  }


  async function handleApplyDelete() {
      if (!deleteTargetItem) return;
      setBusy(true);
      setErrorText("");
      try {
          await deletePrinterModel(deleteTargetItem.id);
          setShowDeleteModal(false);
          setDeleteTargetItem(null);
          fetchItems(searchQuery, currentPage);
      } catch (e) {
          setErrorText(e.response?.data?.message || "Failed to delete printer.");
      } finally {
          setBusy(false);
      }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in relative pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Printers & Plates</h1>
           <p className="mt-2 text-brand-navy/60 font-medium">Configure equipment pricing, plate charges, and volume thresholds.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20 group-focus-within:text-brand-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search printers..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-brand-navy/10 rounded-xl text-sm font-semibold text-brand-navy placeholder:text-brand-navy/20 outline-none focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/5 transition-all w-full sm:w-64"
            />
          </div>
          {canEdit && (
            <button 
               onClick={() => { resetForm(); setShowModal(true); }}
               className="flex items-center gap-2 px-6 py-3 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
               <MdAdd className="w-5 h-5" />
               Add Printer Model
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
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Printer Model</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Technology</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Rate Summaries</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em] text-right">Actions</th>
                          </tr>
                      </thead>

                      <tbody className="divide-y divide-brand-navy/5">
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="px-6 py-12 text-center text-brand-navy/40 font-bold">No printers provisioned yet.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                      <td className="px-6 py-4">
                                           <div className="font-bold text-brand-navy">{item.name}</div>
                                           <div className="flex items-center gap-2 mt-1">
                                              <div className={`text-[10px] font-bold uppercase ${item.isActive ? 'text-brand-teal' : 'text-brand-navy/40'}`}>
                                                  {item.isActive ? 'Active' : 'Archived'}
                                              </div>
                                              {item.sortOrder !== null && (
                                                <span className="text-[9px] font-black bg-zinc-100 text-brand-navy/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                  Priority: {item.sortOrder}
                                                </span>
                                              )}
                                           </div>
                                       </td>
                                       <td className="px-6 py-4">
                                           <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-tight border ${item.printerTechnology === 'OFFSET' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-brand-mint text-brand-teal border-brand-mint'}`}>
                                               {item.printerTechnology === 'OFFSET' ? <MdLayers className="w-3.5 h-3.5" /> : <MdInvertColors className="w-3.5 h-3.5" />}
                                               {item.printerTechnology}
                                           </div>
                                           {item.maxSheet && (
                                             <div className="text-[10px] font-bold text-brand-navy/40 mt-1 uppercase tracking-tight">
                                                Max: {item.maxSheet.width}x{item.maxSheet.breadth}{item.maxSheet.unit}
                                             </div>
                                           )}
                                       </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col gap-2">
                                              {item.pricingModes?.map((m, idx) => (
                                                  <div key={idx} className="flex items-center gap-2">
                                                      <span className="text-[9px] font-black bg-zinc-100 text-brand-navy/40 px-1.5 py-0.5 rounded tracking-tighter uppercase min-w-[70px] text-center">
                                                          {m.colour_type}
                                                      </span>
                                                      <span className="text-[11px] font-bold text-brand-navy/70">
                                                          {m.pricingStyle === 'OFFSET_TIERED' 
                                                            ? `₹${m.plateCharge?.toLocaleString()} Plate • ₹${m.minChargeAmount?.toLocaleString()} Min`
                                                            : `₹${m.clipChargeAmount?.toLocaleString()} Clip (${m.clipChargeKind})`
                                                          }
                                                      </span>
                                                  </div>
                                              ))}
                                          </div>
                                      </td>

                                      <td className="px-6 py-4 text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-1">
                                                  <button 
                                                    onClick={() => handleEditClick(item)}
                                                    disabled={busy}
                                                    title="Edit Printer"
                                                    className="p-2 text-brand-navy/40 hover:text-brand-teal hover:bg-brand-mint/10 rounded-xl transition-all disabled:opacity-50"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    disabled={busy}
                                                    title="Delete Printer"
                                                    className="p-2 text-brand-navy/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
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
                          Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} models
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30"><MdChevronLeft /></button>
                          <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems/pageSize), p + 1))} disabled={currentPage === Math.ceil(totalItems/pageSize) || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30"><MdChevronRight /></button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Add Printer Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity" onClick={() => !busy && setShowModal(false)}></div>
              
              <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in mb-20">
                  <div className="p-6 border-b border-brand-navy/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-navy text-white flex items-center justify-center">
                            {editingItemId ? <MdEdit className="w-5 h-5" /> : <MdPrint className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-brand-navy">{editingItemId ? 'Edit' : 'New'} Printer Model</h2>
                            <p className="text-xs text-brand-navy/40 font-bold uppercase tracking-wider">Step {modalStep} of 2 • {modalStep === 1 ? 'Core Properties' : 'Pricing Matrix'}</p>
                        </div>

                    </div>
                    <button onClick={() => !busy && setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-brand-navy/40 hover:bg-zinc-100"><MdClose className="w-5 h-5" /></button>
                  </div>

                  <div className="overflow-y-auto p-8 flex-1 space-y-6 no-scrollbar">
                      {modalError && <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">{modalError}</div>}

                      {modalStep === 1 ? (
                          <>
                             <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                  <TextField label="Model Name" placeholder="e.g. Heidelberg XL 75" value={name} onChange={e => setName(e.target.value)} disabled={busy} />
                                </div>
                                <TextField label="List Priority" type="number" placeholder="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} disabled={busy} />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                 <SearchableSelect label="Technology" options={PRINTER_TECHS} value={printerTechnology} onChange={e => setPrinterTechnology(e.target.value)} disabled={busy} />
                                 <div className="space-y-2">
                                   <label className="block text-sm font-bold text-brand-navy">Status</label>
                                   <button onClick={() => setIsActive(!isActive)} className={`w-full h-11 rounded-xl border text-sm font-bold transition-all ${isActive ? 'bg-brand-mint/20 border-brand-mint text-brand-teal' : 'bg-zinc-50 border-brand-navy/10 text-brand-navy/40'}`}>
                                       {isActive ? 'Active & Available' : 'Inactive / Maintenance'}
                                   </button>
                                 </div>
                             </div>

                             <div className="p-6 bg-zinc-50 rounded-2xl border border-brand-navy/5 space-y-4">
                                <h3 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Maximum Printable Sheet (Technical Specs)</h3>
                                <div className="grid grid-cols-3 gap-4">
                                   <TextField label="Width" value={maxWidth} onChange={e => setMaxWidth(e.target.value)} placeholder="0" type="number" />
                                   <TextField label="Breadth" value={maxBreadth} onChange={e => setMaxBreadth(e.target.value)} placeholder="0" type="number" />
                                   <SelectField label="Unit" value={maxUnit} onChange={e => setMaxUnit(e.target.value)}>
                                      <option value="mm">mm</option>
                                      <option value="cm">cm</option>
                                      <option value="inch">inch</option>
                                   </SelectField>
                                </div>
                             </div>

                             <div className="space-y-2">
                                 <label className="block text-sm font-bold text-brand-navy">Notes (Internal)</label>
                                 <textarea 
                                     className="w-full h-24 p-4 rounded-xl border border-brand-navy/15 text-sm font-semibold text-brand-navy outline-none focus:border-brand-teal/40 transition-all resize-none"
                                     placeholder="Maintenance schedules, plate constraints, etc."
                                     value={notes}
                                     onChange={e => setNotes(e.target.value)}
                                     disabled={busy}
                                 />
                             </div>
                          </>
                      ) : (
                          <div className="space-y-8 animate-slide-up pb-10">
                              <div className="flex justify-between items-center">
                                  <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest">Pricing Modes</h3>
                                  <button onClick={handleAddMode} className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1"><MdAdd /> Add Mode</button>
                              </div>

                              <div className="space-y-6">
                                {pricingModes.map((mode, idx) => (
                                    <div key={idx} className="p-6 bg-zinc-50 rounded-[2rem] border border-brand-navy/5 space-y-6 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-end gap-6 border-b border-brand-navy/5 pb-4">
                                            <div className="flex-1 max-w-xs">
                                              <SearchableSelect 
                                                 label="Colour Configuration" 
                                                 options={printerTechnology === "OFFSET" ? OFFSET_COLOURS : LASER_COLOURS} 
                                                 value={mode.colour_type} 
                                                 onChange={e => {
                                                   updateMode(idx, "colour_type", e.target.value);
                                                   if (printerTechnology === "LASER") {
                                                     updateMode(idx, "clipChargeKind", e.target.value === "Clip BW" ? "BW" : "COLOR");
                                                   }
                                                 }} 
                                              />
                                            </div>
                                            <button onClick={() => handleRemoveMode(idx)} className="px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest flex items-center gap-2">
                                              <MdOutlineDelete className="w-4 h-4" />
                                              Remove
                                            </button>
                                        </div>

                                        {mode.pricingStyle === "OFFSET_TIERED" ? (
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                <TextField label="Plate Charge" value={mode.plateCharge} onChange={e => updateMode(idx, "plateCharge", e.target.value)} />
                                                <TextField label="Min Charge Amount" value={mode.minChargeAmount} onChange={e => updateMode(idx, "minChargeAmount", e.target.value)} />
                                                <TextField label="Min Charge Volume" value={mode.minChargePrintVolume} onChange={e => updateMode(idx, "minChargePrintVolume", e.target.value)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                   <TextField label="Step Volume" value={mode.volumeStepPrints} onChange={e => updateMode(idx, "volumeStepPrints", e.target.value)} />
                                                   <TextField label="Extra / Step" value={mode.extraChargePerVolumeStep} onChange={e => updateMode(idx, "extraChargePerVolumeStep", e.target.value)} />
                                                </div>
                                                <div className="col-span-2 p-5 bg-brand-navy/5 rounded-2xl border border-brand-navy/5 space-y-4">
                                                   <div className="flex items-center justify-between">
                                                      <h4 className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Bulk / Volume Policy</h4>
                                                      <div className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${mode.bulkPrintCountThreshold ? 'bg-brand-teal' : 'bg-brand-navy/20'}`}>
                                                         {mode.bulkPrintCountThreshold ? 'ENABLED' : 'DISABLED'}
                                                      </div>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-4">
                                                      <TextField label="Threshold Sheets" value={mode.bulkPrintCountThreshold} onChange={e => updateMode(idx, "bulkPrintCountThreshold", e.target.value)} />
                                                      <SelectField label="Above Threshold Policy" value={mode.aboveBulkChargePolicy} onChange={e => updateMode(idx, "aboveBulkChargePolicy", e.target.value)}>
                                                         <option value="USE_EXTRA_CHARGE_EXCLUDE_MINIMUM">Extra Charge Only (No Min)</option>
                                                         <option value="USE_STANDARD_TABLE">Standard Table Rates</option>
                                                         <option value="CUSTOM">Custom Rule</option>
                                                      </SelectField>
                                                   </div>
                                                </div>
                                            </div>

                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <TextField label="Clip Charge Amount" value={mode.clipChargeAmount} onChange={e => updateMode(idx, "clipChargeAmount", e.target.value)} />
                                                <SearchableSelect label="Clip Category" options={CLIP_KINDS} value={mode.clipChargeKind} onChange={e => updateMode(idx, "clipChargeKind", e.target.value)} disabled />
                                            </div>
                                        )}

                                    </div>
                                ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-brand-navy/5 bg-zinc-50/50 rounded-b-[2rem] flex justify-end gap-3 z-10">
                      <button onClick={() => !busy && setShowModal(false)} className="px-6 py-3 text-sm font-bold text-brand-navy/40 hover:text-brand-navy transition-all">Cancel</button>
                      {modalStep === 1 ? (
                          <PrimaryButton onClick={handleCreatePrinter}>Next: Pricing Modes</PrimaryButton>
                      ) : (
                          <PrimaryButton onClick={handleSavePrinter} disabled={busy}>{busy ? "Saving..." : "Finalize Model"}</PrimaryButton>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
              <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center space-y-6 relative z-10 animate-scale-in">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner"><MdOutlineDelete className="w-10 h-10" /></div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Decommission?</h2>
                    <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest px-4 leading-relaxed">Removing <span className="text-brand-navy">{deleteTargetItem.name}</span> will clear all bound pricing matrices. Proceed?</p>
                  </div>
                  <div className="flex flex-col gap-3">
                      <button onClick={handleApplyDelete} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all">Yes, Decommission</button>
                      <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-sm font-bold text-brand-navy/40 hover:text-brand-navy transition-all">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
