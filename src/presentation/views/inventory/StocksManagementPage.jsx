import React, { useState, useEffect } from "react";
import { getStockItems, createStockItem, updateStockItem, deleteStockItem, getStockPricingRule, upsertStockPricingRule } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField, SearchableSelect } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdAdd, MdClose, MdEdit, MdSell, MdSettings, MdLayers, MdContentCopy, MdOutlineDelete, MdSearch, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

const ITEM_TYPES = [
  { value: "LASER_PAPER", label: "Laser Paper", requiresSlabs: true },
  { value: "OFFSET_PAPER", label: "Offset Paper", requiresFixed: true },
  { value: "PRINTER_PLATE", label: "Printer Plate" },
  { value: "PLATE_COLOR", label: "Plate Color" },
  { value: "FINISHING_MATERIAL", label: "Finishing Material" },
];

const UNIT_OF_MEASUREMENTS = ["COUNT", "KG", "LENGTH"];

const DEFAULT_SLABS = [
  { minCount: "1", maxCount: "", colorCharge: "0", bwCharge: "0" },
];

export default function StocksManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Basic Info, 2: Pricing
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [createdItemId, setCreatedItemId] = useState(null);

  // Search & Delete Modals
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);


  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("LASER_PAPER");
  const [unitOfMeasurement, setUnitOfMeasurement] = useState("COUNT");
  const [gsm, setGsm] = useState("");
  const [dimLength, setDimLength] = useState("");
  const [dimBreadth, setDimBreadth] = useState("");
  const [dimUnit, setDimUnit] = useState(user.settings?.defaultLengthUnit || "mm");
  const [isActive, setIsActive] = useState(true);

  // Form State - Step 2 (Pricing)
  const [pricingType, setPricingType] = useState("SLAB_BASED");
  const [fixedPrice, setFixedPrice] = useState("");
  const [slabs, setSlabs] = useState([...DEFAULT_SLABS]);
  const [perSheetColor, setPerSheetColor] = useState("");
  const [perSheetBw, setPerSheetBw] = useState("");

  const canEdit = user?.scopes?.includes("all_scope") || user?.scopes?.includes("edit_stocks") || user?.scopes?.includes("manage_stocks");

  async function fetchItems(query = "", page = 1) {
    setLoading(true);
    setErrorText("");
    try {
      const offset = (page - 1) * pageSize;
      const data = await getStockItems(query, offset, pageSize);
      setItems(data.items || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load stock catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      // Re-trigger fetch when search query or page changes
      fetchItems(searchQuery, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  // Sync pricing type when item type changes in step 1
  useEffect(() => {
    if (itemType === "LASER_PAPER") {
      setPricingType("SLAB_BASED");
    } else if (itemType === "OFFSET_PAPER") {
      setPricingType("FIXED");
    }
  }, [itemType]);

  function resetForm() {
    setName("");
    setItemType("LASER_PAPER");
    setUnitOfMeasurement("COUNT");
    setGsm("");
    setDimLength("");
    setDimBreadth("");
    setDimUnit(user.settings?.defaultLengthUnit || "mm");
    setIsActive(true);
    setPricingType("SLAB_BASED");
    setFixedPrice("");
    setSlabs([...DEFAULT_SLABS]);
    setPerSheetColor("");
    setPerSheetBw("");
    setModalStep(1);
    setCreatedItemId(null);
    setEditingItemId(null);
    setModalError("");
  }

  async function handleEditClick(item) {
    setBusy(true);
    setErrorText("");
    try {
      // Step 1: Physical data comes from the roster
      setName(item.name);
      setItemType(item.itemType);
      setUnitOfMeasurement(item.unitOfMeasurement);
      setGsm(item.gsm ? String(item.gsm) : "");
      setDimLength(item.dimensions?.length ? String(item.dimensions.length) : "");
      setDimBreadth(item.dimensions?.breadth ? String(item.dimensions.breadth) : "");
      setDimUnit(item.dimensions?.unit || "mm");
      setIsActive(item.isActive);

      // Step 2: Pricing data needs to be fetched
      const pricingData = await getStockPricingRule(item.id);
      const rule = pricingData.rule;

      if (rule) {
        setPricingType(rule.pricingType);
        setFixedPrice(rule.fixedPrice ? String(rule.fixedPrice) : "");
        setSlabs(rule.slabs || [...DEFAULT_SLABS]);
        setPerSheetColor(rule.perSheetColorCharge ? String(rule.perSheetColorCharge) : "");
        setPerSheetBw(rule.perSheetBwCharge ? String(rule.perSheetBwCharge) : "");
      } else {
        // Fallback to default if no rule exists yet
        setPricingType(item.itemType === "LASER_PAPER" ? "SLAB_BASED" : "FIXED");
        setFixedPrice("");
        setSlabs([...DEFAULT_SLABS]);
      }

      setEditingItemId(item.id);
      setCreatedItemId(item.id); // For step 2 save logic
      setShowModal(true);
      setModalStep(1);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load pricing for edit.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateItem() {
    setBusy(true);
    setModalError("");
    try {
      const payload = {
        name: name.trim(),
        itemType,
        unitOfMeasurement,
        baseStockQuantity: 0,
        isActive
      };

      if (gsm) payload.gsm = parseFloat(gsm);
      if (dimLength || dimBreadth) {
        payload.dimensions = {
          length: parseFloat(dimLength) || undefined,
          breadth: parseFloat(dimBreadth) || undefined,
          unit: dimUnit
        };
      }

      if (editingItemId) {
        await updateStockItem(editingItemId, payload);
        setModalStep(2);
      } else {
        const response = await createStockItem(payload);
        setCreatedItemId(response.item.id);
        setModalStep(2);
      }
    } catch (e) {
      setModalError(e.response?.data?.message || `Failed to ${editingItemId ? 'update' : 'create'} stock item.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePricing() {
    setBusy(true);
    setModalError("");
    try {
      let payload = { pricingType, isActive: true };

      if (pricingType === "SLAB_BASED") {
        payload.slabs = slabs.map(s => ({
          minCount: parseFloat(s.minCount) || 0,
          maxCount: s.maxCount === "" ? null : parseFloat(s.maxCount) || null,
          colorCharge: parseFloat(s.colorCharge) || 0,
          bwCharge: parseFloat(s.bwCharge) || 0
        }));
      } else if (pricingType === "FIXED") {
        payload.fixedPrice = parseFloat(fixedPrice) || 0;
      } else if (pricingType === "PER_SHEET") {
        payload.perSheetColorCharge = parseFloat(perSheetColor) || 0;
        payload.perSheetBwCharge = parseFloat(perSheetBw) || 0;
      }

      await upsertStockPricingRule(createdItemId, payload);
      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (e) {
      setModalError(e.response?.data?.message || "Failed to save pricing rules.");
    } finally {
      setBusy(false);
    }
  }

  function handleAddSlab() {
    const lastSlab = slabs[slabs.length - 1];
    const newMin = (parseFloat(lastSlab?.maxCount) || 0) + 1;
    setSlabs([...slabs, { minCount: String(newMin), maxCount: "", colorCharge: "0", bwCharge: "0" }]);
  }

  function handleRemoveSlab(index) {
    if (slabs.length <= 1) return;
    const newSlabs = slabs.filter((_, i) => i !== index);
    // Re-calculate mincounts from the point of deletion to maintain continuity
    for (let i = 1; i < newSlabs.length; i++) {
        newSlabs[i].minCount = (newSlabs[i-1].maxCount || 0) + 1;
    }
    setSlabs(newSlabs);
  }

  function updateSlab(index, field, value) {
    const newSlabs = [...slabs];
    newSlabs[index][field] = value;
    
    // Auto-cascade minCount for next row if maxCount of current row changes
    if (field === "maxCount" && index < newSlabs.length - 1) {
       newSlabs[index+1].minCount = String((parseFloat(value) || 0) + 1);
    }
    
    setSlabs(newSlabs);
  }
  async function handleApplyDelete() {
      if (!deleteTargetItem) return;
      setBusy(true);
      setErrorText("");
      try {
          await deleteStockItem(deleteTargetItem.id);
          setShowDeleteModal(false);
          setDeleteTargetItem(null);
          fetchItems(searchQuery);
      } catch (e) {
          setErrorText(e.response?.data?.message || "Failed to delete stock item.");
      } finally {
          setBusy(false);
      }
  }


  return (
    <div className="max-w-6xl mx-auto animate-fade-in relative pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Paper & Stock</h1>
           <p className="mt-2 text-brand-navy/60 font-medium">Manage your material inventory and dynamic pricing strategy.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20 group-focus-within:text-brand-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search stock..." 
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
               Add New Stock
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
                              <th className="px-6 py-4 text-xs font-bold text-brand-navy/40 uppercase tracking-wider">Item Name</th>
                              <th className="px-6 py-4 text-xs font-bold text-brand-navy/40 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-4 text-xs font-bold text-brand-navy/40 uppercase tracking-wider">Specs (GSM/Size)</th>
                              <th className="px-6 py-4 text-xs font-bold text-brand-navy/40 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="px-6 py-12 text-center text-brand-navy/40 font-bold">No stock items provisioned yet.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-brand-navy">{item.name}</div>
                                          <div className={`text-[10px] font-bold uppercase ${item.isActive ? 'text-brand-teal' : 'text-brand-navy/40'}`}>
                                              {item.isActive ? 'Active' : 'Archived'}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className="px-3 py-1 rounded-full bg-brand-navy/5 text-brand-navy text-[11px] font-bold border border-brand-navy/5">
                                              {ITEM_TYPES.find(t => t.value === item.itemType)?.label || item.itemType}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-sm font-medium text-brand-navy/80">
                                              {item.gsm ? `${item.gsm} GSM` : "N/A"}
                                          </div>
                                          <div className="text-xs text-brand-navy/40">
                                              {item.dimensions ? `${item.dimensions.length}×${item.dimensions.breadth} ${item.dimensions.unit}` : ""}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-2">
                                                  <button 
                                                    onClick={() => handleEditClick(item)}
                                                    disabled={busy}
                                                    title="Edit Catalog & Pricing"
                                                    className="p-2 text-brand-navy/40 hover:text-brand-navy hover:bg-brand-navy/5 rounded-full transition-all disabled:opacity-50"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    disabled={busy}
                                                    title="Delete Item"
                                                    className="p-2 text-red-400/60 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
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

              {/* Pagination Controls */}
              {totalItems > 0 && (
                  <div className="px-6 py-4 bg-zinc-50/50 border-t border-brand-navy/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest">
                          Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="p-2 rounded-lg border border-brand-navy/10 text-brand-navy/60 hover:bg-white hover:text-brand-teal transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                              <MdChevronLeft className="w-5 h-5" />
                          </button>
                          
                          <div className="flex items-center gap-1">
                              {/* Simple pagination logic for numbers */}
                              {Array.from({ length: Math.ceil(totalItems / pageSize) }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === Math.ceil(totalItems / pageSize) || Math.abs(p - currentPage) <= 1)
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-brand-navy/20 font-black">...</span>}
                                        <button 
                                          onClick={() => setCurrentPage(p)}
                                          className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === p ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' : 'text-brand-navy/40 hover:bg-white'}`}
                                        >
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))}
                          </div>

                          <button 
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / pageSize), prev + 1))}
                            disabled={currentPage === Math.ceil(totalItems / pageSize) || loading}
                            className="p-2 rounded-lg border border-brand-navy/10 text-brand-navy/60 hover:bg-white hover:text-brand-teal transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                              <MdChevronRight className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}


      {/* Add Stock Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity" onClick={() => !busy && setShowModal(false)}></div>
              
              <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in">
                  <div className="p-6 border-b border-brand-navy/5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalStep === 1 ? 'bg-brand-navy text-white' : 'bg-brand-mint text-brand-teal'}`}>
                              {modalStep === 1 ? <MdInventory /> : <MdSell />}
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-brand-navy">
                                  {editingItemId ? "Edit Stock Item" : (modalStep === 1 ? "New Stock Item" : "Configure Rules")}
                              </h2>
                              <p className="text-xs text-brand-navy/60 font-semibold tracking-tight uppercase">
                                  Step {modalStep} of 2 • {modalStep === 1 ? "Properties" : "Pricing Strategy"}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => !busy && setShowModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy/40 hover:bg-zinc-100 transition-colors">
                          <MdClose className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="overflow-y-auto p-8 flex-1 space-y-6 no-scrollbar">
                      {modalError && (
                          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">{modalError}</div>
                      )}

                      {modalStep === 1 ? (
                          <>
                              <TextField label="Display Name" placeholder="e.g. Maplitho 90 GSM" value={name} onChange={e => setName(e.target.value)} disabled={busy} />
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <SearchableSelect 
                                      label="Item Category" 
                                      options={ITEM_TYPES} 
                                      value={itemType} 
                                      onChange={e => setItemType(e.target.value)} 
                                      disabled={busy} 
                                  />
                                  <SearchableSelect 
                                      label="Base Unit" 
                                      options={UNIT_OF_MEASUREMENTS.map(u => ({ value: u, label: u }))} 
                                      value={unitOfMeasurement} 
                                      onChange={e => setUnitOfMeasurement(e.target.value)} 
                                      disabled={busy} 
                                  />
                              </div>


                              <div className="grid grid-cols-1 gap-6 pt-4 border-t border-brand-navy/5">
                                  <div>
                                      <TextField label="GSM (Optional)" placeholder="90" value={gsm} onChange={e => setGsm(e.target.value)} disabled={busy} />
                                  </div>
                              </div>


                              <div className="space-y-3">
                                  <label className="block text-sm font-bold text-brand-navy">Physical Dimensions (Optional)</label>
                                  <div className="flex gap-4 items-center">
                                      <input type="text" placeholder="Width" value={dimLength} onChange={e => setDimLength(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-brand-navy/15 bg-white text-brand-navy text-sm font-semibold outline-none focus:border-brand-teal/40 transition-all" disabled={busy} />
                                      <span className="text-brand-navy/20 font-bold">×</span>
                                      <input type="text" placeholder="Height" value={dimBreadth} onChange={e => setDimBreadth(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-brand-navy/15 bg-white text-brand-navy text-sm font-semibold outline-none focus:border-brand-teal/40 transition-all" disabled={busy} />
                                      <div className="w-32">
                                          <SearchableSelect 
                                              options={[{ value: 'mm', label: 'mm' }, { value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]} 
                                              value={dimUnit} 
                                              onChange={e => setDimUnit(e.target.value)} 
                                              disabled={busy} 
                                          />
                                      </div>

                                  </div>
                              </div>

                          </>
                      ) : (
                          <div className="space-y-8 animate-slide-up">
                              <div className="p-4 bg-brand-mint/10 border border-brand-mint rounded-2xl flex items-center gap-4">
                                  <MdSettings className="w-6 h-6 text-brand-teal" />
                                  <div>
                                      <div className="font-bold text-sm text-brand-navy">
                                        {editingItemId ? "Modification provisioned" : "Identity provisioned"}
                                      </div>
                                      <div className="text-[10px] uppercase font-bold text-brand-teal tracking-widest">
                                        {name} {editingItemId ? "updated" : "identified"} / Now binding pricing rules
                                      </div>
                                  </div>
                              </div>

                              {pricingType === "SLAB_BASED" ? (
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center">
                                          <div className="flex flex-col">
                                              <label className="text-sm font-bold text-brand-navy">Slab Configuration</label>
                                              {itemType === "LASER_PAPER" && <span className="text-[10px] font-bold text-brand-teal uppercase">Laser Paper: Slab Pricing Required (QUOTATION SLAB CHARGE)</span>}
                                          </div>
                                          <button onClick={handleAddSlab} className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1">
                                              <MdAdd /> Add Slab Tier
                                          </button>
                                      </div>
                                      <div className="space-y-2">
                                          <div className="grid grid-cols-12 gap-3 px-2 text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">
                                              <div className="col-span-2">Range Min</div>
                                              <div className="col-span-2">Range Max</div>
                                              <div className="col-span-3 text-right">Color Chg</div>
                                              <div className="col-span-3 text-right">B/W Chg</div>
                                              <div className="col-span-2"></div>
                                          </div>
                                          {slabs.map((slab, idx) => (
                                              <div key={idx} className="grid grid-cols-12 gap-3 items-center group">
                                                  <div className="col-span-2">
                                                      <input type="text" value={slab.minCount} readOnly className="w-full h-10 px-3 bg-zinc-50 rounded-lg text-sm font-bold text-brand-navy/40" />
                                                  </div>
                                                  <div className="col-span-2">
                                                      <input 
                                                          type="text" 
                                                          placeholder="∞" 
                                                          value={slab.maxCount} 
                                                          onChange={e => updateSlab(idx, "maxCount", e.target.value)}
                                                          className="w-full h-10 px-3 border border-brand-navy/15 bg-white rounded-lg text-brand-navy text-sm font-bold focus:border-brand-teal/40 outline-none" 
                                                      />
                                                  </div>
                                                  <div className="col-span-3">
                                                      <input 
                                                          type="text" 
                                                          value={slab.colorCharge} 
                                                          onChange={e => updateSlab(idx, "colorCharge", e.target.value)}
                                                          className="w-full h-10 px-3 border border-brand-navy/15 bg-white rounded-lg text-brand-navy text-sm font-bold text-right focus:border-brand-teal/40 outline-none" 
                                                      />
                                                  </div>
                                                  <div className="col-span-3">
                                                      <input 
                                                          type="text" 
                                                          value={slab.bwCharge} 
                                                          onChange={e => updateSlab(idx, "bwCharge", e.target.value)}
                                                          className="w-full h-10 px-3 border border-brand-navy/15 bg-white rounded-lg text-brand-navy text-sm font-bold text-right focus:border-brand-teal/40 outline-none" 
                                                      />
                                                  </div>
                                                  <div className="col-span-2 flex justify-end">
                                                      {slabs.length > 1 && (
                                                          <button 
                                                              onClick={() => handleRemoveSlab(idx)}
                                                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                              title="Remove Tier"
                                                          >
                                                              <MdClose />
                                                          </button>
                                                      )}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <div className="p-6 bg-zinc-50 rounded-2xl border border-brand-navy/5">
                                          <div className="flex justify-between items-center mb-4">
                                               <label className="text-sm font-bold text-brand-navy">Fixed Pricing</label>
                                               {itemType === "OFFSET_PAPER" && <span className="text-[10px] font-bold text-brand-teal uppercase">Offset Paper: Fixed Pricing Required</span>}
                                          </div>
                                          <TextField label="Unit Price (Fixed)" placeholder="3.30" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)} />
                                          <p className="mt-3 text-[10px] font-semibold text-brand-navy/40 uppercase tracking-wider">Applicable for all offset printing calculations.</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-brand-navy/5 bg-zinc-50/50 rounded-b-[2rem] flex justify-end gap-3">
                      <button onClick={() => !busy && setShowModal(false)} className="px-6 py-3 text-sm font-bold text-brand-navy/40 hover:text-brand-navy transition-all">Cancel</button>
                      <PrimaryButton 
                          onClick={modalStep === 1 ? handleCreateItem : handleSavePricing} 
                          disabled={busy || !name || (modalStep === 2 && pricingType === "FIXED" && !fixedPrice)}
                      >
                          {busy ? "Processing..." : (modalStep === 1 ? (editingItemId ? "Update Properties" : "Next: Configure Pricing") : (editingItemId ? "Update Pricing Rules" : "Finalize Stock Item"))}
                      </PrimaryButton>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTargetItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
              
              <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col animate-scale-in overflow-hidden border border-brand-navy/5">
                  <div className="p-8 text-center space-y-6">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                          <MdOutlineDelete className="w-10 h-10" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black text-brand-navy tracking-tight">Delete Stock?</h2>
                        <p className="text-sm font-medium text-brand-navy/40 px-4">
                          This will permanently remove <span className="text-brand-navy font-bold">{deleteTargetItem.name}</span> and all its pricing rules. This action cannot be undone.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                          <button 
                            onClick={handleApplyDelete}
                            disabled={busy}
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                              {busy ? "Deleting..." : "Yes, Delete Permanently"}
                          </button>
                          <button 
                            onClick={() => setShowDeleteModal(false)}
                            disabled={busy}
                            className="w-full py-4 text-sm font-bold text-brand-navy/40 hover:text-brand-navy transition-all"
                          >
                            No, Keep it
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

