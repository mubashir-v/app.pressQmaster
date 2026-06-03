import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getQuotation, createQuotation, updateQuotation, getCustomers, createCustomer,
  getLaserQuoteOptions, getSizeCharts, getStockItems, getLaserPaperStocks,
  getOffsetQuoteOptions, getOffsetPaperStocks, getBrochureLaserQuoteOptions
} from "../../../infrastructure/api/backendService.js";


import BrandLogo from "../../components/logo/BrandLogo.jsx";
import { MdAdd, MdClose, MdContentCopy, MdDeleteOutline, MdLayers, MdArrowBack, MdEdit, MdCheckCircle, MdPrint, MdOutlineAnalytics, MdWarningAmber, MdPrint as MdPrintIcon, MdComputer, MdPersonAdd, MdBusiness, MdPhone, MdEmail, MdLocationOn, MdInfo, MdHelpOutline } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { TextField, PrimaryButton, SearchableSelect, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import PaperLayoutPreview from "../../components/quotes/PaperLayoutPreview.jsx";




const ADDRESS_TEMPLATE = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };


const TABS = [
  { id: "laser", label: "Laser Printing", icon: <MdComputer /> },
  { id: "brochure", label: "Brochure (Center Clip)", icon: <MdLayers /> },
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

  // --- Brochure Calculator State ---
  const [brochureSizeId, setBrochureSizeId] = useState("");
  const [brochureStockItemId, setBrochureStockItemId] = useState("");
  const [brochurePagesPerBrochure, setBrochurePagesPerBrochure] = useState("8");
  const [brochureCopies, setBrochureCopies] = useState("100");
  const [brochureColorPagesInput, setBrochureColorPagesInput] = useState("");
  const [brochureIsOnlyClipCharge, setBrochureIsOnlyClipCharge] = useState(false);
  const [brochureOrientation, setBrochureOrientation] = useState("NORMAL");
  const [showBrochureOrientationModal, setShowBrochureOrientationModal] = useState(false);
  const [pendingBrochureSizeId, setPendingBrochureSizeId] = useState(null);
  const [prevBrochureSizeId, setPrevBrochureSizeId] = useState("");

  const [brochureViews, setBrochureViews] = useState([]);
  const [selectedBrochureView, setSelectedBrochureView] = useState(null);
  const [selectedBrochureOption, setSelectedBrochureOption] = useState(null); // { viewId, optionIdx, kind: 'SINGLE' | 'MIXED' }
  const [brochureNestedPrintPlans, setBrochureNestedPrintPlans] = useState([]);
  const [selectedNestedPrintPlan, setSelectedNestedPrintPlan] = useState(null);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const [brochureError, setBrochureError] = useState("");

  const activeOrg = user?.organizations?.find(o => (o.organizationId || o.id) === user.activeOrganizationId);
  const activeOrgName = activeOrg?.name || "PrintQ Client";
  const effectiveBrochureColorMode = brochureColorPagesInput.trim() ? "COLOR" : "BW";

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
  const [activeEditId, setActiveEditId] = useState(null);
  const [activeEditValue, setActiveEditValue] = useState("");
  const syncDebounceRef = useRef(null);
  const [selectedLaserOption, setSelectedLaserOption] = useState(null);
  const [shareError, setShareError] = useState("");


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

  const openBrochureOrientationModal = useCallback((params) => {
    const { nextSizeId, prevSizeId } = params || {};
    setPrevBrochureSizeId(prevSizeId ?? brochureSizeId ?? "");
    setPendingBrochureSizeId(nextSizeId ?? brochureSizeId ?? "");
    setShowBrochureOrientationModal(true);
  }, [brochureSizeId]);

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

  const handleUpdateLineItem = (itemId, updates) => {
    const newList = lineItems.map(item => {
      const matchId = item.id || item._id;
      if (matchId === itemId) {
        const updated = { ...item, ...updates };
        
        // Handle Pricing Logic
        if (updates.quantity || updates.unitPrice || updates.totalAmount !== undefined) {
          const qty = Number(updated.quantity) || item.quantity || 1;
          
          // Get current unit price from components if not provided in updates
          let currentUnitPrice = Number(updates.unitPrice);
          if (updates.unitPrice === undefined) {
             const firstComp = item.chargeComponents?.[0];
             currentUnitPrice = firstComp?.unitPrice || (item.totalAmount / qty) || 0;
          }

          let total = updates.totalAmount !== undefined ? Number(updates.totalAmount) : (currentUnitPrice * qty);
          let unitPrice = updates.totalAmount !== undefined ? (total / qty) : currentUnitPrice;

          updated.quantity = qty;
          updated.chargeComponents = [
            {
              role: "printing",
              label: item.chargeComponents?.[0]?.label || "Manual Item",
              amount: total,
              unitPrice: unitPrice,
              quantity: qty
            }
          ];
        }
        return updated;
      }
      return item;
    });
    
    setLineItems(newList);
    
    // Debounce the API sync
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
       syncLineItems(newList);
    }, 800);
  };


  const handleWhatsAppShare = () => {
    const total = lineItems.reduce((acc, curr) => acc + (curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0), 0);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    
    let message = `📄 *QUOTATION*\n`;
    message += `------------------------------\n`;
    message += `*Customer:* ${selectedCustomer?.name || 'Valued Customer'}\n`;
    message += `*Subject:* ${title || 'General Printing'}\n`;
    message += `*Date:* ${dateStr}\n`;
    message += `------------------------------\n\n`;

    lineItems.forEach((item, idx) => {
      const itemTitle = item.meta?.itemTitle || item.title || "Printing Item";
      const trimmedTitle = itemTitle.length > 35 ? itemTitle.substring(0, 32) + "..." : itemTitle;
      const itemTotal = item.chargeComponents?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0;
      
      message += `${idx + 1}. *${trimmedTitle}*\n`;
      message += `   Qty: ${item.quantity} | *₹${itemTotal.toLocaleString()}*\n`;
      if (item.description) {
         // Optionally trim description too if long
         const desc = item.description.length > 60 ? item.description.substring(0, 57) + "..." : item.description;
         message += `   _${desc}_\n`;
      }
      message += `\n`;
    });

    message += `------------------------------\n`;
    message += `*GRAND TOTAL: ₹${total.toLocaleString()}*\n`;
    message += `------------------------------\n`;
    message += `Thank you for your business!\n`;
    message += `_Generated via ${activeOrgName}_`;

    const encodedMessage = encodeURIComponent(message);
    const phone = selectedCustomer?.phone || "";
    if (!phone) {
       setShareError("No phone number found for this customer.");
       setTimeout(() => setShareError(""), 3000);
       return;
    }

    // Remove non-numeric characters for WA link
    const cleanPhone = phone.replace(/\D/g, '');
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };


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

     setBrochureSizeId("");
     setBrochureStockItemId("");
     setBrochurePagesPerBrochure("8");
     setBrochureCopies("100");
     setBrochureColorPagesInput("");
     setBrochureIsOnlyClipCharge(false);
     setBrochureOrientation("NORMAL");

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

     setBrochureViews([]);
     setSelectedBrochureView(null);
     setSelectedBrochureOption(null);

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
       // Check if it's laser, offset, or brochure
       if (m.laserStockItemId !== undefined && m.brochureStockItemId === undefined) {
         setActiveTab("laser");
         setLaserStockItemId(m.laserStockItemId || "");
         setLaserSizeId(m.laserSizeId || "");
         setCustomWidth(m.customWidth || "");
         setCustomBreadth(m.customBreadth || "");
         setCustomUnit(m.customUnit || user.settings?.defaultLengthUnit || "mm");
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
         setCustomUnit(m.customUnit || user.settings?.defaultLengthUnit || "mm");
         setOffsetSides(m.offsetSides || "SINGLE");
         setOffsetIsBackSideDifferent(m.offsetIsBackSideDifferent ?? false);
         setOffsetColorMode(m.offsetColorMode || "Single");
         setOffsetCopies(m.offsetCopies?.toString() || "1000");
         setOffsetWaste(m.offsetWaste?.toString() || "0");
       } else if (m.brochureStockItemId !== undefined) {
         setActiveTab("brochure");
         setBrochureStockItemId(m.brochureStockItemId || "");
         setBrochureSizeId(m.brochureSizeId || "");
         setCustomWidth(m.customWidth || "");
         setCustomBreadth(m.customBreadth || "");
         setCustomUnit(m.customUnit || user.settings?.defaultLengthUnit || "mm");
         setBrochurePagesPerBrochure(m.brochurePagesPerBrochure?.toString() || "8");
         setBrochureCopies(m.brochureCopies?.toString() || "100");
         setBrochureColorPagesInput(m.brochureColorPagesInput || "");
         setBrochureIsOnlyClipCharge(m.brochureIsOnlyClipCharge ?? false);
         setBrochureOrientation(m.brochureOrientation || "NORMAL");
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

  const searchCustomers = useCallback(async (q) => {
    if (!q) { setCustomerList([]); return; }
    try {
      const data = await getCustomers(q, 0, 10);
      setCustomerList(data.items || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCustomerSearch) searchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, showCustomerSearch, searchCustomers]);

  // Laser Support Fetches
  const fetchLaserSizes = useCallback(async (q = "") => {
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
  }, []);


  const fetchLaserStocks = useCallback(async (q = "") => {
    try {
      const data = await getLaserPaperStocks(q, 0, 20);
      setStockItemList(data.items || []);
      setLaserStockOptions((data.items || []).map(s => ({
        label: `${s.name} (${s.unitOfMeasurement || 'Count'})`,
        value: s.id
      })));
    } catch (e) { console.error(e); }
  }, []);




  const fetchOffsetSizes = useCallback(async (q = "") => {
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
  }, []);

  const fetchOffsetStocks = useCallback(async (q = "") => {
    try {
      const data = await getOffsetPaperStocks(q, 0, 20);
      setStockItemList(data.items || []);
      setOffsetStockOptions((data.items || []).map(s => ({
        label: `${s.name} (${s.unitOfMeasurement || 'Count'})`,
        value: s.id
      })));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (activeTab === "laser") {
      fetchLaserSizes();
      fetchLaserStocks();
    } else if (activeTab === "offset") {
      fetchOffsetSizes();
      fetchOffsetStocks();
    } else if (activeTab === "brochure") {
      fetchLaserSizes(); // Brochures use laser stocks and sizes
      fetchLaserStocks();
    }
  }, [activeTab, fetchLaserSizes, fetchLaserStocks, fetchOffsetSizes, fetchOffsetStocks]);

  const recalculateLaserPricing = useCallback(async () => {
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
  }, [laserSizeId, laserStockItemId, laserCopies, customWidth, customBreadth, customUnit, sizeList, laserColorMode, laserSides, isOnlyClipCharge]);

  const recalculateOffsetPricing = useCallback(async () => {
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
  }, [offsetSizeId, offsetStockItemId, offsetCopies, customWidth, customBreadth, customUnit, sizeList, offsetColorMode, offsetSides, offsetIsBackSideDifferent, offsetWaste]);

  const recalculateBrochurePricing = useCallback(async () => {
    if (!brochureSizeId || !brochureStockItemId || !brochureCopies || !brochurePagesPerBrochure) return;

    let sizePayload;
    if (brochureSizeId === 'custom') {
      if (!customWidth || !customBreadth) return;
      sizePayload = { width: Number(customWidth), breadth: Number(customBreadth), unit: customUnit };
    } else {
      const selectedSize = sizeList.find(s => s.id === brochureSizeId);
      if (!selectedSize) return;
      sizePayload = { width: selectedSize.width, breadth: selectedSize.breadth, unit: selectedSize.unit };
    }

    setBrochureLoading(true);
    setBrochureError("");
    try {
      const payload = {
        pageSize: sizePayload,
        pagesPerBrochure: parseInt(brochurePagesPerBrochure) || 0,
        brochureCopies: parseInt(brochureCopies) || 0,
        stockItemId: brochureStockItemId,
        colorMode: brochureColorPagesInput.trim() ? "COLOR" : "BW",
        sides: "DOUBLE",
        isOnlyClipCharge: brochureIsOnlyClipCharge,
        pageNumberingOrientation: brochureOrientation
      };

      const data = await getBrochureLaserQuoteOptions(payload);
      if (data.nestedPrintPlans?.length) {
        console.log("[brochure-laser/nested-plans]", data.nestedPrintPlans);
      }
      const nestedPlans = data.nestedPrintPlans || [];
      setBrochureNestedPrintPlans(nestedPlans);
      setSelectedNestedPrintPlan((current) =>
        nestedPlans.find((plan) => plan.planId === current?.planId) || nestedPlans[0] || null
      );
      setBrochureViews(data.views || []);
      
      // Auto-select first view and its best printer option if not already selected
      if (data.views?.length > 0) {
        if (!selectedBrochureView) {
          setSelectedBrochureView(data.views[0]);
          if (data.views[0].singlePrinterRanked?.length > 0) {
            setSelectedBrochureOption({ viewId: data.views[0].viewId, optionIdx: 0, kind: 'SINGLE' });
          }
        } else {
          // Refresh the selected view data from new response
          const updatedView = data.views.find(v => v.viewId === selectedBrochureView.viewId) || data.views[0];
          setSelectedBrochureView(updatedView);
        }
      }
    } catch (e) {
      setBrochureError(e.response?.data?.message || "Composition not available for this configuration.");
      setBrochureViews([]);
      setSelectedBrochureView(null);
      setBrochureNestedPrintPlans([]);
      setSelectedNestedPrintPlan(null);
    } finally {
      setBrochureLoading(false);
    }
  }, [brochureSizeId, brochureStockItemId, brochureCopies, brochurePagesPerBrochure, customWidth, customBreadth, customUnit, sizeList, brochureColorPagesInput, brochureIsOnlyClipCharge, brochureOrientation]);

  // Effect to trigger calculation
  useEffect(() => {
    setSelectedLaserOption(null); // Clear selection on input change
    if (activeTab === "laser" && laserSizeId && laserStockItemId && laserCopies) {
      const timer = setTimeout(recalculateLaserPricing, 500);
      return () => clearTimeout(timer);
    }
  }, [laserSizeId, laserStockItemId, laserColorMode, laserSides, laserCopies, isOnlyClipCharge, activeTab, customWidth, customBreadth, customUnit, recalculateLaserPricing]);

  useEffect(() => {
    setSelectedOffsetOption(null);
    if (activeTab === "offset" && offsetSizeId && offsetStockItemId && offsetCopies) {
      const timer = setTimeout(recalculateOffsetPricing, 500);
      return () => clearTimeout(timer);
    }
  }, [offsetSizeId, offsetStockItemId, offsetColorMode, offsetSides, offsetIsBackSideDifferent, offsetCopies, offsetWaste, activeTab, customWidth, customBreadth, customUnit, recalculateOffsetPricing]);

  useEffect(() => {
    if (activeTab === "brochure" && brochureSizeId && brochureStockItemId && brochureCopies && brochurePagesPerBrochure) {
      const timer = setTimeout(recalculateBrochurePricing, 500);
      return () => clearTimeout(timer);
    }
  }, [brochureSizeId, brochureStockItemId, brochureColorPagesInput, brochureCopies, brochurePagesPerBrochure, brochureIsOnlyClipCharge, brochureOrientation, activeTab, customWidth, customBreadth, customUnit, recalculateBrochurePricing]);




  const addItemToPreview = () => {
    if (!currentItem.size && !currentItem.amount) return;
    setLineItems([...lineItems, { ...currentItem, id: Date.now() }]);
    setCurrentItem({ size: "", side: "", colour: "", paper: "", qty: "", waste: "", printer: "", amount: "" });
  };

  const nestedRoleLabel = (role) => {
    if (role === "ONLY") return "Single folded signature";
    if (role === "OUTER") return "Outer wrap";
    return "Inner insert";
  };

  const isPostPrintFriendlyPlan = (plan) => {
    if (!plan?.signatures?.length) return false;
    return plan.signatures.every((sig) => sig.signaturePages === 4);
  };

  const nestedPlanWorkflowBadges = (plan, planIdx) => {
    const badges = [];
    if (planIdx === 0) {
      badges.push({ label: "Printing Friendly", tone: "mint" });
    }
    if (isPostPrintFriendlyPlan(plan)) {
      badges.push({ label: "Post Print Friendly", tone: "amber" });
    }
    return badges;
  };

  const nestedPlanInstruction = (plan) => {
    if (isPostPrintFriendlyPlan(plan)) {
      return "Print every small set below. Cut each set, stack from outer to inner, then center pin.";
    }
    return "Print every set below. Fold each set, then nest from outer to inner.";
  };

  const parseBrochureColorPages = (value, totalPages) => {
    const total = Number.parseInt(totalPages, 10) || 0;
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized || total <= 0) return new Set();
    if (normalized === "ALL") {
      return new Set(Array.from({ length: total }, (_, index) => index + 1));
    }

    const pages = new Set();
    normalized.split(",").forEach((part) => {
      const token = part.trim();
      if (!token) return;
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = Number.parseInt(rangeMatch[1], 10);
        const end = Number.parseInt(rangeMatch[2], 10);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return;
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(total, Math.max(start, end));
        for (let page = from; page <= to; page += 1) pages.add(page);
        return;
      }
      if (!/^\d+$/.test(token)) return;
      const page = Number.parseInt(token, 10);
      if (Number.isFinite(page) && page >= 1 && page <= total) pages.add(page);
    });
    return pages;
  };

  const brochureColorPageSet = parseBrochureColorPages(brochureColorPagesInput, brochurePagesPerBrochure);
  const isBrochureColorPage = (pageNumber) => brochureColorPageSet.has(Number(pageNumber));

  const brochurePreviewPageClass = (pageNumber) =>
    isBrochureColorPage(pageNumber)
      ? "border-amber-300 bg-amber-100 text-amber-900 ring-2 ring-amber-300/50"
      : "border-brand-navy/10 bg-zinc-200/80 text-brand-navy";

  const nestedPreviewMetrics = (signature, sideRows) => {
    const rowCount = Math.max(1, sideRows.length);
    const colCount = Math.max(1, sideRows[0]?.length || 1);
    const pageFootprintWidth = signature.portion.width / Math.max(1, signature.fit.across);
    const pageFootprintBreadth = signature.portion.breadth / Math.max(1, signature.fit.down);
    const previewWidth = pageFootprintWidth * colCount;
    const previewBreadth = pageFootprintBreadth * rowCount;

    return { rowCount, colCount, previewWidth, previewBreadth };
  };

  const renderNestedImpositionSide = (signature, sideRows, tone = "teal", planPreviewScale = null) => {
    const { rowCount, colCount, previewWidth, previewBreadth } = nestedPreviewMetrics(signature, sideRows);
    const paperIsHorizontal = previewWidth >= previewBreadth;
    const paperRatio = `${previewWidth} / ${previewBreadth}`;
    const scaleWidth = planPreviewScale?.maxPreviewWidth
      ? Math.max(0.22, Math.min(1, previewWidth / planPreviewScale.maxPreviewWidth))
      : 1;
    const referenceWidthRem = planPreviewScale?.paperIsHorizontal === false ? 18 : 34;
    const numberRotation = (cell) => {
      if (typeof cell.previewRotationDeg === "number") {
        return `rotate(${cell.previewRotationDeg}deg)`;
      }
      if (signature.imposition.orientation === "ROTATED") {
        return cell.designOrientation === "INVERTED" ? "rotate(90deg)" : "rotate(-90deg)";
      }
      if (colCount === 1) {
        return "rotate(90deg)";
      }
      if (paperIsHorizontal) {
        return cell.designOrientation === "INVERTED" ? "rotate(90deg)" : "rotate(-90deg)";
      }
      return cell.designOrientation === "INVERTED" ? "rotate(180deg)" : "rotate(0deg)";
    };

    return (
      <div className="overflow-x-auto pb-1">
        <div
          className={`grid gap-2 mx-auto max-w-full rounded-2xl border p-3 ${tone === "teal" ? "border-brand-teal/20 bg-brand-teal/3" : "border-brand-navy/10 bg-white"}`}
          style={{
            aspectRatio: paperRatio,
            width: `min(100%, ${Math.max(7, referenceWidthRem * scaleWidth)}rem)`,
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          }}
        >
          {sideRows.flatMap((row, ri) =>
            row.map((cell, ci) => (
              <div
                key={`${ri}-${ci}-${cell.pageNumber}`}
                title={`${cell.designOrientation.toLowerCase()} page design${isBrochureColorPage(cell.pageNumber) ? " • color page" : ""}`}
                className={`flex items-center justify-center rounded-sm border shadow-sm ${brochurePreviewPageClass(cell.pageNumber)}`}
              >
                <span
                  className="inline-flex items-center justify-center text-sm font-black leading-none transition-transform"
                  style={{ transform: numberRotation(cell) }}
                >
                  {cell.pageNumber}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderBrochureImpositionSide = (seg, sideRows, tone = "teal") => {
    const rowCount = Math.max(1, sideRows.length);
    const colCount = Math.max(1, sideRows[0]?.length || 1);
    const cellWidth = seg.spreadSize.width / colCount;
    const cellBreadth = seg.spreadSize.breadth / rowCount;
    const previewWidth = cellWidth * colCount;
    const previewBreadth = cellBreadth * rowCount;
    const paperIsHorizontal = previewWidth >= previewBreadth;
    const paperRatio = `${previewWidth} / ${previewBreadth}`;
    const orientation = seg.pageNumbering?.orientation ?? "NORMAL";
    const numberRotation = (pageNumber, rowIndex, colIndex) => {
      if (orientation === "ROTATED") {
        const inverted = (rowIndex + colIndex) % 2 === 1;
        return inverted ? "rotate(90deg)" : "rotate(-90deg)";
      }
      if (colCount === 1) {
        return "rotate(90deg)";
      }
      if (paperIsHorizontal) {
        const inverted = colIndex === 0;
        return inverted ? "rotate(90deg)" : "rotate(-90deg)";
      }
      const inverted = rowIndex === 0;
      return inverted ? "rotate(180deg)" : "rotate(0deg)";
    };

    return (
      <div className="overflow-x-auto pb-1">
        <div
          className={`grid gap-2 mx-auto min-w-72 max-w-full rounded-2xl border p-3 ${tone === "teal" ? "border-brand-teal/20 bg-brand-teal/3" : "border-brand-navy/10 bg-white"}`}
          style={{
            aspectRatio: paperRatio,
            width: paperIsHorizontal ? "min(100%, 34rem)" : "min(100%, 18rem)",
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          }}
        >
          {sideRows.flatMap((row, ri) =>
            row.map((pageNumber, ci) => (
              <div
                key={`${ri}-${ci}-${pageNumber}`}
                title={isBrochureColorPage(pageNumber) ? "Color page" : "Black and white page"}
                className={`flex items-center justify-center rounded-sm border shadow-sm ${brochurePreviewPageClass(pageNumber)}`}
              >
                <span
                  className="inline-flex items-center justify-center text-sm font-black leading-none transition-transform"
                  style={{ transform: numberRotation(pageNumber, ri, ci) }}
                >
                  {pageNumber}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const selectedNestedSignatureGroups = selectedNestedPrintPlan
    ? Array.from(
        selectedNestedPrintPlan.signatures.reduce((groups, signature) => {
          const key = String(signature.signaturePages);
          if (!groups.has(key)) {
            groups.set(key, { signaturePages: signature.signaturePages, signatures: [] });
          }
          groups.get(key).signatures.push(signature);
          return groups;
        }, new Map()).values()
      ).sort((a, b) => b.signaturePages - a.signaturePages)
    : [];

  const selectedNestedPlanPreviewScale = selectedNestedPrintPlan
    ? selectedNestedPrintPlan.signatures.reduce(
        (scale, signature) => {
          const sides = [signature.imposition.front, signature.imposition.back];
          sides.forEach((sideRows) => {
            const metrics = nestedPreviewMetrics(signature, sideRows);
            scale.maxPreviewWidth = Math.max(scale.maxPreviewWidth, metrics.previewWidth);
            scale.maxPreviewBreadth = Math.max(scale.maxPreviewBreadth, metrics.previewBreadth);
          });
          return scale;
        },
        { maxPreviewWidth: 1, maxPreviewBreadth: 1, paperIsHorizontal: true }
      )
    : null;

  if (selectedNestedPlanPreviewScale) {
    selectedNestedPlanPreviewScale.paperIsHorizontal =
      selectedNestedPlanPreviewScale.maxPreviewWidth >= selectedNestedPlanPreviewScale.maxPreviewBreadth;
  }

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
                onClick={handleWhatsAppShare}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm group ${shareError ? 'border-red-400 text-red-500 bg-red-50 animate-shake' : 'border-brand-navy/10 bg-white text-brand-navy/60 hover:text-brand-teal hover:border-brand-teal'}`}
                title="Send to WhatsApp"
              >
                {shareError ? <MdWarningAmber className="w-4 h-4 animate-pulse" /> : <FaWhatsapp className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{shareError ? 'No Phone' : 'Share'}</span>
              </button>

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

      {/* 2. High-Density Preview Area (Relocated Above Calculator) */}
      <section className="bg-[#F1F4F9] print:bg-white p-2 lg:p-4 print:p-0 border-b border-brand-navy/5 print:border-none">
          <div className="w-full bg-white rounded-3xl print:rounded-none shadow-inner print:shadow-none border border-brand-navy/5 print:border-none overflow-hidden flex flex-col">
              <div className={`overflow-y-auto no-scrollbar p-2 md:p-4 print:p-0 ${lineItems.length === 0 ? 'max-h-[200px]' : 'max-h-[None] print:max-h-none'}`}>
                 {lineItems.length === 0 ? (
                   <div className="py-10 flex items-center justify-center">
                      <div className="text-center opacity-10">
                         <BrandLogo className="w-20 h-20 mx-auto grayscale mb-3" />
                         <span className="text-[10px] font-black uppercase tracking-[0.4em]">Preview Workspace</span>
                      </div>
                   </div>
                 ) : (
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-brand-navy/10">
                            <th className="py-2 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest pl-4">#</th>
                            <th className="py-2 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest text-left">Line Description & Specifications</th>
                            <th className="py-2 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest w-20 text-center">Qty</th>
                            <th className="py-2 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest w-40 text-right pr-4">Total (₹)</th>
                            <th className="no-print py-2 text-[9px] font-black text-brand-navy/40 uppercase tracking-widest w-24 text-right pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                        {lineItems.map((item, idx) => {
                          const primaryComp = item.chargeComponents?.[0] || {};
                          const lineTotal = item.chargeComponents?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0;
                          const unitPrice = primaryComp.unitPrice || (lineTotal / (item.quantity || 1));

                          return (
                            <tr key={item.id || item._id} className="group hover:bg-zinc-50/50 transition-colors">
                              <td className="py-2.5 pl-4 text-xs font-black text-brand-navy/10 tabular-nums align-top">{idx + 1}</td>
                              
                              {/* Description Column */}
                              <td className="py-2.5 align-top">
                                 <div className="flex flex-col gap-1 pr-4">
                                    <input 
                                       type="text"
                                       value={item.meta?.itemTitle || item.title || ''}
                                       onChange={(e) => handleUpdateLineItem(item.id || item._id, { meta: { ...item.meta, itemTitle: e.target.value }, title: e.target.value })}
                                       className="bg-transparent border-none text-xs font-bold text-brand-teal focus:ring-0 p-0 hover:bg-brand-teal/5 rounded transition-all placeholder:opacity-20"
                                       placeholder="Item Title..."
                                    />
                                    <textarea 
                                       value={item.description}
                                       onChange={(e) => handleUpdateLineItem(item.id || item._id, { description: e.target.value })}
                                       className="bg-transparent border-none text-[10px] font-medium text-brand-navy/60 focus:ring-0 p-0 hover:bg-zinc-100 rounded transition-all resize-none overflow-hidden min-h-[32px] w-full"
                                       rows={2}
                                    />
                                 </div>
                              </td>

                              {/* Quantity Column */}
                              <td className="py-2.5 align-top text-center text-xs font-black text-brand-navy/60">
                                 {item.quantity}
                              </td>

                              {/* Total Column */}
                              <td className="py-2.5 align-top text-right pr-4">
                                 <div className="flex flex-col items-end">
                                    <input 
                                       type="number"
                                       value={activeEditId === (item.id || item._id) ? activeEditValue : lineTotal.toFixed(2)}
                                       onFocus={() => {
                                          setActiveEditId(item.id || item._id);
                                          setActiveEditValue(lineTotal || "");
                                       }}
                                       onBlur={() => {
                                          setActiveEditId(null);
                                          setActiveEditValue("");
                                       }}
                                       onChange={(e) => {
                                          setActiveEditValue(e.target.value);
                                          if (e.target.value !== "") {
                                            handleUpdateLineItem(item.id || item._id, { totalAmount: e.target.value });
                                          }
                                       }}
                                       onWheel={(e) => e.currentTarget.blur()}
                                       className="w-32 bg-transparent border-none text-right text-sm font-black text-brand-teal focus:ring-0 p-0 hover:bg-brand-teal/5 rounded transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="text-[8px] font-bold text-brand-navy/20 uppercase tracking-widest mt-1">
                                       Subtotal {currency}
                                    </div>
                                 </div>
                              </td>

                              <td className="no-print py-2.5 pr-4 align-top">
                                 <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                      onClick={() => handleEditLineItem(item)}
                                      className="p-2 rounded-xl bg-brand-mint/30 text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-sm border border-brand-teal/10"
                                      title="Re-open in Calculator"
                                    >
                                       <MdEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLineItem(item.id || item._id)}
                                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100"
                                      title="Delete Item"
                                    >
                                       <MdDeleteOutline className="w-4 h-4" />
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

              {/* Summary Bar - Relocated with Table */}
              <div className="p-4 md:p-6 bg-zinc-50 print:bg-white flex items-center justify-between border-t border-brand-navy/5 print:border-brand-navy/10">
                  <div className="flex items-center gap-6 relative">
                     {shareError && (
                        <div className="absolute -top-12 right-0 bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg shadow-xl animate-bounce-in flex items-center gap-2 whitespace-nowrap">
                           <MdWarningAmber className="w-3 h-3" />
                           {shareError}
                        </div>
                     )}
                     <button
                       onClick={handleWhatsAppShare}
                       className={`no-print flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all font-black uppercase tracking-widest shadow-sm ${shareError ? 'border-red-400 text-red-500 bg-red-50 animate-shake' : 'border-brand-navy/5 bg-white text-brand-navy/40 hover:text-brand-teal hover:border-brand-teal/30'}`}
                     >
                        <FaWhatsapp className="w-4 h-4" />
                        <span className="text-[10px]">WhatsApp</span>
                     </button>

                     <button
                       onClick={() => window.print()}
                       className="no-print flex items-center gap-3 px-4 py-2 rounded-xl border-2 border-brand-navy/5 bg-white text-brand-navy/40 hover:text-brand-teal hover:border-brand-teal/30 transition-all font-black uppercase tracking-widest shadow-sm"
                     >
                        <MdPrint className="w-4 h-4" />
                        <span className="text-[10px]">Print Quotation</span>
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

      {/* 2. Compact Calculator Bar */}
      <section id="calc-top" className="no-print border-b border-brand-navy/5 bg-white">
          {/* Tabs - Redesigned to be rounded and thematic */}
          <div className="px-6 py-2 bg-zinc-50/50 flex">
             <div className="flex bg-zinc-200/50 p-1 rounded-2xl border border-zinc-200/50">
                {TABS.map(t => (
                  <button
                   key={t.id}
                   onClick={() => setActiveTab(t.id)}
                   className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeTab === t.id ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                  >
                    <span className="text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
             </div>
          </div>


          <div className="p-6">
            {activeTab === "laser" ? (
              <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Inputs */}
                  <div className="w-full lg:w-[450px] space-y-4">
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
                  <div className={`flex-1 rounded-2xl border-2 p-5 min-h-[300px] flex flex-col relative transition-all duration-300 ${!!editingLineId ? 'bg-brand-teal/5 border-solid border-brand-teal' : 'bg-zinc-50/50 border-dashed border-brand-navy/10'}`}>
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
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdComputer className={`w-12 h-12 ${laserSizeId && laserStockItemId && laserCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${laserSizeId && laserStockItemId && laserCopies ? 'text-red-400' : 'text-brand-navy/30'}`}>
                             {laserSizeId && laserStockItemId && laserCopies 
                               ? "No printer available to print this configuration" 
                               : "Select dimensions and stock to see machine comparisons"}
                           </p>
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
            ) : activeTab === "brochure" ? (
              <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
                  {/* Left: Inputs */}
                  <div className="w-full lg:w-[450px] space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
                          <TextField 
                            label="Job Title" 
                            placeholder="e.g. Annual Report, Booklet..." 
                            value={itemTitle} 
                            onChange={e => setItemTitle(e.target.value)} 
                          />
                          <SearchableSelect
                             label="Finished Page Size"
                             options={laserSizeOptions}
                             value={brochureSizeId}
                             placeholder="Search Size Chart..."
                             onChange={e => {
                               const next = e.target.value;
                               const prev = brochureSizeId;
                               if (!next) return;
                               if (next === "custom") {
                                 setPrevBrochureSizeId(prev);
                                 setPendingBrochureSizeId("custom");
                                 setBrochureSizeId("custom");
                                 setCustomWidth("");
                                 setCustomBreadth("");
                                 return;
                               }
                               setPendingBrochureSizeId(next);
                               setPrevBrochureSizeId(prev);
                               // Do not commit the size until the user explicitly chooses orientation.
                               openBrochureOrientationModal({ nextSizeId: next, prevSizeId: prev });
                             }}
                           />

                          {brochureSizeId === 'custom' && (
                            <div className="p-5 bg-brand-teal/5 h-16 rounded-2xl border border-brand-teal/10 flex items-center gap-4 animate-slide-down">
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Width"
                                    value={customWidth}
                                    onChange={e => {
                                      const v = e.target.value;
                                      setCustomWidth(v);
                                      if (pendingBrochureSizeId === "custom") {
                                        const w = Number(v);
                                        const b = Number(customBreadth);
                                        if (
                                          Number.isFinite(w) &&
                                          Number.isFinite(b) &&
                                          w > 0 &&
                                          b > 0 &&
                                          !showBrochureOrientationModal
                                        ) {
                                          setShowBrochureOrientationModal(true);
                                        }
                                      }
                                    }}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <span className="text-[10px] font-black text-brand-navy/20">×</span>
                               <div className="flex-1">
                                  <input
                                    type="number"
                                    placeholder="Breadth"
                                    value={customBreadth}
                                    onChange={e => {
                                      const v = e.target.value;
                                      setCustomBreadth(v);
                                      if (pendingBrochureSizeId === "custom") {
                                        const w = Number(customWidth);
                                        const b = Number(v);
                                        if (
                                          Number.isFinite(w) &&
                                          Number.isFinite(b) &&
                                          w > 0 &&
                                          b > 0 &&
                                          !showBrochureOrientationModal
                                        ) {
                                          setShowBrochureOrientationModal(true);
                                        }
                                      }
                                    }}
                                    className="w-full bg-transparent border-b border-brand-teal/20 outline-none text-xs font-black text-brand-navy placeholder:text-brand-navy/20 py-1"
                                  />
                               </div>
                               <div className="w-16">
                                  <select
                                    value={customUnit}
                                    onChange={e => {
                                      setCustomUnit(e.target.value);
                                      // If custom size is pending, require orientation selection again (dimensions context changed).
                                      if (pendingBrochureSizeId === "custom") {
                                        setShowBrochureOrientationModal(false);
                                      }
                                    }}
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
                             value={brochureStockItemId}
                             placeholder="Search Inventory..."
                             onChange={e => setBrochureStockItemId(e.target.value)}
                             onSearch={fetchLaserStocks}
                           />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <TextField 
                              label="Pages per Brochure" 
                              type="number" 
                              value={brochurePagesPerBrochure} 
                              onChange={e => setBrochurePagesPerBrochure(e.target.value)} 
                              helperText="Total reader pages (must be even)"
                           />
                           <TextField 
                              label="No of Copies" 
                              type="number" 
                              value={brochureCopies} 
                              onChange={e => setBrochureCopies(e.target.value)} 
                           />
                      </div>

                      <label className="block">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-brand-navy/80">Color Pages</span>
                          <span className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">
                            blank = all B&W
                          </span>
                        </div>
                        <input
                          type="text"
                          value={brochureColorPagesInput}
                          onChange={e => setBrochureColorPagesInput(e.target.value)}
                          placeholder="ALL or 1,6,8 or 1-6,56,20-25"
                          className="w-full rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-brand-navy placeholder:text-brand-navy/35 outline-none transition-all focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/10 shadow-sm"
                        />
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800 leading-relaxed">
                          Enter color reader pages as <span className="font-black">ALL</span>, individual pages like <span className="font-black">1,6,8</span>, ranges like <span className="font-black">1-6</span>, or mixed like <span className="font-black">1-6,56,20-25</span>. Marked pages are highlighted in the print previews.
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Orientation</label>
                             <button
                               type="button"
                               onClick={() => {
                                 if (!brochureSizeId) return;
                                 openBrochureOrientationModal({ nextSizeId: brochureSizeId, prevSizeId: brochureSizeId });
                               }}
                               className="w-full flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-brand-navy/5 hover:border-brand-teal/40 transition-all"
                             >
                               <div className="flex flex-col items-start">
                                 <span className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">Selected</span>
                                 <span className="text-[11px] font-black text-brand-navy">
                                   {brochureOrientation === "ROTATED" ? "Landscape (rotated)" : "Portrait (normal)"}
                                 </span>
                               </div>
                               <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Change</span>
                             </button>
                          </div>
                          <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest pl-1">Charge Method</label>
                              <div className="flex bg-zinc-50 p-1 rounded-xl border border-brand-navy/5 h-11">
                                 {[
                                   { id: true, label: "Printing Only" },
                                   { id: false, label: "Slab Charge" }
                                 ].map(m => (
                                   <button
                                     key={m.label}
                                     onClick={() => setBrochureIsOnlyClipCharge(m.id)}
                                     className={`flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${brochureIsOnlyClipCharge === m.id ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/30 hover:text-brand-navy/60'}`}
                                   >
                                     {m.label}
                                   </button>
                                 ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Brochure Composition \u0026 Pricing */}
                  <div className={`flex-1 rounded-2xl border-2 p-5 min-h-[400px] flex flex-col relative transition-all duration-300 ${!!editingLineId ? 'bg-brand-teal/5 border-solid border-brand-teal' : 'bg-zinc-50/50 border-dashed border-brand-navy/10'}`}>
                      <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <MdLayers className="w-5 h-5 text-brand-teal" />
                             <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest">
                                {!!editingLineId ? "Editing Brochure" : "Composition Options"}
                             </h3>
                          </div>
                          {brochureLoading && <div className="w-4 h-4 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>}
                      </div>

                      {brochureError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{brochureError}</p>
                        </div>
                      ) : brochureViews.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdLayers className={`w-12 h-12 ${brochureSizeId && brochureStockItemId && brochureCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${brochureSizeId && brochureStockItemId && brochureCopies ? 'text-red-400' : 'text-brand-navy/30'}`}>
                             {brochureSizeId && brochureStockItemId && brochureCopies 
                               ? "No composition possible for this page count" 
                               : "Configure brochure details to see split options"}
                           </p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col gap-6">
                          {brochureNestedPrintPlans.length === 0 && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                               {brochureViews.map((view) => (
                                 <button
                                   key={view.viewId}
                                   onClick={() => {
                                     setSelectedBrochureView(view);
                                     if (view.singlePrinterRanked?.length > 0) {
                                       setSelectedBrochureOption({ viewId: view.viewId, optionIdx: 0, kind: 'SINGLE' });
                                     }
                                   }}
                                   className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all text-left min-w-[140px] ${selectedBrochureView?.viewId === view.viewId ? 'bg-brand-teal text-white border-brand-teal shadow-lg shadow-brand-teal/20' : 'bg-white text-brand-navy border-brand-navy/5 hover:border-brand-teal/30'}`}
                                 >
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Split</div>
                                    <div className="text-sm font-black">[{view.parts.join(', ')}]</div>
                                    <div className="text-[9px] font-bold uppercase tracking-tighter mt-1 opacity-80">{view.physicalSheetsPerBrochure} Sheets</div>
                                 </button>
                               ))}
                            </div>
                          )}

                           {brochureNestedPrintPlans.length > 0 && (
                             <div className="space-y-3">
                               <div className="flex items-center justify-between px-1">
                                 <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">
                                   Nested Center Pin Options
                                 </h4>
                                 <span className="text-[9px] font-black text-brand-teal uppercase tracking-widest">
                                   {brochureNestedPrintPlans.length} plan{brochureNestedPrintPlans.length === 1 ? "" : "s"}
                                 </span>
                               </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                                 {brochureNestedPrintPlans.map((plan, planIdx) => (
                                   <button
                                     key={plan.planId}
                                     type="button"
                                    onClick={() => setSelectedNestedPrintPlan(plan)}
                                    className={`p-3 rounded-xl border bg-white text-left transition-all ${selectedNestedPrintPlan?.planId === plan.planId ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/2' : 'border-brand-navy/5 hover:border-brand-teal/40'}`}
                                   >
                                     <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0">
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <span className="text-xs font-black text-brand-navy">Option {planIdx + 1}</span>
                                           {nestedPlanWorkflowBadges(plan, planIdx).map((badge) => (
                                             <span
                                               key={`${plan.planId}-${badge.label}`}
                                               className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                                 badge.tone === "amber"
                                                   ? "bg-amber-100 text-amber-800"
                                                   : "bg-brand-mint text-brand-teal"
                                               }`}
                                             >
                                               {badge.label}
                                             </span>
                                           ))}
                                         </div>
                                        <div className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-tight mt-1 truncate">
                                          {plan.printRunCount} run{plan.printRunCount === 1 ? "" : "s"} • {plan.physicalSheetsPerBrochure} sheet{plan.physicalSheetsPerBrochure === 1 ? "" : "s"} • {plan.signatures.map((sig) => `${sig.signaturePages}pp`).join(" + ")}
                                         </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {plan.signatures.slice(0, 8).map((sig) => (
                                            <span key={`${plan.planId}-${sig.runIndex}`} className="px-1.5 py-0.5 rounded-md bg-brand-navy/3 text-[8px] font-black text-brand-navy/45 uppercase tracking-tight">
                                              {sig.runIndex}:{sig.signaturePages}pp
                                            </span>
                                          ))}
                                          {plan.signatures.length > 8 && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-brand-navy/3 text-[8px] font-black text-brand-navy/45 uppercase tracking-tight">
                                              +{plan.signatures.length - 8}
                                            </span>
                                          )}
                                         </div>
                                       </div>
                                      <div className="shrink-0 text-right text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">
                                         {plan.signatures[0]?.printerModelName || "Printer"}
                                       </div>
                                     </div>
                                   </button>
                                 ))}
                               </div>

                               {selectedNestedPrintPlan && (
                                 <div className="bg-brand-navy/2 rounded-2xl border border-brand-navy/5 p-4 space-y-4">
                                   <div className="grid grid-cols-3 gap-2">
                                     <div className="rounded-xl bg-white border border-brand-navy/5 p-3">
                                       <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest">Print Sets</div>
                                       <div className="text-lg font-black text-brand-navy mt-1">{selectedNestedPrintPlan.printRunCount}</div>
                                     </div>
                                     <div className="rounded-xl bg-white border border-brand-navy/5 p-3">
                                      <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest">Print Sheets</div>
                                      <div className="text-lg font-black text-brand-navy mt-1">
                                        {selectedNestedPrintPlan.printedSheetsForCopies ?? selectedNestedPrintPlan.physicalSheetsPerBrochure}
                                      </div>
                                     </div>
                                     <div className="rounded-xl bg-white border border-brand-navy/5 p-3">
                                       <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest">Plan</div>
                                       <div className="text-sm font-black text-brand-teal mt-1">{selectedNestedPrintPlan.signatures.map((sig) => `${sig.signaturePages}pp`).join(" + ")}</div>
                                     </div>
                                   </div>

                                   <div className="text-[10px] font-bold text-brand-navy/45 uppercase tracking-tight">
                                     {nestedPlanInstruction(selectedNestedPrintPlan)}
                                   </div>

                                   <div className="space-y-5">
                                     {selectedNestedSignatureGroups.map((group) => (
                                       <div key={`${selectedNestedPrintPlan.planId}-${group.signaturePages}`} className="bg-white rounded-2xl border border-brand-navy/5 p-4 space-y-4">
                                         <div className="flex items-center justify-between gap-4">
                                           <div>
                                             <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">
                                               {group.signaturePages === 2 ? "2pp Loose Insert" : `${group.signaturePages}pp Fold Print`}
                                             </div>
                                             <div className="text-xs font-black text-brand-navy mt-0.5">
                                               {group.signatures.length} set{group.signatures.length === 1 ? "" : "s"} to print
                                             </div>
                                           </div>
                                           <div className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">
                                             {group.signaturePages / 2} pages per side
                                           </div>
                                         </div>

                                         {group.signatures.map((signature) => (
                                           <div key={`${selectedNestedPrintPlan.planId}-${signature.runIndex}`} className="rounded-xl border border-brand-navy/5 bg-white p-3 space-y-3">
                                             <div className="flex justify-between gap-4">
                                               <div>
                                                 <div className="text-[10px] font-black text-brand-navy uppercase tracking-widest">
                                                   Set {signature.runIndex}: {nestedRoleLabel(signature.nestRole)}
                                                 </div>
                                                 <div className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-tight mt-1">
                                                   Pages {signature.readerPages.join(", ")}
                                                 </div>
                                                 {signature.signaturePages === 2 && signature.imposition?.note && (
                                                   <p className="text-[10px] font-bold text-amber-700/80 normal-case tracking-normal mt-2 leading-relaxed">
                                                     {signature.imposition.note}
                                                   </p>
                                                 )}
                                               </div>
                                               <div className="text-right">
                                                 <div className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">Portion</div>
                                                 <div className="text-[11px] font-black text-brand-navy">
                                                   {signature.portion.width}×{signature.portion.breadth}{signature.portion.unit}
                                                 </div>
                                                 <div className="text-[9px] font-bold text-brand-navy/30 uppercase mt-0.5">
                                                   {signature.gridOnPortion.across}×{signature.gridOnPortion.down}
                                                 </div>
                                                 {signature.copiesPerPrintedSheet > 1 && (
                                                   <div className="text-[9px] font-black text-brand-teal uppercase mt-1">
                                                     {signature.copiesPerPrintedSheet} sets / print
                                                   </div>
                                                 )}
                                                 {signature.printedSheetsForCopies && (
                                                   <div className="text-[9px] font-bold text-brand-navy/35 uppercase mt-1">
                                                     {signature.printedSheetsForCopies} sheet(s) → {signature.finishedCopiesProduced} set(s)
                                                   </div>
                                                 )}
                                               </div>
                                             </div>
                                             {signature.cutAfterPrint && (
                                               <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">
                                                 {signature.cutAfterPrint}
                                               </div>
                                             )}

                                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                               <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                 <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest mb-2">Front Side</div>
                                                {renderNestedImpositionSide(signature, signature.imposition.front, "teal", selectedNestedPlanPreviewScale)}
                                               </div>
                                               <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                 <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest mb-2">Back Side</div>
                                                {renderNestedImpositionSide(signature, signature.imposition.back, "navy", selectedNestedPlanPreviewScale)}
                                               </div>
                                             </div>
                                           </div>
                                         ))}
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           )}

                          {brochureNestedPrintPlans.length === 0 && selectedBrochureView && (
                             <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                                {/* Intelligence Summary */}
                                <div className="p-4 bg-brand-navy/[0.03] rounded-xl border border-brand-navy/5">
                                   <div className="flex items-center gap-2 mb-2">
                                      <MdInfo className="w-4 h-4 text-brand-teal" />
                                      <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Composition Strategy</span>
                                   </div>
                                   <p className="text-[11px] font-bold text-brand-navy/70 leading-relaxed italic">
                                      "{selectedBrochureView.intelligence.humanSummary}"
                                   </p>
                                </div>

                                {/* Ranked Printers */}
                                <div className="space-y-3">
                                   <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em] px-1">Printer Options</h4>
                                   <div className="grid grid-cols-1 gap-3">
                                      {/* Single Printer Options */}
                                      {selectedBrochureView.singlePrinterRanked.map((opt, oIdx) => (
                                        <div
                                          key={`single-${oIdx}`}
                                          onClick={() => setSelectedBrochureOption({ viewId: selectedBrochureView.viewId, optionIdx: oIdx, kind: 'SINGLE' })}
                                          className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${selectedBrochureOption?.kind === 'SINGLE' && selectedBrochureOption?.optionIdx === oIdx ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/[0.02]' : 'border-brand-navy/5 hover:border-brand-teal/40'}`}
                                        >
                                           <div className="flex-1">
                                              <div className="text-xs font-black text-brand-navy flex items-center gap-2">
                                                 {opt.printerModelName}
                                                 {oIdx === 0 && <span className="text-[8px] px-1.5 py-0.5 bg-brand-mint text-brand-teal rounded uppercase tracking-tighter">Best Value</span>}
                                              </div>
                                              <div className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-tight mt-1">
                                                 Single Printer Workflow • {opt.totals.prints} Prints • {opt.totals.parentSheets} Stocks
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-lg font-black text-brand-navy">₹{opt.totals.price.toLocaleString()}</div>
                                           </div>
                                        </div>
                                      ))}

                                      {/* Mixed Printer Options */}
                                      {selectedBrochureView.mixedPrinterRanked.map((opt, oIdx) => (
                                        <div
                                          key={`mixed-${oIdx}`}
                                          onClick={() => setSelectedBrochureOption({ viewId: selectedBrochureView.viewId, optionIdx: oIdx, kind: 'MIXED' })}
                                          className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${selectedBrochureOption?.kind === 'MIXED' && selectedBrochureOption?.optionIdx === oIdx ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/[0.02]' : 'border-brand-navy/5 hover:border-brand-teal/40'}`}
                                        >
                                           <div className="flex-1">
                                              <div className="text-xs font-black text-brand-navy flex items-center gap-2">
                                                 Mixed Machines
                                                 <span className="text-[8px] px-1.5 py-0.5 bg-brand-navy text-white rounded uppercase tracking-tighter">Hybrid</span>
                                              </div>
                                              <div className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-tight mt-1">
                                                 Optimized per segment • {opt.totals.prints} Prints • {opt.totals.parentSheets} Stocks
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-lg font-black text-brand-navy">₹{opt.totals.price.toLocaleString()}</div>
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>

                                {/* Segment Details (Visual Breakdown) */}
                                <div className="space-y-3">
                                   <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em] px-1">Segment Breakdown</h4>
                                   <div className="space-y-4">
                                      {selectedBrochureView.segments.map((seg, sIdx) => {
                                        const optData = selectedBrochureOption?.kind === 'SINGLE' 
                                          ? selectedBrochureView.singlePrinterRanked[selectedBrochureOption?.optionIdx]?.segments[sIdx]
                                          : selectedBrochureView.mixedPrinterRanked[selectedBrochureOption?.optionIdx]?.segments[sIdx];
                                        
                                        return (
                                          <div key={sIdx} className="bg-white rounded-2xl border border-brand-navy/5 p-4 relative overflow-hidden group">
                                             <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-brand-teal/[0.03] rounded-full group-hover:bg-brand-teal/[0.06] transition-colors" />
                                             <div className="flex justify-between items-start mb-3 relative">
                                                <div>
                                                   <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Segment {sIdx + 1}: {seg.partPages}pp</span>
                                                   <h5 className="text-xs font-black text-brand-navy mt-0.5">{seg.layoutSummary}</h5>
                                                </div>
                                                <div className="text-right">
                                                   <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">Spread Size</div>
                                                   <div className="text-[11px] font-black text-brand-navy">{seg.spreadSize.width}×{seg.spreadSize.breadth}{seg.spreadSize.unit}</div>
                                                </div>
                                             </div>

                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                                {/* Page Numbering Grids */}
                                                {seg.pageNumbering && (
                                                  <div className="space-y-2 md:col-span-2">
                                                     <div className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">Imposition ({seg.pageNumbering.orientation})</div>
                                                     {seg.partPages === 2 && (
                                                       <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed">{seg.layoutSummary}</p>
                                                     )}
                                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                           <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest mb-2">Front</div>
                                                           {renderBrochureImpositionSide(seg, seg.pageNumbering.front, "teal")}
                                                        </div>
                                                        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                           <div className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest mb-2">Back</div>
                                                           {renderBrochureImpositionSide(seg, seg.pageNumbering.back, "navy")}
                                                        </div>
                                                     </div>
                                                  </div>
                                                )}

                                                {/* Printer Specs for this segment */}
                                                {optData && (
                                                  <div className="bg-brand-teal/[0.02] rounded-lg p-3 border border-brand-teal/5">
                                                     <div className="text-[9px] font-black text-brand-teal/60 uppercase tracking-widest mb-2">Segment Run</div>
                                                     <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-brand-navy/40">Yield</span>
                                                           <span className="text-brand-navy">{optData.laserOption?.piecesPerSheet || '--'} up</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-brand-navy/40">Impressions</span>
                                                           <span className="text-brand-navy">{optData.laserOption?.prints || '--'} prints</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-black pt-1 border-t border-brand-teal/10">
                                                           <span className="text-brand-teal">Cost</span>
                                                           <span className="text-brand-navy">₹{optData.laserOption?.pricing?.total?.toLocaleString() || '--'}</span>
                                                        </div>
                                                     </div>
                                                  </div>
                                                )}
                                             </div>
                                          </div>
                                        );
                                      })}
                                   </div>
                                </div>

                                {/* Global Add Button */}
                                {selectedBrochureOption && (
                                  <div className="mt-4 pt-6 border-t border-brand-navy/5 flex gap-3">
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
                                          const view = selectedBrochureView;
                                          const opt = selectedBrochureOption.kind === 'SINGLE' 
                                            ? view.singlePrinterRanked[selectedBrochureOption.optionIdx]
                                            : view.mixedPrinterRanked[selectedBrochureOption.optionIdx];
                                          
                                          const selPaper = stockItemList.find(s => s.id === brochureStockItemId);
                                          let sizeName = "Custom Brochure";
                                          if (brochureSizeId === 'custom') {
                                            sizeName = `Custom (${customWidth}x${customBreadth}${customUnit})`;
                                          } else {
                                            const selSize = sizeList.find(s => s.id === brochureSizeId);
                                            sizeName = selSize ? `${selSize.name}` : "Standard Brochure";
                                          }

                                          const colorPagesSummary = brochureColorPagesInput.trim() || "B&W";
                                          const newLineItem = {
                                            id: editingLineId || Date.now(),
                                            lineKind: "PRINTING",
                                            title: itemTitle || `${sizeName} Brochure`,
                                            description: `BRC • ${brochurePagesPerBrochure}pp • Color pages: ${colorPagesSummary} • ${selPaper?.name || 'Standard'} • ${view.parts.join('-')} split`,
                                            quantity: Number(brochureCopies),
                                            meta: {
                                              itemTitle,
                                              brochureStockItemId, brochureSizeId, customWidth, customBreadth, customUnit,
                                              brochurePagesPerBrochure, brochureCopies,
                                              brochureColorMode: effectiveBrochureColorMode,
                                              brochureSides: "DOUBLE",
                                              brochureColorPagesInput,
                                              brochureIsOnlyClipCharge, brochureOrientation,
                                              selectedViewId: view.viewId,
                                              selectedOptionKind: selectedBrochureOption.kind,
                                              selectedOptionIdx: selectedBrochureOption.optionIdx,
                                              viewData: view,
                                              optionData: opt
                                            },
                                            chargeComponents: opt.segments.map((s, idx) => ({
                                              role: "printing",
                                              label: `${view.parts[idx]}pp Segment - ${s.printerModelName || opt.printerModelName}`,
                                              amount: s.laserOption.pricing.total,
                                              unitPrice: s.laserOption.pricing.perPrintCharge,
                                              quantity: s.laserOption.prints,
                                              meta: s.laserOption.pricing
                                            }))
                                          };

                                          let newList;
                                          if (editingLineId) {
                                            newList = lineItems.map(item => String(item.id || item._id) === String(editingLineId) ? newLineItem : item);
                                          } else {
                                            newList = [...lineItems, newLineItem];
                                          }
                                          await syncLineItems(newList);
                                          resetCalculator();
                                       }}
                                       className="flex-1 flex items-center justify-center gap-2"
                                     >
                                        {!!editingLineId ? <MdCheckCircle className="w-4 h-4 ml-[-8px]" /> : <MdAdd className="w-4 h-4 ml-[-8px]" />}
                                        {!!editingLineId ? "Update Brochure" : "Add Brochure to Quotation"}
                                     </PrimaryButton>
                                  </div>
                                )}
                             </div>
                           )}
                        </div>
                      )}
                  </div>
              </div>
            ) : activeTab === "bookwork" ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-4 animate-fade-in bg-zinc-50/50 rounded-3xl border-2 border-dashed border-brand-navy/5">
                  <MdLayers className="w-16 h-16 text-brand-navy/10" />
                  <div>
                     <h3 className="text-sm font-black text-brand-navy uppercase tracking-[0.2em]">Bookwork Module</h3>
                     <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest mt-2">Coming Soon • Advanced gathered \u0026 perfect bound quoting</p>
                  </div>
               </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
                  {/* Left: Inputs */}
                  <div className="w-full lg:w-[450px] space-y-4">
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
                  <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 rounded-3xl border border-brand-navy/5 p-5 relative overflow-hidden">
                       <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <MdOutlineAnalytics className="w-5 h-5 text-brand-teal" />
                             <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest">
                                {!!editingLineId ? "Editing Offset Item" : "Offset Options"}
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
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdPrint className={`w-12 h-12 ${offsetSizeId && offsetStockItemId && offsetCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${offsetSizeId && offsetStockItemId && offsetCopies ? 'text-red-400' : 'text-brand-navy/30'}`}>
                              {offsetSizeId && offsetStockItemId && offsetCopies 
                                ? "No printer available to print this configuration" 
                                : "Select dimensions and offset stock to see machine comparisons"}
                           </p>
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
                                     className={`p-3 rounded-xl border bg-white shadow-sm flex items-center justify-between group cursor-pointer transition-all ${!isPrintable ? 'opacity-50 grayscale bg-zinc-50 border-red-100 cursor-not-allowed' : (isSelected ? 'border-brand-teal ring-4 ring-brand-teal/10 bg-brand-teal/[0.02]' : 'hover:border-brand-teal/40 border-brand-navy/5')}`}
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



      {/* 4. Brochure Orientation Modal */}
      {showBrochureOrientationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-md" />
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-fade-in">
            <div className="p-8 border-b border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20">
                  <MdLayers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-brand-teal leading-none mb-1">Select Orientation</h2>
                  <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">
                    Pick how the content should read on the selected page size
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest">
                required
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <button
                  type="button"
                  onClick={() => {
                    setBrochureOrientation("NORMAL");
                    if (pendingBrochureSizeId && pendingBrochureSizeId !== "custom") {
                      setBrochureSizeId(pendingBrochureSizeId);
                    }
                    setPendingBrochureSizeId(null);
                    setShowBrochureOrientationModal(false);
                  }}
                  className="group rounded-3xl border border-brand-navy/10 bg-white hover:border-brand-teal/40 hover:shadow-xl hover:shadow-brand-teal/10 transition-all overflow-hidden text-left"
                >
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">
                        Portrait
                      </div>
                      <div className="text-sm font-black text-brand-navy mt-1">Normal (not rotated)</div>
                      <div className="text-[10px] font-bold text-brand-navy/40 mt-2">
                        Content reads like a normal book page.
                      </div>
                    </div>
                    <div className="w-20 h-24 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      <span className="text-5xl font-black text-brand-teal">A</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <div className="h-2 w-full bg-brand-teal/10 rounded-full overflow-hidden">
                      <div className="h-full w-0 group-hover:w-full bg-brand-teal/40 transition-all" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrochureOrientation("ROTATED");
                    if (pendingBrochureSizeId && pendingBrochureSizeId !== "custom") {
                      setBrochureSizeId(pendingBrochureSizeId);
                    }
                    setPendingBrochureSizeId(null);
                    setShowBrochureOrientationModal(false);
                  }}
                  className="group rounded-3xl border border-brand-navy/10 bg-white hover:border-brand-teal/40 hover:shadow-xl hover:shadow-brand-teal/10 transition-all overflow-hidden text-left"
                >
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">
                        Landscape
                      </div>
                      <div className="text-sm font-black text-brand-navy mt-1">Rotated</div>
                      <div className="text-[10px] font-bold text-brand-navy/40 mt-2">
                        Content is opposite of the page’s long side.
                      </div>
                    </div>
                    <div className="w-32 h-18 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      <span className="text-5xl font-black text-brand-teal rotate-90 inline-block">A</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <div className="h-2 w-full bg-brand-teal/10 rounded-full overflow-hidden">
                      <div className="h-full w-0 group-hover:w-full bg-brand-teal/40 transition-all" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="p-4 bg-brand-navy/[0.03] rounded-2xl border border-brand-navy/5 text-[11px] font-bold text-brand-navy/60 leading-relaxed">
                This controls center-clip page numbering / imposition. If your proof comes out sideways, pick
                <span className="font-black text-brand-teal"> Rotated</span>.
              </div>
            </div>

            <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  // Cancel keeps the previous committed size selection.
                  if (pendingBrochureSizeId === "custom") {
                    setBrochureSizeId(prevBrochureSizeId || "");
                    setCustomWidth("");
                    setCustomBreadth("");
                  }
                  setPendingBrochureSizeId(null);
                  setShowBrochureOrientationModal(false);
                }}
                className="px-6 py-3 text-[10px] font-black text-brand-navy/30 hover:text-brand-navy transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <div className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest">
                Choose Portrait or Landscape to continue
              </div>
            </div>
          </div>
        </div>
      )}

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
