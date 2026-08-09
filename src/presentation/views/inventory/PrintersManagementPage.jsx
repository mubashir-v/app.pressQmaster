import React, { useState, useEffect } from "react";
import { getPrinterModels, createPrinterModel, updatePrinterModel, deletePrinterModel } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField, SearchableSelect } from "../../components/auth/AuthFormPrimitives.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { 
  MdAdd, MdClose, MdPrint, MdSettings, MdSearch, 
  MdChevronLeft, MdChevronRight, MdOutlineDelete,
  MdLayers, MdInvertColors, MdNotes, MdLabel, MdEdit, MdInfo, MdHelpOutline
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
  const [showOffsetHelp, setShowOffsetHelp] = useState(false);
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
    <div className="relative pb-12">
      {errorText && (
         <div className="mb-4 bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 flex gap-3 items-center">
            {errorText}
         </div>
      )}

      <div className="gov-panel">
        <div className="gov-panel-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Printers & Plates</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search printers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gov-input pl-9 w-full sm:w-64"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="gov-btn-primary whitespace-nowrap"
              >
                <MdAdd className="w-4 h-4" />
                Add Printer Model
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
                              <th>Printer Model</th>
                              <th>Technology</th>
                              <th>Rate Summaries</th>
                              <th className="text-right">Actions</th>
                          </tr>
                      </thead>

                      <tbody>
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="py-8 text-center text-gov-blue/40 font-bold">No printers provisioned yet.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id}>
                                      <td>
                                           <div className="font-bold text-gov-blue">{item.name}</div>
                                           <div className="flex items-center gap-2 mt-1">
                                              <div className={`text-[10px] font-bold uppercase ${item.isActive ? 'text-gov-blue' : 'text-gov-blue/40'}`}>
                                                  {item.isActive ? 'Active' : 'Archived'}
                                              </div>
                                              {item.sortOrder !== null && (
                                                <span className="text-[9px] font-black bg-zinc-100 text-gov-blue/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                  Priority: {item.sortOrder}
                                                </span>
                                              )}
                                           </div>
                                       </td>
                                       <td>
                                           <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-tight border ${item.printerTechnology === 'OFFSET' ? 'bg-brand-navy text-white border-gov-blue' : 'bg-gov-blue-light text-gov-blue border-brand-mint'}`}>
                                               {item.printerTechnology === 'OFFSET' ? <MdLayers className="w-3.5 h-3.5" /> : <MdInvertColors className="w-3.5 h-3.5" />}
                                               {item.printerTechnology}
                                           </div>
                                           {item.maxSheet && (
                                             <div className="text-[10px] font-bold text-gov-blue/40 mt-1 uppercase tracking-tight">
                                                Max: {item.maxSheet.width}x{item.maxSheet.breadth}{item.maxSheet.unit}
                                             </div>
                                           )}
                                       </td>
                                      <td>
                                          <div className="flex flex-col gap-2">
                                              {item.pricingModes?.map((m, idx) => (
                                                  <div key={idx} className="flex items-center gap-2">
                                                      <span className="text-[9px] font-black bg-zinc-100 text-gov-blue/40 px-1.5 py-0.5 rounded tracking-tighter uppercase min-w-[70px] text-center">
                                                          {m.colour_type}
                                                      </span>
                                                      <span className="text-[11px] font-bold text-gov-blue/70">
                                                          {m.pricingStyle === 'OFFSET_TIERED' 
                                                            ? `₹${m.plateCharge?.toLocaleString()} Plate • ₹${m.minChargeAmount?.toLocaleString()} Min`
                                                            : `₹${m.clipChargeAmount?.toLocaleString()} Clip (${m.clipChargeKind})`
                                                          }
                                                      </span>
                                                  </div>
                                              ))}
                                          </div>
                                      </td>

                                      <td className="text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-1">
                                                  <button 
                                                    onClick={() => handleEditClick(item)}
                                                    disabled={busy}
                                                    title="Edit Printer"
                                                    className="p-2 text-gray-400 hover:text-gov-blue hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    disabled={busy}
                                                    title="Delete Printer"
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
                  <div className="px-4 py-3 bg-gray-50 border-t border-gov-border flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-semibold text-gray-500">
                          Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} models
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronLeft /></button>
                          <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems/pageSize), p + 1))} disabled={currentPage === Math.ceil(totalItems/pageSize) || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronRight /></button>
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
        maxWidth="max-w-3xl"
        title={`${editingItemId ? "Edit" : "New"} Printer Model`}
        subtitle={`Step ${modalStep} of 2 · ${modalStep === 1 ? "Core Properties" : "Pricing Matrix"}`}
        icon={editingItemId ? <MdEdit className="w-4 h-4" /> : <MdPrint className="w-4 h-4" />}
        footer={
          <>
            <button type="button" onClick={() => !busy && setShowModal(false)} className="gov-btn-secondary" disabled={busy}>Cancel</button>
            {modalStep === 1 ? (
              <PrimaryButton onClick={handleCreatePrinter}>Next: Pricing Modes</PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleSavePrinter} disabled={busy}>{busy ? "Saving..." : "Finalize Model"}</PrimaryButton>
            )}
          </>
        }
      >
                      {modalError && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold border border-red-200">{modalError}</div>}

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
                                   <label className="block text-sm font-bold text-gov-blue">Status</label>
                                   <button onClick={() => setIsActive(!isActive)} className={`w-full h-11 border text-sm font-bold transition-all ${isActive ? 'bg-blue-50 border-gov-blue text-gov-blue' : 'bg-gray-50 border-gov-border text-gray-400'}`}>
                                       {isActive ? 'Active & Available' : 'Inactive / Maintenance'}
                                   </button>
                                 </div>
                             </div>

                             <div className="p-6 bg-gray-50 border border-gov-border space-y-4">
                                <h3 className="text-[10px] font-black text-gov-blue/30 uppercase tracking-widest pl-1">Maximum Printable Sheet (Technical Specs)</h3>
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
                                 <label className="block text-sm font-bold text-gov-blue">Notes (Internal)</label>
                                 <textarea 
                                     className="w-full h-24 p-4 border border-gov-border text-sm font-semibold text-gov-blue outline-none transition-all resize-none gov-input"
                                     placeholder="Maintenance schedules, plate constraints, etc."
                                     value={notes}
                                     onChange={e => setNotes(e.target.value)}
                                     disabled={busy}
                                 />
                             </div>
                          </>
                      ) : (
                          <div className="space-y-8 animate-slide-up pb-10">
                                  <div className="flex items-center gap-2">
                                     <h3 className="text-[10px] font-black text-gov-blue/40 uppercase tracking-[0.2em]">Pricing Matrix</h3>
                                      {printerTechnology === "OFFSET" && (
                                         <button 
                                            onClick={() => setShowOffsetHelp(true)}
                                            className="w-7 h-7 rounded-full flex items-center justify-center bg-gov-blue-light text-gov-blue transition-all hover:scale-110 active:scale-95 shadow-sm relative group"
                                            title="Understand Calculation Logic"
                                         >
                                            <div className="absolute inset-0 rounded-full bg-gov-blue/20 animate-pulse group-hover:hidden" />
                                            <MdHelpOutline className="w-4 h-4 relative z-10" />
                                         </button>
                                      )}
                                     <div className="h-px flex-1 bg-brand-navy/5" />
                                  </div>
 
                                  {printerTechnology === "LASER" && (
                                     <div className="mx-1 p-4 bg-gov-blue-light/10 border border-brand-mint/20 rounded-2xl flex gap-3 items-center animate-fade-in relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gov-blue" />
                                        <MdInfo className="w-5 h-5 text-gov-blue flex-shrink-0" />
                                        <p className="text-[10px] font-bold text-gov-blue uppercase tracking-widest leading-relaxed">
                                           Note:  If "Printing Only" is selected in a quotation, the charge will be fetched from CLIP CHARGE based on the color mode (BW AND COLOUR).
                                        </p>
                                     </div>
                                  )}

                                <div className="space-y-4">
                                  {pricingModes.map((mode, idx) => (
                                      <div key={idx} className="flex flex-col gap-4 p-6 bg-zinc-50/50 rounded-3xl border border-gov-blue/5 animate-fade-in relative">
                                          {/* Mode Header & Basic Row */}
                                          <div className="flex items-center gap-6">
                                              <div className="flex-1 max-w-[240px]">
                                                <SearchableSelect 
                                                   label="Colour Mode" 
                                                   info="Select ink colour setup used to choose pricing row."
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

                                              {mode.pricingStyle === "OFFSET_TIERED" ? (
                                                  <div className="flex-1 grid grid-cols-4 gap-4 items-end">
                                                      <TextField label="Plate ₹" info="One-time plate/setup charge added per job." value={mode.plateCharge} onChange={e => updateMode(idx, "plateCharge", e.target.value)} />
                                                      <TextField label="Min ₹" info="Base printing charge covering the first minimum print volume." value={mode.minChargeAmount} onChange={e => updateMode(idx, "minChargeAmount", e.target.value)} />
                                                      <TextField label="Max Sheets" info="Maximum billed impressions allowed in this pricing slab." value={mode.minChargePrintVolume} onChange={e => updateMode(idx, "minChargePrintVolume", e.target.value)} />
                                                      <div className="flex items-end gap-2">
                                                         <TextField label="Steps" info="Extra impressions counted in each billing block after minimum volume." value={mode.volumeStepPrints} onChange={e => updateMode(idx, "volumeStepPrints", e.target.value)} />
                                                         <TextField label="Extra Step ₹" info="Charge added for every extra step block." value={mode.extraChargePerVolumeStep} onChange={e => updateMode(idx, "extraChargePerVolumeStep", e.target.value)} />
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <div className="flex-1 grid grid-cols-2 gap-6 items-end max-w-xl">
                                                      <TextField label="Clip Charge ₹" value={mode.clipChargeAmount} onChange={e => updateMode(idx, "clipChargeAmount", e.target.value)} />
                                                      <SearchableSelect label="Clip Category" options={CLIP_KINDS} value={mode.clipChargeKind} onChange={e => updateMode(idx, "clipChargeKind", e.target.value)} disabled />
                                                  </div>
                                              )}

                                              <div className="flex items-center gap-2 pt-6">
                                                 <button 
                                                   onClick={() => handleRemoveMode(idx)} 
                                                   className="w-10 h-10 flex items-center justify-center rounded-xl text-gov-blue/20 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                                   title="Remove Mode"
                                                 >
                                                   <MdClose className="w-5 h-5" />
                                                 </button>
                                              </div>
                                          </div>

                                          {/* Policy Row (Offset Only) */}
                                          {mode.pricingStyle === "OFFSET_TIERED" && (
                                              <div className="flex items-center gap-6 pl-6 border-l-2 border-gov-blue/20 ml-2">
                                                 
                                                 <div className="flex-1 grid grid-cols-3 gap-6 items-end">
                                                    <TextField label="Bulk Threshold" info="When billed impressions reach this count, bulk pricing starts." value={mode.bulkPrintCountThreshold} onChange={e => updateMode(idx, "bulkPrintCountThreshold", e.target.value)} placeholder="None" />
                                                    <SelectField label="Bulk Policy" info="Rule used to calculate charges after bulk threshold." value={mode.aboveBulkChargePolicy} onChange={e => updateMode(idx, "aboveBulkChargePolicy", e.target.value)}>
                                                       <option value="USE_EXTRA_CHARGE_EXCLUDE_MINIMUM">Extra Charge Only (No Min)</option>
                                                       <option value="USE_STANDARD_TABLE">Standard Table Rates</option>
                                                       <option value="CUSTOM">Custom Rule</option>
                                                    </SelectField>
                                                    <div className="text-[9px] font-medium text-gov-blue/40 italic flex items-center h-full pt-6">
                                                       Policy applies after threshold is met.
                                                    </div>
                                                 </div>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                                </div>

                                <div className="flex justify-center pt-4">
                                   <button 
                                      onClick={handleAddMode} 
                                      className="flex items-center gap-2 px-6 py-3 bg-gov-blue-light text-gov-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gov-blue-light/80 transition-all shadow-md shadow-brand-mint/10 active:scale-95 group"
                                   >
                                      <MdAdd className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                      Add Pricing Mode
                                   </button>
                                </div>
                          </div>
                      )}
      </FormDrawer>

       {/* Offset Help Drawer */}
       {showOffsetHelp && (
           <div className="fixed inset-0 z-[100] flex justify-end">
               <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setShowOffsetHelp(false)}></div>
               <div className="w-[450px] bg-white h-full border-l border-gov-border relative z-10 p-0 flex flex-col">
                   <div className="p-8 border-b border-gov-border flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-gov-blue text-white flex items-center justify-center shadow-lg shadow-gov-blue/20">
                            <MdInfo className="w-6 h-6" />
                         </div>
                         <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gov-blue uppercase tracking-tighter leading-none">Offset Calculation Guide</h2>
                            <span className="text-[9px] font-bold text-gov-blue uppercase tracking-widest mt-1">Pricing & Logic Blueprint</span>
                         </div>
                      </div>
                      <button onClick={() => setShowOffsetHelp(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gov-blue hover:bg-gray-100 transition-all">
                         <MdClose className="w-5 h-5" />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-12 pb-24">
                      {/* Section 1: The Master Formula */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-gov-blue uppercase tracking-[0.2em]">01. The Master Formula</h3>
                         <div className="p-6 bg-gov-blue text-white rounded-3xl space-y-4 relative overflow-hidden shadow-xl shadow-gov-blue/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gov-blue/20 rounded-full blur-3xl -mr-12 -mt-12" />
                            <div className="text-3xl font-black tracking-tighter flex items-baseline gap-2">
                               ₹ <span className="">Total</span>
                               <span className="text-xl opacity-30">=</span>
                               <span className="text-xl">Paper</span>
                               <span className="text-xl opacity-30">+</span>
                               <span className="text-xl">Printing</span>
                            </div>
                            <p className="text-[10px] font-medium opacity-60 leading-relaxed uppercase tracking-widest">
                               Total Price = (Parent Sheets × Unit Price) + (Plate Fees + Machine Run Fees)
                            </p>
                         </div>
                      </div>

                      {/* Section 2: Material Calculation */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-gov-blue/40 uppercase tracking-[0.2em]">02. Material (Paper Sheets)</h3>
                         <div className="p-5 bg-zinc-50 rounded-2xl border border-gov-blue/5 space-y-4">
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-gov-blue/10 text-gov-blue flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-gov-blue uppercase tracking-tighter">Sheets for Pieces</div>
                                  <p className="text-[11px] text-gov-blue/60 font-medium leading-normal">
                                     Pieces per machine sheet (e.g., 4-up layout). 100 copies = 25 machine sheets.
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-gov-blue/10 text-gov-blue flex items-center justify-center text-[10px] font-black flex-shrink-0">B</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-gov-blue uppercase tracking-tighter">Waste Sheets</div>
                                  <p className="text-[11px] text-gov-blue/60 font-medium leading-normal">
                                     Setup impressions added for ink balancing (Example: 25 pieces + 2 waste = 27 sheets).
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-gov-blue/10 text-gov-blue flex items-center justify-center text-[10px] font-black flex-shrink-0">C</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-gov-blue uppercase tracking-tighter">Portioning (Parent Sheets)</div>
                                  <p className="text-[11px] text-gov-blue/60 font-medium leading-normal">
                                     If the machine sheet is cut from a larger stock (e.g., 1/4 size), we divide total sheets by the portion to find the billed <strong>Full Sheets</strong>.
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Section 3: Machine Setup (Plates) */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-gov-blue/40 uppercase tracking-[0.2em]">03. Machine Run (Logic)</h3>
                         <div className="p-5 bg-gov-blue-light/50 rounded-2xl border border-gov-blue/10 relative overflow-hidden space-y-6">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                               <MdLayers className="w-12 h-12 text-gov-blue" />
                            </div>
                            
                            <div className="space-y-2">
                               <div className="text-[10px] font-black text-gov-blue uppercase tracking-widest">A. Plate Set Multiplier</div>
                               <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-gov-blue/5">
                                     <span className="text-[11px] font-bold text-gov-blue">Single Side</span>
                                     <span className="text-[11px] font-black text-gov-blue">1 Set</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-gov-blue/5">
                                     <span className="text-[11px] font-bold text-gov-blue">Double (Same Back)</span>
                                     <span className="text-[11px] font-black text-gov-blue">1 Set</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-gov-blue text-white p-2 rounded-lg shadow-sm">
                                     <span className="text-[11px] font-bold">Double (Diff Back)</span>
                                     <span className="text-[11px] font-black">2 Sets</span>
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gov-blue/10">
                               <div className="text-[10px] font-black text-gov-blue uppercase tracking-widest">B. Billed Impressions</div>
                               <div className="p-3 bg-white/40 rounded-xl space-y-2 text-[11px] font-medium text-gov-blue/70 italic">
                                  <div>Sheets Billed = (Copies / PiecesPerSheet) + Waste</div>
                                  <div>Total Imp. = Sheets Billed × (2 for Double, else 1)</div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Section 4: Bulk Threshold Boundary */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-gov-blue/40 uppercase tracking-[0.2em]">04. Bulk Threshold Boundary</h3>
                         <div className="p-6 bg-gov-blue-light text-gov-blue rounded-3xl relative overflow-hidden border border-gov-blue/20">
                            <div className="text-sm font-black mb-1 uppercase tracking-tighter">The "Inclusive Switch"</div>
                            <p className="text-[10px] font-bold opacity-60 mb-6 uppercase tracking-widest leading-none">Status based on Billed Impressions</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <div className="text-[10px] font-black text-red-500 uppercase">Standard</div>
                                  <div className="text-[9px] font-bold opacity-60 leading-tight">Minimum Fee +<br/>Setup + Extra Steps</div>
                               </div>
                               <div className="space-y-2 text-right">
                                  <div className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Bulk Applied</div>
                                  <div className="text-[9px] font-bold opacity-60 leading-tight">Setup +<br/>Volume Step Only</div>
                               </div>
                            </div>
                            
                            <div className="mt-4 h-1.5 bg-gov-blue/10 rounded-full relative">
                               <div className="absolute top-1/2 left-[50%] w-4 h-4 bg-white border-2 border-gov-blue rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md flex items-center justify-center group">
                                  <div className="w-1.5 h-1.5 bg-gov-blue rounded-full animate-pulse" />
                                  <div className="absolute top-full mt-2 bg-brand-navy text-white text-[8px] font-black px-2 py-1 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                     Threshold (e.g. 10k)
                                  </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 space-y-3">
                               <div className="p-3 bg-white/60 rounded-xl border border-gov-blue/10">
                                  <div className="text-[9px] font-black uppercase text-gov-blue/40 mb-1 text-center">Boundary Comparison (Example)</div>
                                  <div className="flex items-center justify-between text-[11px]">
                                     <span className="font-bold">9,999 Imp. <span className="opacity-30">(Standard)</span></span>
                                     <span className="font-black text-red-500">₹ 3,800</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-gov-blue/5">
                                     <span className="font-bold text-gov-blue">10,000 Imp. <span className="opacity-30">(Bulk)</span></span>
                                     <span className="font-black text-gov-blue">₹ 3,500</span>
                                  </div>
                                </div>
                                <p className="text-[9px] leading-relaxed font-bold opacity-60 italic">
                                   Final Price drops at the threshold because the "Minimum Charge" is waived (Bulk Policy: Extra Charge Only). Boundary is <strong>inclusive</strong> (≥).
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>

                   <div className="p-8 border-t border-gov-blue/5 bg-zinc-50/50 flex flex-col gap-1">
                      <div className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Need more detail?</div>
                      <div className="text-[11px] font-medium text-gov-blue/40">Consult with the technical press manager for custom rule adjustments.</div>
                   </div>
               </div>
           </div>
       )}

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
              <div className="w-full max-w-sm bg-white border border-gov-border p-8 text-center space-y-6 relative z-10">
                  <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center mx-auto"><MdOutlineDelete className="w-10 h-10" /></div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tighter">Decommission?</h2>
                    <p className="text-xs font-bold text-gov-blue/40 uppercase tracking-widest px-4 leading-relaxed">Removing <span className="text-gov-blue">{deleteTargetItem.name}</span> will clear all bound pricing matrices. Proceed?</p>
                  </div>
                  <div className="flex flex-col gap-3">
                      <button onClick={handleApplyDelete} className="w-full py-3 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Yes, Decommission</button>
                      <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-sm font-bold text-gov-blue/40 hover:text-gov-blue transition-all">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
