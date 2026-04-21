import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getQuotation, createQuotation, updateQuotation, getCustomers, createCustomer,
  getLaserQuoteOptions, getSizeCharts, getStockItems, getLaserPaperStocks,
  getOffsetQuoteOptions, getOffsetPaperStocks
} from "../../../infrastructure/api/backendService.js";


import BrandLogo from "../../components/logo/BrandLogo.jsx";
import { MdAdd, MdClose, MdContentCopy, MdDeleteOutline, MdLayers, MdArrowBack, MdEdit, MdCheckCircle, MdPrint, MdOutlineAnalytics, MdWarningAmber, MdPrint as MdPrintIcon, MdComputer, MdPersonAdd, MdBusiness, MdPhone, MdEmail, MdLocationOn, MdInfo, MdHelpOutline } from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { TextField, PrimaryButton, SearchableSelect, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import PaperLayoutPreview from "../../components/quotes/PaperLayoutPreview.jsx";




const ADDRESS_TEMPLATE = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };


const TABS = [
  { id: "laser", label: "Laser Printing", icon: <MdComputer /> },
  { id: "offset", label: "Offset Printing", icon: <MdPrint /> }
];


export default function QuotationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("laser");

  // Form State
  const [title, setTitle] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [currency, setCurrency] = useState("INR");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [headerErrors, setHeaderErrors] = useState({});
  const [createdBy, setCreatedBy] = useState(null);



  // Customer Details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingAddress, setPendingAddress] = useState("");

  // New Customer Modal State
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompany, setNewCustCompany] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustTaxId, setNewCustTaxId] = useState("");
  const [newCustAddress, setNewCustAddress] = useState({ ...ADDRESS_TEMPLATE });
  const [newCustError, setNewCustError] = useState("");
  const [newCustFieldErrors, setNewCustFieldErrors] = useState({});

  // Line Item Prototype State


  const [lineItems, setLineItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    size: "", side: "", colour: "", paper: "", qty: "", waste: "", printer: "", amount: ""
  });

  // --- Laser Calculator State ---
  const [laserSizeId, setLaserSizeId] = useState("");
  const [laserStockItemId, setLaserStockItemId] = useState("");
  const [laserColorMode, setLaserColorMode] = useState("COLOR");
  const [laserSides, setLaserSides] = useState("SINGLE");
  const [laserCopies, setLaserCopies] = useState("10");  // String for input, cast to number for API
  const [isOnlyClipCharge, setIsOnlyClipCharge] = useState(false);

  const [laserSizeOptions, setLaserSizeOptions] = useState([]);
  const [laserStockOptions, setLaserStockOptions] = useState([]);
  const [laserPricingOptions, setLaserPricingOptions] = useState([]);
  const [showOffsetHelp, setShowOffsetHelp] = useState(false);
  const [laserLoading, setLaserLoading] = useState(false);
  const [laserError, setLaserError] = useState("");

  const [sizeList, setSizeList] = useState([]);
  const [stockItemList, setStockItemList] = useState([]);

  // --- Offset Calculator State ---
  const [offsetSizeId, setOffsetSizeId] = useState("");
  const [offsetStockItemId, setOffsetStockItemId] = useState("");
  const [offsetColorMode, setOffsetColorMode] = useState("Single");
  const [offsetSides, setOffsetSides] = useState("SINGLE");
  const [offsetIsBackSideDifferent, setOffsetIsBackSideDifferent] = useState(false);
  const [offsetCopies, setOffsetCopies] = useState("1000"); 
  const [offsetWaste, setOffsetWaste] = useState("0");
  const [itemTitle, setItemTitle] = useState("");


  const [offsetSizeOptions, setOffsetSizeOptions] = useState([]);
  const [offsetStockOptions, setOffsetStockOptions] = useState([]);
  const [offsetPricingOptions, setOffsetPricingOptions] = useState([]);
  const [selectedOffsetOption, setSelectedOffsetOption] = useState(null);
  const [offsetLoading, setOffsetLoading] = useState(false);
  const [offsetError, setOffsetError] = useState("");

  const activeOrg = user?.organizations?.find(o => (o.organizationId || o.id) === user.activeOrganizationId);
  const activeOrgName = activeOrg?.name || "PrintQ Client";

  // Navigation Refs
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const laserSizeRef = useRef(null);
  const laserStockRef = useRef(null);
  const laserCopiesRef = useRef(null);
  const itemTitleRef = useRef(null);
  const customWidthRef = useRef(null);
  const customBreadthRef = useRef(null);

  // Inspection Drawer State
  const [previewingLayoutOption, setPreviewingLayoutOption] = useState(null);


  // Custom Size State
  const [customWidth, setCustomWidth] = useState("");
  const [customBreadth, setCustomBreadth] = useState("");
  const [customUnit, setCustomUnit] = useState(user.settings?.defaultLengthUnit || "mm");
  const [editingLineId, setEditingLineId] = useState(null); 
  const [selectedLaserOption, setSelectedLaserOption] = useState(null);


  useEffect(() => {
    if (id && id !== "new") {
       // Check if we already have the quotation data passed from navigation (e.g. after creation)
       if (location.state?.quotation && location.state.quotation.id === id) {
          applyQuotationData(location.state.quotation);
          // Optional: clear state if we don't want it to persist on manual refresh
          window.history.replaceState({}, document.title);
       } else {
          fetchQuotation();
       }
    } else {
      // In case we were loading another quote before, reset loading for /new
      setLoading(false);
    }
  }, [id, location.state]);

  function applyQuotationData(q) {
     setQuoteNumber(q.quoteNumber || "DRAFT");
     setTitle(q.title || "");
     setStatus(q.status || "DRAFT");
     setCustomerId(q.customer?.id || q.customerId || null);
     setSelectedCustomer(q.customer || null);
     setNotes(q.notes || "");
     setCreatedBy(q.createdBy || null);
     if (q.validUntil) {
       setValidUntil(new Date(q.validUntil).toISOString().split('T')[0]);
     }
      const items = (q.lineItems || []).map((li, index) => ({
        ...li,
        id: li.id || li._id || `item-${index}-${Date.now()}`
      }));
      setLineItems(items);
  }





  async function fetchQuotation() {
    setLoading(true);
    try {
      const data = await getQuotation(id);
      applyQuotationData(data.quotation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  async function syncLineItems(newList) {
    if (isNew) {
      setLineItems(newList);
      return;
    }
    console.log("Syncing line items for ID:", id, "Count:", newList.length);
    setBusy(true);
    try {
      await updateQuotation(id, { lineItems: newList });
      console.log("Sync success!");
      setLineItems(newList);
    } catch (e) {
      console.error("Sync Error:", e);
      // Fallback to local state update if backend fails or skip if critical
      setLineItems(newList); 
    } finally {
      setBusy(false);
    }
  }
  // Line Item Handlers
   async function handleDeleteLineItem(targetId) {
     if (!targetId) {
       console.warn("Attempted to delete item with null/undefined ID. Operation aborted to prevent full list wipe.");
       return;
     }
     console.log("Deleting item with ID:", targetId);
     const newList = lineItems.filter(li => {
       const liId = li.id || li._id;
       return liId !== targetId;
     });
     await syncLineItems(newList);
   }

   function resetCalculator() {
     setLaserStockItemId("");
     setLaserSizeId("");
     
     setOffsetStockItemId("");
     setOffsetSizeId("");
     setOffsetWaste("0");

     setCustomWidth("");
     setCustomBreadth("");
     
     setLaserColorMode("COLOR");
     setLaserSides("SINGLE");
     setLaserCopies("10");

     setOffsetColorMode("Single");
     setOffsetSides("SINGLE");
     setOffsetIsBackSideDifferent(false);
     setOffsetCopies("1000");

     setIsOnlyClipCharge(false);
     
     setLaserPricingOptions([]);
     setSelectedLaserOption(null);
     
     setOffsetPricingOptions([]);
     setSelectedOffsetOption(null);

     setItemTitle("");
     setEditingLineId(null);
   }

   function handleEditLineItem(item) {
     const targetId = item.id || item._id;
     if (!targetId) {
       console.error("Cannot edit item: No ID found", item);
       return;
     }

     console.log("Entering Edit Mode for Item ID:", targetId);
     setEditingLineId(String(targetId));

     const m = item.meta;
     if (!m) {
       console.warn("Item meta is missing. Calculator rehydration might be incomplete.", item);
     } else {
       // Check if it's laser or offset
       if (m.laserStockItemId !== undefined) {
         setActiveTab("laser");
         setLaserStockItemId(m.laserStockItemId || "");
         setLaserSizeId(m.laserSizeId || "");
         setCustomWidth(m.customWidth || "");
         setCustomBreadth(m.customBreadth || "");
         setCustomUnit(m.customUnit || "inch");
         setLaserSides(m.laserSides || "SINGLE");
         setLaserColorMode(m.laserColorMode || "COLOR");
         setLaserCopies(m.laserCopies?.toString() || "10");
         setIsOnlyClipCharge(m.isOnlyClipCharge ?? false);
       } else if (m.offsetStockItemId !== undefined) {
         setActiveTab("offset");
         setOffsetStockItemId(m.offsetStockItemId || "");
         setOffsetSizeId(m.offsetSizeId || "");
         setCustomWidth(m.customWidth || "");
         setCustomBreadth(m.customBreadth || "");
         setCustomUnit(m.customUnit || "inch");
         setOffsetSides(m.offsetSides || "SINGLE");
         setOffsetIsBackSideDifferent(m.offsetIsBackSideDifferent ?? false);
         setOffsetColorMode(m.offsetColorMode || "Single");
         setOffsetCopies(m.offsetCopies?.toString() || "1000");
         setOffsetWaste(m.offsetWaste?.toString() || "0");
       }
       setItemTitle(m.itemTitle || "");
     }

    // Scroll to calculator
    const calcEl = document.getElementById('calc-top');
    if (calcEl) calcEl.scrollIntoView({ behavior: 'smooth' });
  }

   async function syncHeader(fields) {
     if (!id || id === "new") return;

    setHeaderErrors({});
    try {
      await updateQuotation(id, fields);
    } catch (e) {
      if (e.response?.data?.code === "VALIDATION_ERROR") {
        setHeaderErrors(e.response.data.issues?.fieldErrors || {});
      } else {
        console.error("Failed to sync header", e);
      }
    }
  }


   // Handle Customer Selection & Sync
   async function handleCustomerSelect(cust) {
      setCustomerId(cust.id);
      setSelectedCustomer(cust);
      setShowCustomerSearch(false);
      setPendingPhone("");
      setPendingAddress("");
      
      // Jump to Title after selection
      setTimeout(() => titleInputRef.current?.focus(), 100);
     
     if (id && id !== "new") {
       syncHeader({ customerId: cust.id });
     } else {
       handleInitialCreation(cust.id);
     }
   }


   async function handleCustomerSearchKeyDown(e) {
     if (e.key === "Enter") {
       e.preventDefault();
       if (!customerSearch.trim()) return;

       const exactMatch = customerList.find(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase());
       if (exactMatch) {
         handleCustomerSelect(exactMatch);
         return;
       }

       // Focus Phone field next
       setShowCustomerSearch(false);
       phoneInputRef.current?.focus();
     }
   }

   async function handleInitialCreation(cId) {
     setBusy(true);
     try {
       const res = await createQuotation({ customerId: cId, title: title.trim(), status: "DRAFT" });
       // Pass the created quotation in state to avoid a loading flash on navigation
       navigate(`/dashboard/quotes/${res.quotation.id}`, { 
         replace: true,
         state: { quotation: res.quotation }
       });
     } catch (e) {
       console.error("Failed to create initial quote", e);
     } finally {
       setBusy(false);
     }
   }







  async function handleCreateNewCustomer() {
    if (!newCustName.trim()) { setNewCustError("Customer name is required."); return; }
    setBusy(true);
    setNewCustError("");
    setNewCustFieldErrors({});

    const cleanAddress = (addr) => {
      const hasContent = Object.values(addr).some(v => v && v.trim());
      return hasContent ? addr : undefined;
    };

    try {
      const payload = {
        name: newCustName.trim(),
        companyName: newCustCompany.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
        taxId: newCustTaxId.trim() || undefined,
        isActive: true,
        billingAddress: cleanAddress(newCustAddress)
      };
      const res = await createCustomer(payload);
      setShowNewCustModal(false);
      handleCustomerSelect(res.customer);
      // Reset form
      setNewCustName(""); setNewCustCompany(""); setNewCustPhone(""); setNewCustEmail(""); setNewCustTaxId(""); setNewCustAddress({ ...ADDRESS_TEMPLATE });
    } catch (e) {
      if (e.response?.data?.code === "VALIDATION_ERROR") {
        setNewCustFieldErrors(e.response.data.issues?.fieldErrors || {});
        setNewCustError("Validation failed.");
      } else {
        setNewCustError(e.response?.data?.message || "Failed to create customer.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function searchCustomers(q) {
    if (!q) { setCustomerList([]); return; }
    try {
      const data = await getCustomers(q, 0, 10);
      setCustomerList(data.items || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCustomerSearch) searchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, showCustomerSearch]);

  // Laser Support Fetches
  async function fetchLaserSizes(q = "") {
    try {
      const data = await getSizeCharts(q, 0, 20);
      setSizeList(data.items || []);
      const options = (data.items || []).map(s => ({
        label: `${s.name} (${s.width}x${s.breadth}${s.unit})`,
        value: s.id,
        raw: s
      }));
      // Inject Custom Size Option
      setLaserSizeOptions([...options, { label: "📐 Custom Size...", value: "custom" }]);
    } catch (e) { console.error(e); }
  }


  async function fetchLaserStocks(q = "") {
    try {
      const data = await getLaserPaperStocks(q, 0, 20);
      setStockItemList(data.items || []);
      setLaserStockOptions((data.items || []).map(s => ({
        label: `${s.name} (${s.unitOfMeasurement || 'Count'})`,
        value: s.id
      })));
    } catch (e) { console.error(e); }
  }


  useEffect(() => {
    if (activeTab === "laser") {
      fetchLaserSizes();
      fetchLaserStocks();
    } else if (activeTab === "offset") {
      fetchOffsetSizes();
      fetchOffsetStocks();
    }
  }, [activeTab]);

  async function fetchOffsetSizes(q = "") {
    try {
      const data = await getSizeCharts(q, 0, 20);
      setSizeList(data.items || []);
      const options = (data.items || []).map(s => ({
        label: `${s.name} (${s.width}x${s.breadth}${s.unit})`,
        value: s.id,
        raw: s
      }));
      setOffsetSizeOptions([...options, { label: "📐 Custom Size...", value: "custom" }]);
    } catch (e) { console.error(e); }
  }

  async function fetchOffsetStocks(q = "") {
    try {
      const data = await getOffsetPaperStocks(q, 0, 20);
      setStockItemList(data.items || []);
      setOffsetStockOptions((data.items || []).map(s => ({
        label: `${s.name} (${s.unitOfMeasurement || 'Count'})`,
        value: s.id
      })));
    } catch (e) { console.error(e); }
  }

  async function recalculateLaserPricing() {
    if (!laserSizeId || !laserStockItemId || !laserCopies) return;

    let sizePayload;
    if (laserSizeId === 'custom') {
      if (!customWidth || !customBreadth) return;
      sizePayload = {
        width: Number(customWidth),
        breadth: Number(customBreadth),
        unit: customUnit
      };
    } else {
      const selectedSize = sizeList.find(s => s.id === laserSizeId);
      if (!selectedSize) return;
      sizePayload = {
        width: selectedSize.width,
        breadth: selectedSize.breadth,
        unit: selectedSize.unit
      };
    }

    setLaserLoading(true);
    setLaserError("");
    try {
      const payload = {
        size: sizePayload,
        colorMode: laserColorMode,
        sides: laserSides,
        stockItemId: laserStockItemId,
        copies: parseInt(laserCopies) || 0,
        isOnlyClipCharge
      };

      const data = await getLaserQuoteOptions(payload);
      setLaserPricingOptions(data.options || []);
      // Auto-select best value if in edit mode or if current selection is null but options exist
      if (data.options?.length > 0 && data.options[0].isPrintable !== false) {
        setSelectedLaserOption(data.options[0]);
      }
    } catch (e) {
      setLaserError(e.response?.data?.message || "Pricing not available for this configuration.");
      setLaserPricingOptions([]);
    } finally {
      setLaserLoading(false);
    }
  }

  async function recalculateOffsetPricing() {
    if (!offsetSizeId || !offsetStockItemId || !offsetCopies) return;

    let sizePayload;
    if (offsetSizeId === 'custom') {
      if (!customWidth || !customBreadth) return;
      sizePayload = {
        width: Number(customWidth),
        breadth: Number(customBreadth),
        unit: customUnit
      };
    } else {
      const selectedSize = sizeList.find(s => s.id === offsetSizeId);
      if (!selectedSize) return;
      sizePayload = {
        width: selectedSize.width,
        breadth: selectedSize.breadth,
        unit: selectedSize.unit
      };
    }

    setOffsetLoading(true);
    setOffsetError("");
    try {
      const payload = {
        size: sizePayload,
        colourMode: offsetColorMode,
        sides: offsetSides,
        isBackSideDifferent: offsetIsBackSideDifferent,
        stockItemId: offsetStockItemId,
        copies: parseInt(offsetCopies) || 0,
        wasteImpressions: parseInt(offsetWaste) || 0
      };

      const data = await getOffsetQuoteOptions(payload);
      setOffsetPricingOptions(data.options || []);
      if (data.options?.length > 0 && data.options[0].isPrintable !== false) {
        setSelectedOffsetOption(data.options[0]);
      }
    } catch (e) {
      setOffsetError(e.response?.data?.message || "Pricing not available for this configuration.");
      setOffsetPricingOptions([]);
    } finally {
      setOffsetLoading(false);
    }
  }


  // Effect to trigger calculation
  useEffect(() => {
    setSelectedLaserOption(null); // Clear selection on input change
    if (activeTab === "laser" && laserSizeId && laserStockItemId && laserCopies) {
      const timer = setTimeout(recalculateLaserPricing, 500);
      return () => clearTimeout(timer);
    }
  }, [laserSizeId, laserStockItemId, laserColorMode, laserSides, laserCopies, isOnlyClipCharge, activeTab, customWidth, customBreadth, customUnit]);

  useEffect(() => {
    setSelectedOffsetOption(null);
    if (activeTab === "offset" && offsetSizeId && offsetStockItemId && offsetCopies) {
      const timer = setTimeout(recalculateOffsetPricing, 500);
      return () => clearTimeout(timer);
    }
  }, [offsetSizeId, offsetStockItemId, offsetColorMode, offsetSides, offsetIsBackSideDifferent, offsetCopies, offsetWaste, activeTab, customWidth, customBreadth, customUnit]);




  const addItemToPreview = () => {
    if (!currentItem.size && !currentItem.amount) return;
    setLineItems([...lineItems, { ...currentItem, id: Date.now() }]);
    setCurrentItem({ size: "", side: "", colour: "", paper: "", qty: "", waste: "", printer: "", amount: "" });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col items-stretch overflow-x-hidden animate-fade-in select-none">

       {/* Professional Printable Letterhead (Only visible in Print) */}
       <div className="print-only w-full mb-12">
          <div className="flex justify-between items-start border-b-4 border-brand-navy pb-8">
             <div className="flex items-center gap-4">
                <BrandLogo className="w-16 h-16 shadow-lg rounded-2xl" />
                <div className="flex flex-col">
                   <span className="text-2xl font-black text-brand-navy tracking-tighter uppercase">Print&shy;Q</span>
                   <span className="text-sm font-bold text-brand-teal uppercase tracking-widest">{activeOrgName}</span>
                </div>
             </div>
             
             <div className="text-right">
                <div className="text-3xl font-black text-brand-navy uppercase tracking-tighter mb-1">Quotation</div>
                <div className="text-[11px] font-black text-brand-navy/40 uppercase tracking-widest leading-relaxed">
                   No: {quoteNumber || "DRAFT"}
                </div>
                <div className="text-[11px] font-black text-brand-navy/40 uppercase tracking-widest mt-0.5">
                   Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {createdBy && (
                   <div className="text-[9px] font-black text-brand-teal uppercase tracking-widest mt-1.5 opacity-80 decoration-brand-teal/30 underline underline-offset-4 decoration-2">
                      Created By: {createdBy.displayName || createdBy.name}
                   </div>
                )}
             </div>

          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-12">
             <div className="space-y-1">
                <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">Quoted For:</div>
                <div className="text-sm font-black text-brand-navy">{selectedCustomer?.name || 'Valued Customer'}</div>
                {selectedCustomer?.companyName && <div className="text-xs font-bold text-brand-navy/60">{selectedCustomer.companyName}</div>}
             </div>
             
             <div className="text-right space-y-1">
                <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">Validity:</div>
                <div className="text-sm font-black text-brand-navy">{validUntil || '---'}</div>
                <div className="text-xs font-bold text-brand-navy/60">Subject to terms and conditions</div>
             </div>
          </div>
          
          <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
             <div className="flex-1">
                <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mb-1">Subject:</div>
                <div className="text-sm font-bold text-brand-navy italic">"{title || 'General Printing Quotation'}"</div>
             </div>
             <div className="text-right">
                <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mb-1">Grand Total:</div>
                <div className="text-xl font-black text-brand-navy">{currency} {lineItems.reduce((acc, curr) => acc + (curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0), 0).toLocaleString()}</div>
             </div>
         </div>

      </div>

       {/* 1. Technical Header */}
       <section className="no-print px-10 py-6 border-b border-brand-navy/5 flex items-center justify-between gap-12 bg-[#FDFDFD]">
          {/* Left: Navigation & Customer Cluster */}
          <div className="flex items-center gap-6">
              <button
                onClick={() => navigate("/dashboard/quotes")}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-navy/30 hover:bg-zinc-100 hover:text-brand-navy transition-all"
                title="Back to list"
              >
                <MdArrowBack className="w-5 h-5" />
              </button>
              
              {/* Focused Customer Information Card */}
          <div className="w-[360px] border border-brand-navy/10 rounded-xl p-4 bg-white shadow-sm relative group">
              <div className="flex justify-between items-center mb-3">
                 <span className="text-[9px] font-black text-brand-navy/20 uppercase tracking-[0.2em]">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 {busy && <div className="w-3 h-3 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>}
              </div>

              <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-brand-navy/40 w-12">Cust :</span>
                     <div className="relative flex-1 flex flex-col items-start">
                        <div className="w-full flex items-center gap-2">
                           {!selectedCustomer ? (
                              <div className="relative flex-1">
                                 <input
                                   type="text"
                                   placeholder="Search account..."
                                   value={customerSearch}
                                   onFocus={() => setShowCustomerSearch(true)}
                                   onChange={e => setCustomerSearch(e.target.value)}
                                   onKeyDown={handleCustomerSearchKeyDown}
                                   className={`w-full text-[11px] font-black text-brand-navy outline-none border-b py-0.5 transition-colors ${headerErrors.customerId ? 'border-red-400 focus:border-red-500' : 'border-brand-teal/20 focus:border-brand-teal'}`}
                                 />
                                 {showCustomerSearch && (
                                   <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-brand-navy/10 rounded-xl shadow-2xl py-2 max-h-40 overflow-y-auto no-scrollbar">
                                      {customerList.length > 0 ? customerList.map(c => (
                                        <button
                                         key={c.id}
                                         onClick={() => handleCustomerSelect(c)}
                                         className="w-full px-4 py-2 text-left text-[11px] font-bold text-brand-navy hover:bg-zinc-50"
                                        >
                                           {c.name} {c.companyName && <span className="opacity-40 ml-1">({c.companyName})</span>}
                                        </button>
                                      )) : (
                                        <button 
                                          onClick={() => {
                                             setShowCustomerSearch(false);
                                             phoneInputRef.current?.focus();
                                          }}
                                          className="w-full px-4 py-3 text-left group"
                                        >
                                           <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-0.5">Register New Account</div>
                                           <div className="text-[11px] font-bold text-brand-navy group-hover:text-brand-teal transition-colors">Press Enter to add "{customerSearch}"</div>
                                        </button>
                                      )}
                                   </div>
                                 )}
                              </div>
                           ) : (
                             <div className="flex-1 flex items-center justify-between border-b border-brand-mint/40 py-0.5 group/select">
                                <span className="text-[11px] font-black text-brand-teal">{selectedCustomer.name}</span>
                                <button onClick={() => { setSelectedCustomer(null); setCustomerId(null); syncHeader({ customerId: null }); }} className="opacity-0 group-hover/select:opacity-100 transition-opacity">
                                   <MdClose className="w-3 h-3 text-red-400" />
                                </button>
                             </div>
                           )}
                           {!selectedCustomer && (
                              <button
                               onClick={() => setShowNewCustModal(true)}
                               className="p-1 px-2 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal hover:text-white rounded-lg transition-all"
                               title="Register new customer"
                              >
                                 <MdPersonAdd className="w-4 h-4" />
                              </button>
                           )}
                        </div>
                        {headerErrors.customerId && <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter mt-1">{headerErrors.customerId[0]}</span>}
                     </div>
                  </div>


                 <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-brand-navy/40 w-16">Phone :</span>
                    {!selectedCustomer && customerSearch.trim() ? (
                        <input
                           ref={phoneInputRef}
                           type="text"
                           placeholder="Enter phone..."
                           value={pendingPhone}
                           onFocus={() => setShowCustomerSearch(false)}
                           onChange={e => setPendingPhone(e.target.value)}
                           onKeyDown={e => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 addressInputRef.current?.focus();
                              }
                           }}
                           className="text-[11px] font-black text-brand-navy outline-none border-b border-brand-teal/10 focus:border-brand-teal bg-transparent flex-1 py-0.5"
                        />
                    ) : (
                        <span className="text-[11px] font-black text-brand-navy/80">{selectedCustomer?.phone || "--"}</span>
                    )}
                 </div>

                 <div className="flex items-start gap-3">
                    <span className="text-[11px] font-bold text-brand-navy/40 w-16 mt-0.5">Address :</span>
                    {!selectedCustomer && customerSearch.trim() ? (
                        <input
                           ref={addressInputRef}
                           type="text"
                           placeholder="Enter address..."
                           value={pendingAddress}
                           onFocus={() => setShowCustomerSearch(false)}
                           onChange={e => setPendingAddress(e.target.value)}
                           onKeyDown={async e => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 setBusy(true);
                                 try {
                                   const payload = { 
                                     name: customerSearch.trim(), 
                                     phone: pendingPhone.trim() || undefined,
                                     billingAddress: pendingAddress.trim() ? { line1: pendingAddress.trim() } : undefined,
                                     isActive: true 
                                   };
                                   const res = await createCustomer(payload);
                                   handleCustomerSelect(res.customer);
                                   setCustomerSearch("");
                                 } catch (err) {
                                   console.error("Failed to quick-create customer", err);
                                 } finally {
                                   setBusy(false);
                                 }
                              }
                           }}
                           className="text-[11px] font-black text-brand-navy outline-none border-b border-brand-teal/10 focus:border-brand-teal bg-transparent flex-1 py-0.5"
                        />
                    ) : (
                        <span className="text-[11px] font-black text-brand-navy/80 flex-1 leading-snug">
                           {selectedCustomer?.billingAddress ? `${selectedCustomer.billingAddress.line1}${selectedCustomer.billingAddress.city ? ', ' + selectedCustomer.billingAddress.city : ''}` : "--"}
                        </span>
                    )}
                 </div>
              </div>

               {!selectedCustomer && customerSearch.trim() && (
                 <div className="mt-4 pt-4 border-t border-brand-teal/5 flex flex-col items-center gap-1.5 animate-fade-in">
                    <div className="flex items-center gap-4 text-[7px] font-black uppercase tracking-[0.2em]">
                       <span className={document.activeElement?.placeholder?.includes('account') ? 'text-brand-teal' : 'text-brand-navy/20'}>1. Name</span>
                       <span className="text-brand-navy/10">→</span>
                       <span className={document.activeElement?.placeholder?.includes('phone') ? 'text-brand-teal' : 'text-brand-navy/20'}>2. Phone</span>
                       <span className="text-brand-navy/10">→</span>
                       <span className={document.activeElement?.placeholder?.includes('address') ? 'text-brand-teal' : 'text-brand-navy/20'}>3. Address</span>
                    </div>
                    <div className="text-[8px] font-black text-brand-teal uppercase tracking-widest animate-pulse">
                       {document.activeElement?.placeholder?.includes('address') ? 'Press Enter to Finish' : 'Press Enter to Continue'}
                    </div>
                 </div>
               )}
          </div>
        </div>

          {/* Middle: Integrated Inputs */}
          <div className="flex-1 flex items-center gap-8 max-w-3xl">
              <div className="flex flex-col gap-1.5 flex-1">
                 <label className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] ml-1">Subject</label>
                 <input
                   type="text"
                   placeholder="Enter descriptive title..."
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   onBlur={() => syncHeader({ title: title.trim() })}
                   onKeyDown={e => {
                      if (e.key === "Enter") {
                         e.preventDefault();
                         itemTitleRef.current?.focus();
                      }
                   }}
                   ref={titleInputRef}
                   className={`w-full text-sm font-bold text-brand-navy outline-none border-b bg-transparent py-1 transition-all ${headerErrors.title ? 'border-red-400 focus:border-red-500' : 'border-brand-navy/10 focus:border-brand-teal'}`}
                  />
                  {headerErrors.title && <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter mt-1">{headerErrors.title[0]}</span>}
               </div>

              <div className="flex flex-col gap-1.5 w-28">
                 <label className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] ml-1">Status</label>
                 <select
                   value={status}
                   onChange={(e) => {
                     const newStatus = e.target.value;
                     setStatus(newStatus);
                     syncHeader({ status: newStatus });
                   }}
                   className="text-[10px] font-black text-brand-teal uppercase tracking-widest bg-zinc-50 border border-brand-navy/10 rounded-lg px-2 py-1.5 outline-none focus:border-brand-teal transition-all cursor-pointer"
                 >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                 </select>
              </div>

              <div className="flex flex-col gap-1.5 w-28 pl-4 border-l border-brand-navy/5">
                 <label className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] ml-1">Valid Till</label>
                 <input
                   type="date"
                   value={validUntil}
                   onChange={(e) => {
                     setValidUntil(e.target.value);
                     syncHeader({ validUntil: e.target.value || null });
                   }}
                   className="text-[10px] font-bold text-brand-navy outline-none bg-transparent py-1 transition-all"
                 />
              </div>
          </div>

          {/* Right: Identity Cluster */}
          <div className="flex items-center gap-6">
              
              <div className="flex items-center gap-3 pr-6 border-r border-brand-navy/10">
                 <BrandLogo className="w-9 h-9 shadow-sm rounded-lg" />
                 <div className="flex flex-col">
                    <div className="min-w-[100px] px-4 py-2 rounded-xl bg-brand-teal text-white shadow-[0_4px_14px_rgba(42,142,158,0.3)] flex items-center justify-center">
                       <span className="text-[11px] font-black tracking-[0.2em]">{quoteNumber || "DRAFT"}</span>
                    </div>
                    {createdBy && (
                       <div className="absolute -bottom-5 left-[50px] whitespace-nowrap text-[8px] font-black text-brand-teal uppercase tracking-widest opacity-60">
                          Owner: {createdBy.displayName || createdBy.name}
                       </div>
                    )}
                 </div>

              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-navy/10 bg-white text-brand-navy/60 hover:text-brand-teal hover:border-brand-teal transition-all shadow-sm group"
                title="Print Quotation"
              >
                <MdPrint className="w-4 h-4 group-hover:text-brand-teal" />
                <span className="text-[10px] font-black uppercase tracking-widest">Print</span>
              </button>
          </div>
      </section>

      {/* 2. Compact Calculator Bar */}
      <section id="calc-top" className="no-print border-b border-brand-navy/5 bg-white">
          {/* Tabs - Redesigned to be rounded and thematic */}
          <div className="px-6 py-2 bg-zinc-50/50 flex">
             <div className="flex bg-zinc-200/50 p-1 rounded-2xl border border-zinc-200/50">
                {TABS.map(t => (
                  <button
                   key={t.id}
                   onClick={() => setActiveTab(t.id)}
                   className={`flex items-center gap-2 px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeTab === t.id ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                  >
                    <span className="text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
             </div>
          </div>


          <div className="p-6">
            {activeTab === "laser" ? (
              <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left: Inputs */}
                  <div className="w-full lg:w-[450px] space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
                          <TextField 
                            label="Job Title" 
                            ref={itemTitleRef}
                            onKeyDown={e => {
                               if (e.key === "Enter") {
                                  e.preventDefault();
                                  laserSizeRef.current?.focus();
                               }
                            }}
                            placeholder="e.g. Notice, Poster..." 
                            value={itemTitle} 
                            onChange={e => setItemTitle(e.target.value)} 
                          />
                          <SearchableSelect
                             label="Press Size"
                             options={laserSizeOptions}
                             value={laserSizeId}
                             placeholder="Search Size Chart..."
                             onChange={e => {
                               const newVal = e.target.value;
                               setLaserSizeId(newVal);
                               if (newVal === 'custom') {
                                 setTimeout(() => customWidthRef.current?.focus(), 100);
                               } else {
                                 setTimeout(() => laserStockRef.current?.focus(), 100);
                               }
                             }}
                             ref={laserSizeRef}
                           />


                          {laserSizeId === 'custom' && (
                            <div className="p-5 bg-brand-teal/5 h-16 rounded-2xl border border-brand-teal/10 flex items-center gap-4 animate-slide-down">
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Width"
                                    ref={customWidthRef}
                                    onKeyDown={e => {
                                       if (e.key === "Enter") {
                                          e.preventDefault();
                                          customBreadthRef.current?.focus();
                                       }
                                    }}
                                    value={customWidth}
                                    onChange={e => setCustomWidth(e.target.value)}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <span className="text-[10px] font-black text-brand-navy/20">×</span>
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Breadth"
                                    ref={customBreadthRef}
                                    onKeyDown={e => {
                                       if (e.key === "Enter") {
                                          e.preventDefault();
                                          laserStockRef.current?.focus();
                                       }
                                    }}
                                    value={customBreadth}
                                    onChange={e => setCustomBreadth(e.target.value)}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <div className="w-16">
                                  <select
                                    value={customUnit}
                                    onChange={e => setCustomUnit(e.target.value)}
                                    className="w-full bg-transparent outline-none text-[10px] font-black text-brand-teal uppercase tracking-widest cursor-pointer"
                                  >
                                     <option value="mm">mm</option>
                                     <option value="cm">cm</option>
                                     <option value="inch">in</option>
                                  </select>
                               </div>
                            </div>
                          )}

                          <SearchableSelect
                             label="Paper / Stock"
                             options={laserStockOptions}
                             value={laserStockItemId}
                             placeholder="Search Inventory..."
                             onChange={e => {
                               setLaserStockItemId(e.target.value);
                               setTimeout(() => laserCopiesRef.current?.focus(), 100);
                             }}
                             onSearch={fetchLaserStocks}
                             ref={laserStockRef}
                           />

                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <TextField 
                              label="No of Copies" 
                              type="number" 
                              value={laserCopies} 
                              onChange={e => setLaserCopies(e.target.value)} 
                              ref={laserCopiesRef}
                              onKeyDown={e => {
                                 if (e.key === "Enter") {
                                    e.preventDefault();
                                    // Add logic to save if possible, or just focus save button
                                    const saveBtn = document.getElementById('save-line-item');
                                    saveBtn?.click();
                                 }
                              }}
                           />
                           <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Charge Method</label>
                              <div className="flex bg-zinc-50 p-1 rounded-xl border border-brand-navy/5 h-11">
                                 {[
                                   { id: true, label: "Printing Only" },
                                   { id: false, label: "Slab Charge" }
                                 ].map(m => (
                                   <button
                                     key={m.label}
                                     onClick={() => setIsOnlyClipCharge(m.id)}
                                     className={`flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isOnlyClipCharge === m.id ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                                   >
                                     {m.label}
                                   </button>
                                 ))}
                              </div>
                           </div>
                      </div>

                   
                      <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                             <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Colour Mode</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-brand-navy/5">
                                {['COLOR', 'BW'].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setLaserColorMode(m)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${laserColorMode === m ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                                  >
                                    {m === 'BW' ? 'B&W' : 'Multicolor'}
                                  </button>
                                ))}
                             </div>
                          </div>
                          <div className="flex-1 space-y-2">
                             <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Sides</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-brand-navy/5">
                                {['SINGLE', 'DOUBLE'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setLaserSides(s)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${laserSides === s ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                                  >
                                    {s === 'SINGLE' ? 'Front Only' : 'Front & Back'}
                                  </button>
                                ))}
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Pricing Preview */}
                  <div className={`flex-1 rounded-2xl border-2 p-6 min-h-[300px] flex flex-col relative transition-all duration-300 ${!!editingLineId ? 'bg-brand-teal/5 border-solid border-brand-teal' : 'bg-zinc-50/50 border-dashed border-brand-navy/10'}`}>
                       <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <MdOutlineAnalytics className="w-5 h-5 text-brand-teal" />
                             <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest">
                                {!!editingLineId ? "Editing Line Item" : "Printer Options"}
                             </h3>
                          </div>
                          {laserLoading && <div className="w-4 h-4 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>}
                       </div>

                      {laserError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{laserError}</p>
                        </div>
                      ) : laserPricingOptions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-8 space-y-3 grayscale">
                           <MdComputer className="w-12 h-12" />
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">Select dimensions and stock to see machine comparisons</p>
                        </div>
                      ) : (
                         <div className="flex-1 flex flex-col">
                           <div className="space-y-3 overflow-y-auto no-scrollbar max-h-[350px] flex-1 pb-4">
                               {laserPricingOptions.map((opt, idx) => {
                                 const isPrintable = opt.isPrintable !== false;
                                 const isSelected = selectedLaserOption && 
                                                    selectedLaserOption.printerModelId === opt.printerModelId && 
                                                    selectedLaserOption.pricing.total === opt.pricing.total &&
                                                    selectedLaserOption.prints === opt.prints;
                                 const feedKind = opt.layout?.paperFeed?.kind || "FULL";
                                 
                                 return (
                                   <div
                                    key={idx}
                                    onClick={() => isPrintable && setSelectedLaserOption(opt)}
                                    className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between group cursor-pointer transition-all ${!isPrintable ? 'opacity-50 grayscale bg-zinc-50 border-red-100 cursor-not-allowed' : (isSelected ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/[0.02]' : 'hover:border-brand-teal/40 border-brand-navy/5')}`}
                                   >
                                      <div className="flex-1">
                                         <div className="text-xs font-black text-brand-navy flex items-center gap-2">
                                            {opt.printerModelName}
                                            {idx === 0 && isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-brand-mint text-brand-teal rounded uppercase tracking-tighter">Best Value</span>}
                                            {!isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded uppercase tracking-tighter shadow-sm">Non-Printable</span>}
                                         </div>
                                         <div className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-tight mt-1 flex flex-wrap items-center gap-x-2">
                                            {isPrintable ? (
                                              <>
                                                <span>{opt.pricing.kind} Charge</span>
                                                <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                <span>{opt.prints} Prints</span>
                                                <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                <span>{opt.sheets} {feedKind === "PORTIONED" ? "Portions" : "Sheets"}</span>
                                              </>
                                            ) : (
                                              <span className="text-red-500/60 font-black">{opt.unprintableReason?.replace(/_/g, ' ') || 'Geometric Constraint'}</span>
                                            )}
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                         {opt.layout && isPrintable && (
                                           <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewingLayoutOption(opt);
                                            }}
                                            className="p-2 text-brand-teal font-black text-[9px] uppercase tracking-widest hover:bg-brand-teal/10 rounded-lg transition-all"
                                           >
                                              Inspect
                                           </button>
                                         )}
                                         <div className="text-right min-w-[70px]">
                                            <div className="text-lg font-black text-brand-navy">
                                               {isPrintable ? `₹${opt.pricing.total.toLocaleString()}` : '--'}
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                 );
                               })}
                           </div>

                           {/* Global Add/Update Button */}
                           {selectedLaserOption && (
                             <div className="mt-4 pt-4 border-t border-brand-navy/5 animate-fade-in px-2 flex gap-3">
                                {editingLineId && (
                                  <button
                                    onClick={resetCalculator}
                                    className="px-4 text-[10px] font-black uppercase tracking-widest text-brand-navy/30 hover:text-red-400 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <PrimaryButton
                                  onClick={async () => {
                                    console.log("Save Clicked - Editing ID:", editingLineId);
                                    const opt = selectedLaserOption;
                                    const selPaper = stockItemList.find(s => s.id === laserStockItemId);
                                    
                                    let sizeName = "Custom Laser";
                                    if (laserSizeId === 'custom') {
                                      sizeName = `Custom (${customWidth}x${customBreadth}${customUnit})`;
                                    } else {
                                      const selSize = sizeList.find(s => s.id === laserSizeId);
                                      sizeName = selSize ? `${selSize.name}` : "Standard Laser";
                                    }

                                    const newLineItem = {
                                      id: editingLineId || Date.now(),
                                      lineKind: "PRINTING",
                                      title: itemTitle || sizeName,
                                      description: `LSR • ${itemTitle ? sizeName + ' • ' : ''}${laserSides} • ${laserColorMode} • ${selPaper?.name || 'Standard'}`,
                                      quantity: Number(laserCopies),


                                      meta: {
                                        itemTitle,
                                        laserStockItemId, laserSizeId, customWidth, customBreadth, customUnit,

                                        laserSides, laserColorMode, laserCopies,
                                        isOnlyClipCharge, 
                                        printerModelId: opt.printerModelId,
                                        printerModelName: opt.printerModelName,
                                        layout: opt.layout
                                      },
                                      chargeComponents: [
                                        {
                                          role: "printing",
                                          label: opt.printerModelName,
                                          amount: opt.pricing.total,
                                          unitPrice: opt.pricing.perPrintCharge,
                                          quantity: opt.prints,
                                          printerModelId: opt.printerModelId,
                                          meta: opt.pricing
                                        }
                                      ]
                                    };

                                    let newList;
                                    const targetIdStr = editingLineId ? String(editingLineId) : null;
                                    
                                    if (targetIdStr) {
                                       console.log("Updating existing item with ID:", targetIdStr);
                                       newList = lineItems.map(item => {
                                         const itemIdStr = String(item.id || item._id || "");
                                         return itemIdStr === targetIdStr ? newLineItem : item;
                                       });
                                    } else {
                                       console.log("Adding new item to list");
                                       newList = [...lineItems, newLineItem];
                                    }

                                    await syncLineItems(newList);
                                    resetCalculator();
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2"
                                >
                                   {!!editingLineId ? <MdCheckCircle className="w-4 h-4 ml-[-8px]" /> : <MdAdd className="w-4 h-4 ml-[-8px]" />}
                                   {!!editingLineId ? "Update Line Item" : "Add to Quotation"}
                                </PrimaryButton>
                             </div>
                           )}
                         </div>
                      )}
                  </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
                  {/* Left: Inputs */}
                  <div className="w-full lg:w-[450px] space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
                          <TextField 
                            label="Job Title" 
                            placeholder="e.g. Notice, Poster..." 
                            value={itemTitle} 
                            onChange={e => setItemTitle(e.target.value)} 
                          />
                          <SearchableSelect
                            label="Print Size"
                            options={offsetSizeOptions}
                            value={offsetSizeId}
                            placeholder="Search Size Chart..."
                            onChange={e => setOffsetSizeId(e.target.value)}
                          />


                          {offsetSizeId === 'custom' && (
                            <div className="p-5 bg-brand-teal/5 h-16 rounded-2xl border border-brand-teal/10 flex items-center gap-4 animate-slide-down">
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Width"
                                    value={customWidth}
                                    onChange={e => setCustomWidth(e.target.value)}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <span className="text-[10px] font-black text-brand-navy/20">×</span>
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Breadth"
                                    value={customBreadth}
                                    onChange={e => setCustomBreadth(e.target.value)}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <div className="w-16">
                                  <select
                                    value={customUnit}
                                    onChange={e => setCustomUnit(e.target.value)}
                                    className="w-full bg-transparent outline-none text-[10px] font-black text-brand-teal uppercase tracking-widest cursor-pointer"
                                  >
                                     <option value="mm">mm</option>
                                     <option value="cm">cm</option>
                                     <option value="inch">in</option>
                                  </select>
                               </div>
                            </div>
                          )}

                          <SearchableSelect
                            label="Paper / Stock"
                            options={offsetStockOptions}
                            value={offsetStockItemId}
                            placeholder="Search Inventory..."
                            onChange={e => setOffsetStockItemId(e.target.value)}
                            onSearch={fetchOffsetStocks}
                          />
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                          <TextField label="Copies" type="number" value={offsetCopies} onChange={e => setOffsetCopies(e.target.value)} />
                          <TextField label="Waste Imp." type="number" value={offsetWaste} onChange={e => setOffsetWaste(e.target.value)} />
                          <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Sides</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-brand-navy/5 h-11">
                                {['SINGLE', 'DOUBLE'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setOffsetSides(s)}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${offsetSides === s ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                                  >
                                    {s === 'SINGLE' ? 'Front' : 'F&B'}
                                  </button>
                                ))}
                             </div>
                          </div>
                          {offsetSides === 'DOUBLE' && (
                             <div className="flex flex-col gap-2 animate-fade-in">
                                <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Diff Content?</label>
                                <button
                                  onClick={() => setOffsetIsBackSideDifferent(!offsetIsBackSideDifferent)}
                                  className={`h-11 rounded-xl border flex items-center justify-center transition-all ${offsetIsBackSideDifferent ? 'bg-brand-mint/10 border-brand-mint text-brand-teal' : 'bg-white border-brand-navy/10 text-brand-navy/40'}`}
                                  title="Check if back side content is different (requires 2 plate sets)"
                                >
                                   <span className="text-[10px] font-black uppercase tracking-tighter">{offsetIsBackSideDifferent ? 'Yes (2 Plates)' : 'No (1 Plate)'}</span>
                                </button>
                             </div>
                          )}
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Colour Mode</label>
                         <div className="flex flex-wrap bg-zinc-50 p-1 rounded-xl border border-brand-navy/5">
                            {['Single', 'Two Colour', 'Three Colour', 'Multi'].map(m => (
                              <button
                                key={m}
                                onClick={() => setOffsetColorMode(m)}
                                className={`flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all whitespace-nowrap ${offsetColorMode === m ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                              >
                                {m}
                              </button>
                            ))}
                         </div>
                      </div>
                  </div>

                  {/* Right: Results Mirror Laser pattern */}
                  <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 rounded-[2rem] border border-brand-navy/5 p-6 relative overflow-hidden">
                       <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20">
                                 <MdOutlineAnalytics className="w-4 h-4" />
                              </div>
                              <h3 className="text-[11px] font-black text-brand-navy uppercase tracking-[0.2em]">
                                 {!!editingLineId ? "Editing Offset Item" : "Offset Comparisons"}
                              </h3>
                              <button 
                                  onClick={() => setShowOffsetHelp(true)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-mint text-brand-teal transition-all ml-1 hover:scale-110 active:scale-95 shadow-sm relative group"
                                  title="Understand Offset Calculation Logic"
                               >
                                  <div className="absolute inset-0 rounded-full bg-brand-teal/20 animate-pulse group-hover:hidden" />
                                  <MdHelpOutline className="w-4 h-4 relative z-10" />
                               </button>
                           </div>
                           {offsetLoading && <div className="w-4 h-4 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>}
                       </div>

                      {offsetError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{offsetError}</p>
                        </div>
                      ) : offsetPricingOptions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-8 space-y-3 grayscale">
                           <MdPrint className="w-12 h-12" />
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">Select dimensions and offset stock to see machine comparisons</p>
                        </div>
                      ) : (
                         <div className="flex-1 flex flex-col">
                            <div className="space-y-3 overflow-y-auto no-scrollbar max-h-[350px] flex-1 pb-4">
                                {offsetPricingOptions.map((opt, idx) => {
                                  const isPrintable = opt.isPrintable !== false;
                                  const isSelected = selectedOffsetOption && 
                                                     selectedOffsetOption.printerModelId === opt.printerModelId && 
                                                     selectedOffsetOption.pricing.total === opt.pricing.total;
                                  
                                  return (
                                    <div
                                     key={idx}
                                     onClick={() => isPrintable && setSelectedOffsetOption(opt)}
                                     className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between group cursor-pointer transition-all ${!isPrintable ? 'opacity-50 grayscale bg-zinc-50 border-red-100 cursor-not-allowed' : (isSelected ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/[0.02]' : 'hover:border-brand-teal/40 border-brand-navy/5')}`}
                                    >
                                       <div className="flex-1">
                                          <div className="text-xs font-black text-brand-navy flex items-center gap-2">
                                             {opt.printerModelName}
                                             {idx === 0 && isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-brand-mint text-brand-teal rounded uppercase tracking-tighter">Best Match</span>}
                                             {!isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded uppercase tracking-tighter shadow-sm">Geometric Error</span>}
                                          </div>
                                          <div className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-tight mt-1 flex flex-wrap items-center gap-x-2">
                                             {isPrintable ? (
                                               <>
                                                 <span>{opt.piecesPerSheet} Up</span>
                                                 <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                 <span>{opt.parentSheets} Parent Sheets</span>
                                                 <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                 <span>{opt.impressionsBilled?.toLocaleString()} Imps</span>

                                                 {/* Price Breakdown Footer */}
                                                 {opt.pricing.chargeComponents?.length > 0 && (
                                                   <div className="w-full mt-2 pt-2 border-t border-brand-navy/5 flex flex-wrap gap-x-4 gap-y-1">
                                                      {opt.pricing.chargeComponents.map(c => (
                                                        <div key={c.role} className="flex items-center gap-1.5">
                                                           <span className="text-[8px] font-black uppercase text-brand-navy/20 tracking-tighter">{c.role === 'printing' ? 'Print' : 'Paper'} :</span>
                                                           <span className={`text-[9px] font-black ${c.role === 'printing' ? 'text-brand-navy/60' : 'text-brand-teal'}`}>₹{c.amount.toLocaleString()}</span>
                                                        </div>
                                                      ))}
                                                   </div>
                                                 )}
                                               </>
                                             ) : (
                                               <span className="text-red-500/60 font-black">{opt.unprintableReason?.replace(/_/g, ' ') || 'Geometric Constraint'}</span>
                                             )}
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                          {opt.layout && isPrintable && (
                                            <button
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setPreviewingLayoutOption(opt);
                                             }}
                                             className="p-2 text-brand-teal font-black text-[9px] uppercase tracking-widest hover:bg-brand-teal/10 rounded-lg transition-all"
                                            >
                                               Inspect
                                            </button>
                                          )}
                                          <div className="text-right min-w-[70px]">
                                             <div className="text-lg font-black text-brand-navy">
                                                {isPrintable ? `₹${opt.pricing.total.toLocaleString()}` : '--'}
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Offset Save Button */}
                            {selectedOffsetOption && (
                              <div className="mt-4 pt-4 border-t border-brand-navy/5 animate-fade-in px-2 flex gap-3">
                                 {editingLineId && (
                                   <button
                                     onClick={resetCalculator}
                                     className="px-4 text-[10px] font-black uppercase tracking-widest text-brand-navy/30 hover:text-red-400 transition-colors"
                                   >
                                     Cancel
                                   </button>
                                 )}
                                 <PrimaryButton
                                   id="save-line-item"
                                   onClick={async () => {
                                     const opt = selectedOffsetOption;
                                     const selPaper = stockItemList.find(s => s.id === offsetStockItemId);
                                     
                                     let sizeName = "Custom Offset";
                                      if (offsetSizeId === 'custom') {
                                        sizeName = `Custom (${customWidth}x${customBreadth}${customUnit})`;
                                      } else {
                                        const selSize = sizeList.find(s => s.id === offsetSizeId);
                                        sizeName = selSize ? `${selSize.name}` : "Standard Offset";
                                      }

                                     const newLineItem = {
                                       id: editingLineId || Date.now(),
                                       lineKind: "PRINTING",
                                       title: itemTitle || sizeName,
                                       description: `OFST • ${itemTitle ? sizeName + ' • ' : ''}${offsetSides} • ${offsetColorMode} • ${selPaper?.name || 'Standard'}`,
                                       quantity: Number(offsetCopies),


                                       meta: {
                                         itemTitle,
                                         offsetStockItemId, offsetSizeId, customWidth, customBreadth, customUnit,

                                         offsetSides, offsetIsBackSideDifferent, offsetColorMode, offsetCopies, offsetWaste,
                                         printerModelId: opt.printerModelId,
                                         printerModelName: opt.printerModelName,
                                         layout: opt.layout
                                       },
                                       chargeComponents: opt.pricing.chargeComponents ? opt.pricing.chargeComponents.map(c => ({
                                         ...c,
                                         printerModelId: opt.printerModelId,
                                         label: c.role === 'printing' ? opt.printerModelName : 'Paper Stock'
                                       })) : [
                                         {
                                           role: "printing",
                                           label: opt.printerModelName,
                                           amount: opt.pricing.total,
                                           unitPrice: opt.pricing.total / (Number(offsetCopies) || 1),
                                           quantity: opt.impressionsBilled,
                                           printerModelId: opt.printerModelId,
                                           meta: opt.pricing
                                         }
                                       ]
                                     };

                                     let newList;
                                     const targetIdStr = editingLineId ? String(editingLineId) : null;
                                     if (targetIdStr) {
                                        newList = lineItems.map(item => {
                                          const itemIdStr = String(item.id || item._id || "");
                                          return itemIdStr === targetIdStr ? newLineItem : item;
                                        });
                                     } else {
                                        newList = [...lineItems, newLineItem];
                                     }

                                     await syncLineItems(newList);
                                     resetCalculator();
                                   }}
                                   className="flex-1 flex items-center justify-center gap-2"
                                 >
                                    {!!editingLineId ? <MdCheckCircle className="w-4 h-4 ml-[-8px]" /> : <MdAdd className="w-4 h-4 ml-[-8px]" />}
                                    {!!editingLineId ? "Update Line Item" : "Add to Quotation"}
                                 </PrimaryButton>
                              </div>
                            )}
                         </div>
                      )}
                  </div>
                </div>
            )}
          </div>
      </section>


      {/* 3. High-Density Preview Area */}
      <section className="flex-1 bg-[#F1F4F9] p-4 lg:p-6">
          <div className="w-full h-full bg-white rounded-xl shadow-inner border border-brand-navy/5 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-4">
                 {lineItems.length === 0 ? (
                   <div className="h-full flex items-center justify-center">
                      <div className="text-center opacity-10">
                         <BrandLogo className="w-32 h-32 mx-auto grayscale mb-4" />
                         <span className="text-xs font-black uppercase tracking-[0.4em]">Preview Workspace</span>
                      </div>
                   </div>
                 ) : (
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-brand-navy/10">
                            <th className="py-1.5 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest pl-4">#</th>
                            <th className="py-1.5 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest text-left">Desc / Spec</th>
                            <th className="py-1.5 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Qty</th>
                            <th className="py-1.5 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest text-right pr-4 tracking-tighter">Total</th>
                            <th className="no-print py-1.5 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest text-right pr-4 tracking-tighter">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                        {lineItems.map((item, idx) => {
                          const lineTotal = item.chargeComponents?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0;
                          return (
                            <tr key={item.id || item._id} className="group hover:bg-zinc-50 transition-colors">
                              <td className="py-1.5 pl-4 text-xs font-black text-brand-navy/20 tabular-nums">{idx + 1}</td>
                              <td className="py-1.5">
                                 <div className="text-xs font-bold text-brand-navy underline decoration-brand-teal/20 offset-4">
                                    {item.meta?.itemTitle || 'N/A'}
                                 </div>


                                 <div className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-tight mt-1 flex flex-col">
                                    <span>{item.description}</span>
                                    {item.chargeComponents?.length > 1 && (


                                      <div className="flex gap-2 mt-1 lowercase italic font-black text-[9px] text-brand-teal/60">
                                        {item.chargeComponents.map((c, cIdx) => (
                                          <span key={cIdx}>
                                            {c.role?.substring(0, 4)}: ₹{c.amount?.toLocaleString()}
                                            {cIdx < item.chargeComponents.length - 1 && <span className="ml-1 opacity-20">+</span>}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                 </div>
                              </td>
                              <td className="py-4 text-xs font-black text-brand-navy/60">{item.quantity}</td>
                              <td className="py-4 pr-4">
                                 <div className="flex items-center justify-end">
                                    <span className="text-xs font-black text-brand-navy">{currency} {lineTotal.toLocaleString()}</span>
                                 </div>
                              </td>
                              <td className="no-print py-4 pr-4">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                      onClick={() => handleEditLineItem(item)}
                                      className="p-1.5 rounded-lg bg-brand-mint/30 text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-sm"
                                    >
                                       <MdEdit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLineItem(item.id || item._id)}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                       <MdDeleteOutline className="w-3.5 h-3.5" />
                                    </button>
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                 )}
              </div>

              {/* Summary Bar - Refined: No BG color, integrated Print button */}
              <div className="p-8 bg-white flex items-center justify-between border-t border-brand-navy/5">
                  <div className="flex items-center gap-12">
                     <button
                       onClick={() => window.print()}
                       className="no-print flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-brand-navy/5 bg-zinc-50 text-brand-navy/40 hover:text-brand-teal hover:border-brand-teal/30 transition-all font-black uppercase tracking-widest shadow-sm"
                     >
                        <MdPrint className="w-5 h-5" />
                        <span className="text-[11px]">Print Quotation</span>
                     </button>

                     <div className="flex gap-10">
                        <div>
                           <div className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] mb-1.5">Line Items</div>
                           <div className="text-xl font-black text-brand-navy">{lineItems.length}</div>
                        </div>
                        <div>
                           <div className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em] mb-1.5">Quote Status</div>
                           <div className="flex">
                              <span className="text-[10px] font-black uppercase bg-brand-mint text-brand-teal px-3 py-1 rounded-full border border-brand-teal/10">{status}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="text-right">
                      <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em] mb-2">Grand Total</div>
                      <div className="text-4xl font-black text-brand-navy flex items-center justify-end gap-3">
                        <span className="text-[14px] text-brand-navy/20 font-bold uppercase tracking-widest mt-1.5">{currency}</span>
                        {lineItems.reduce((acc, curr) => {
                          const itemTotal = curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0;
                          return acc + itemTotal;
                        }, 0).toLocaleString()}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 4. New Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-md" onClick={() => !busy && setShowNewCustModal(false)}></div>
           <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-fade-in">
              <div className="p-8 border-b border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20"><MdPersonAdd className="w-6 h-6"/></div>
                    <div>
                       <h2 className="text-xl font-black text-brand-teal leading-none mb-1">New Customer</h2>
                       <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">Register and link to this quote</p>
                    </div>
                 </div>
                 <button onClick={() => setShowNewCustModal(false)} className="text-brand-navy/40 hover:bg-zinc-100 p-2 rounded-full transition-colors"><MdClose className="w-5 h-5"/></button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[60vh]">
                 {newCustError && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> {newCustError}</div>}

                 <TextField label="Customer Name" placeholder="e.g. Rahul Sharma" value={newCustName} onChange={e => setNewCustName(e.target.value)} disabled={busy} error={newCustFieldErrors.name?.[0]} />

                 <div className="grid grid-cols-2 gap-4">
                    <TextField label="Company Name" placeholder="Optional" value={newCustCompany} onChange={e => setNewCustCompany(e.target.value)} disabled={busy} error={newCustFieldErrors.companyName?.[0]} />
                    <TextField label="Tax ID / GST" placeholder="Optional" value={newCustTaxId} onChange={e => setNewCustTaxId(e.target.value)} disabled={busy} error={newCustFieldErrors.taxId?.[0]} />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <TextField label="Primary Email" placeholder="client@example.com" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} disabled={busy} error={newCustFieldErrors.email?.[0]} />
                    <TextField label="Contact Phone" placeholder="+91..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} disabled={busy} error={newCustFieldErrors.phone?.[0]} />
                 </div>

                 <div className="space-y-4 pt-4 border-t border-brand-navy/5">
                    <h3 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest leading-none mb-4">Billing Address</h3>
                    <TextField label="Address Line 1" value={newCustAddress.line1} onChange={e => setNewCustAddress({...newCustAddress, line1: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.line1?.[0]} />
                    <div className="grid grid-cols-2 gap-4">
                       <TextField label="City" value={newCustAddress.city} onChange={e => setNewCustAddress({...newCustAddress, city: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.city?.[0]} />
                       <TextField label="Region / State" value={newCustAddress.region} onChange={e => setNewCustAddress({...newCustAddress, region: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.region?.[0]} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <TextField label="Postal Code" value={newCustAddress.postalCode} onChange={e => setNewCustAddress({...newCustAddress, postalCode: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.postalCode?.[0]} />
                       <TextField label="Country" value={newCustAddress.country} onChange={e => setNewCustAddress({...newCustAddress, country: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.country?.[0]} />
                    </div>
                 </div>
              </div>


              <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex justify-end gap-3">
                 <button onClick={() => setShowNewCustModal(false)} className="px-6 py-3 text-[10px] font-black text-brand-navy/30 hover:text-brand-navy transition-all uppercase tracking-widest">Cancel</button>
                 <PrimaryButton onClick={handleCreateNewCustomer} disabled={busy}>{busy ? "Registering..." : "Create & Link"}</PrimaryButton>
              </div>
           </div>
        </div>
      )}
      {/* 5. Layout Inspection Drawer */}
      {previewingLayoutOption && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
           <div
            className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md"
            onClick={() => setPreviewingLayoutOption(null)}
           />
           <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-slide-left border-l border-brand-navy/10">
              {/* Drawer Header */}
              <div className="p-8 border-b border-brand-navy/5 flex items-center justify-between bg-zinc-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20">
                       <MdOutlineAnalytics className="w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-bold text-brand-navy leading-none mb-1">Layout Inspection</h2>
                       <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">{previewingLayoutOption.printerModelName}</p>
                    </div>
                 </div>
                 <button
                  onClick={() => setPreviewingLayoutOption(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy/30 hover:bg-zinc-100 hover:text-brand-navy transition-all"
                 >
                    <MdClose className="w-6 h-6" />
                 </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                 <PaperLayoutPreview
                   layout={previewingLayoutOption.layout}
                   piecesRequested={previewingLayoutOption.piecesRequested}
                   sheets={previewingLayoutOption.sheets}
                   parentSheets={previewingLayoutOption.parentSheets}
                   prints={previewingLayoutOption.prints}
                   piecesPerSheet={previewingLayoutOption.piecesPerSheet}
                   printerName={previewingLayoutOption.printerModelName}
                   totalPrice={previewingLayoutOption.pricing?.total}
                   currency={currency}
                 />
              </div>

              {/* Drawer Footer */}
               <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex justify-end">
                  <PrimaryButton
                   onClick={() => setPreviewingLayoutOption(null)}
                   className="px-10 py-3 text-[10px] font-black transition-all uppercase tracking-widest shadow-lg shadow-brand-teal/20"
                  >
                     Close Inspection
                  </PrimaryButton>
               </div>
           </div>
        </div>
      )}

       {/* Offset Help Drawer */}
       {showOffsetHelp && (
           <div className="fixed inset-0 z-[100] flex justify-end">
               <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setShowOffsetHelp(false)}></div>
               <div className="w-[450px] bg-white h-full shadow-2xl relative z-10 animate-slide-left p-0 flex flex-col">
                   <div className="p-8 border-b border-brand-navy/5 flex items-center justify-between bg-zinc-50/50">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20">
                            <MdInfo className="w-6 h-6" />
                         </div>
                         <div className="flex flex-col">
                            <h2 className="text-xl font-black text-brand-teal uppercase tracking-tighter leading-none">Offset Calculation Guide</h2>
                            <span className="text-[9px] font-bold text-brand-teal uppercase tracking-widest mt-1">Pricing & Logic Blueprint</span>
                       </div>
                      </div>
                      <button onClick={() => setShowOffsetHelp(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-navy/20 hover:text-brand-navy hover:bg-zinc-100 transition-all">
                         <MdClose className="w-5 h-5" />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-12 pb-24">
                      {/* Section 1: The Master Formula */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-brand-teal uppercase tracking-[0.2em]">01. The Master Formula</h3>
                         <div className="p-6 bg-brand-teal text-white rounded-3xl space-y-4 relative overflow-hidden shadow-xl shadow-brand-teal/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/20 rounded-full blur-3xl -mr-12 -mt-12" />
                            <div className="text-3xl font-black tracking-tighter flex items-baseline gap-2">
                               ₹ <span className="text-brand-teal">Total</span>
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
                         <h3 className="text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.2em]">02. Material (Paper Sheets)</h3>
                         <div className="p-5 bg-zinc-50 rounded-2xl border border-brand-navy/5 space-y-4">
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[10px] font-black flex-shrink-0">A</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-brand-navy uppercase tracking-tighter">Sheets for Pieces</div>
                                  <p className="text-[11px] text-brand-navy/60 font-medium leading-normal">
                                     Pieces per machine sheet (e.g., 4-up layout). 100 copies = 25 machine sheets.
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[10px] font-black flex-shrink-0">B</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-brand-navy uppercase tracking-tighter">Waste Sheets</div>
                                  <p className="text-[11px] text-brand-navy/60 font-medium leading-normal">
                                     Setup impressions added for ink balancing (Example: 25 pieces + 2 waste = 27 sheets).
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-6 h-6 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[10px] font-black flex-shrink-0">C</div>
                               <div className="space-y-1">
                                  <div className="text-[10px] font-black text-brand-navy uppercase tracking-tighter">Portioning (Parent Sheets)</div>
                                  <p className="text-[11px] text-brand-navy/60 font-medium leading-normal">
                                     If the machine sheet is cut from a larger stock (e.g., 1/4 size), we divide total sheets by the portion to find the billed <strong>Full Sheets</strong>.
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Section 3: Machine Setup (Plates) */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.2em]">03. Machine Run (Logic)</h3>
                         <div className="p-5 bg-brand-mint/50 rounded-2xl border border-brand-teal/10 relative overflow-hidden space-y-6">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                               <MdLayers className="w-12 h-12 text-brand-teal" />
                            </div>
                            
                            <div className="space-y-2">
                               <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">A. Plate Set Multiplier</div>
                               <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-brand-teal/5">
                                     <span className="text-[11px] font-bold text-brand-navy">Single Side</span>
                                     <span className="text-[11px] font-black text-brand-teal">1 Set</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-brand-teal/5">
                                     <span className="text-[11px] font-bold text-brand-navy">Double (Same Back)</span>
                                     <span className="text-[11px] font-black text-brand-teal">1 Set</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-brand-teal text-white p-2 rounded-lg shadow-sm">
                                     <span className="text-[11px] font-bold">Double (Diff Back)</span>
                                     <span className="text-[11px] font-black">2 Sets</span>
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-brand-teal/10">
                               <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">B. Billed Impressions</div>
                               <div className="p-3 bg-white/40 rounded-xl space-y-2 text-[11px] font-medium text-brand-navy/70 italic">
                                  <div>Sheets Billed = (Copies / PiecesPerSheet) + Waste</div>
                                  <div>Total Imp. = Sheets Billed × (2 for Double, else 1)</div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Section 4: Bulk Threshold Boundary */}
                      <div className="space-y-4">
                         <h3 className="text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.2em]">04. Bulk Threshold Boundary</h3>
                         <div className="p-6 bg-brand-mint text-brand-teal rounded-3xl relative overflow-hidden border border-brand-teal/20">
                            <div className="text-sm font-black mb-1 uppercase tracking-tighter">The "Inclusive Switch"</div>
                            <p className="text-[10px] font-bold opacity-60 mb-6 uppercase tracking-widest leading-none">Status based on Billed Impressions</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <div className="text-[10px] font-black text-red-500 uppercase">Standard</div>
                                  <div className="text-[9px] font-bold opacity-60 leading-tight">Minimum Fee +<br/>Setup + Extra Steps</div>
                               </div>
                               <div className="space-y-2 text-right">
                                  <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Bulk Applied</div>
                                  <div className="text-[9px] font-bold opacity-60 leading-tight">Setup +<br/>Volume Step Only</div>
                               </div>
                            </div>
                            
                            <div className="mt-4 h-1.5 bg-brand-teal/10 rounded-full relative">
                               <div className="absolute top-1/2 left-[50%] w-4 h-4 bg-white border-2 border-brand-teal rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md flex items-center justify-center group">
                                  <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
                                  <div className="absolute top-full mt-2 bg-brand-navy text-white text-[8px] font-black px-2 py-1 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                     Threshold (e.g. 10k)
                                  </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 space-y-3">
                               <div className="p-3 bg-white/60 rounded-xl border border-brand-teal/10">
                                  <div className="text-[9px] font-black uppercase text-brand-navy/40 mb-1 text-center">Boundary Comparison (Example)</div>
                                  <div className="flex items-center justify-between text-[11px]">
                                     <span className="font-bold">9,999 Imp. <span className="opacity-30">(Standard)</span></span>
                                     <span className="font-black text-red-500">₹ 3,800</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-brand-teal/5">
                                     <span className="font-bold text-brand-teal">10,000 Imp. <span className="opacity-30">(Bulk)</span></span>
                                     <span className="font-black text-brand-teal">₹ 3,500</span>
                                  </div>
                               </div>
                               <p className="text-[9px] leading-relaxed font-bold opacity-60 italic">
                                  Final Price drops at the threshold because the "Minimum Charge" is waived (Bulk Policy: Extra Charge Only). Boundary is <strong>inclusive</strong> (≥).
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex flex-col gap-1">
                      <div className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Need more detail?</div>
                      <div className="text-[11px] font-medium text-brand-navy/40">The machine rates shown are final calculations based on the printer's current tiered configuration.</div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}


function CompactInput({ label, value, onChange, isAmount = false }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[100px]">
       <label className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">{label}</label>
       <input
        type="text"
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-10 px-4 rounded-xl border border-brand-navy/10 text-xs font-bold text-brand-navy outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/5 transition-all shadow-sm ${isAmount ? 'bg-zinc-50 border-brand-teal/20' : 'bg-white'}`}
       />
    </div>
  );
}
