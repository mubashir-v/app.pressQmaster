import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getQuotation, createQuotation, updateQuotation, getCustomers, createCustomer,
  getLaserQuoteOptions, getSizeCharts, getStockItems, getLaserPaperStocks,
  getOffsetQuoteOptions, getOffsetPaperStocks, getBrochureLaserQuoteOptions
} from "../../../infrastructure/api/backendService.js";


import BrandLogo from "../../components/logo/BrandLogo.jsx";
import { MdAdd, MdClose, MdContentCopy, MdDeleteOutline, MdLayers, MdArrowBack, MdEdit, MdCheckCircle, MdPrint, MdOutlineAnalytics, MdWarningAmber, MdPrint as MdPrintIcon, MdComputer, MdPersonAdd, MdBusiness, MdPhone, MdEmail, MdLocationOn, MdInfo, MdHelpOutline, MdExpandMore, MdExpandLess } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { TextField, PrimaryButton, SearchableSelect, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import PaperLayoutPreview from "../../components/quotes/PaperLayoutPreview.jsx";




const ADDRESS_TEMPLATE = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };

function formatPaperStockOptionLabel(stock) {
  const dims = stock?.dimensions;
  if (dims?.length != null && dims?.breadth != null) {
    const unit = dims.unit ?? "";
    return `${stock.name} (${dims.length}x${dims.breadth}${unit})`;
  }
  return stock?.name ?? "";
}

const LASER_SUB_TABS = [
  { id: "laser", label: "Normal Print", icon: MdComputer },
  { id: "brochure", label: "Booklet / Book", icon: MdLayers },
];

const OFFSET_SUB_TABS = [
  { id: "offset", label: "Normal Print", icon: MdPrint },
  { id: "offset-book", label: "Book / Booklet", icon: MdLayers },
];

const isLaserTab = (tab) => tab === "laser" || tab === "brochure";
const isOffsetTab = (tab) => tab === "offset" || tab === "offset-book";

const QUOTE_CALC_ROW_CLASS = "flex flex-col lg:flex-row items-stretch gap-2 w-full flex-1 min-h-[min(360px,45vh)] lg:min-h-0";
const QUOTE_FORM_COLUMN_CLASS = "w-full lg:flex-[3_1_0%] lg:min-w-0 min-w-0 transition-[flex] duration-300 ease-out group-hover/options:flex-[1_1_0%] space-y-2";
const QUOTE_INPUT_GRID_CLASS = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";
const QUOTE_OPTIONS_PANEL_CLASS = "group/options w-full lg:flex-[1_1_0%] lg:min-w-[160px] min-w-0 overflow-x-hidden overflow-y-auto lg:max-h-[calc(100vh-12rem)] transition-[flex] duration-300 ease-out lg:hover:flex-[3_1_0%] lg:focus-within:flex-[3_1_0%] lg:hover:z-10 lg:focus-within:z-10 border border-gov-border p-2 lg:group-hover/options:p-3 flex flex-col relative cursor-default";
const QUOTE_OPTIONS_PANEL_IDLE = "bg-gray-50 border-dashed";
const QUOTE_OPTIONS_PANEL_ACTIVE = "bg-gov-blue-light border-solid border-gov-blue";
const QUOTE_SECTION_LABEL_CLASS = "text-[11px] font-semibold text-gray-600 uppercase tracking-wide";
/** Items table scroll cap — form + options keep the rest of the viewport */
const QUOTE_ITEMS_SCROLL_MAX = "max-h-[min(168px,22vh)]";
/** Collapsed sidebar (lg, not hovered): hide verbose blocks */
const OPT_COMPACT = "lg:group-hover/options:hidden";
/** Expanded sidebar only on lg */
const OPT_EXPAND = "hidden lg:group-hover/options:block";
const OPT_EXPAND_FLEX = "hidden lg:group-hover/options:flex";


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
  const [itemsPanelExpanded, setItemsPanelExpanded] = useState(true);
  const [itemAddedToast, setItemAddedToast] = useState(null);
  const itemAddedToastTimerRef = useRef(null);
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
  const [bookletBindingType, setBookletBindingType] = useState("CENTER_CLIP");

  const [brochureViews, setBrochureViews] = useState([]);
  const [selectedBrochureView, setSelectedBrochureView] = useState(null);
  const [selectedBrochureOption, setSelectedBrochureOption] = useState(null); // { viewId, optionIdx, kind: 'SINGLE' | 'MIXED' }
  const [brochureNestedPrintPlans, setBrochureNestedPrintPlans] = useState([]);
  const [selectedNestedPrintPlan, setSelectedNestedPrintPlan] = useState(null);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const [brochureError, setBrochureError] = useState("");
  const [brochureNotice, setBrochureNotice] = useState("");

  const activeOrg = user?.organizations?.find(o => (o.organizationId || o.id) === user.activeOrganizationId);
  const activeOrgName = activeOrg?.name || "PrintQ Client";
  const effectiveBrochureColorMode = brochureColorPagesInput.trim() ? "COLOR" : "BW";
  const isCenterClipBinding = bookletBindingType === "CENTER_CLIP";
  const isPerfectBinding = bookletBindingType === "PERFECT_BINDING";

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
  const [previewingCompositionPlan, setPreviewingCompositionPlan] = useState(null);


  // Custom Size State
  const [customWidth, setCustomWidth] = useState("");
  const [customBreadth, setCustomBreadth] = useState("");
  const [customUnit, setCustomUnit] = useState(user.settings?.defaultLengthUnit || "mm");
  const [editingLineId, setEditingLineId] = useState(null); 
  const [activeEditId, setActiveEditId] = useState(null);
  const [activeEditValue, setActiveEditValue] = useState("");
  const syncDebounceRef = useRef(null);
  const skipNextBrochureAutoRecalcRef = useRef(false);
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
     setBookletBindingType("CENTER_CLIP");

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
     setBrochureNestedPrintPlans([]);
     setSelectedNestedPrintPlan(null);
     setBrochureError("");
     setBrochureNotice("");
     setBrochureLoading(false);

     setLaserError("");
     setLaserLoading(false);
     setOffsetError("");
     setOffsetLoading(false);

     setItemTitle("");
     setEditingLineId(null);
   }

   function onLineItemSaved(title, isUpdate = false) {
     resetCalculator();
     setPreviewingCompositionPlan(null);
     setPreviewingLayoutOption(null);
     if (itemAddedToastTimerRef.current) clearTimeout(itemAddedToastTimerRef.current);
     const label = (title || "Item").trim() || "Item";
     setItemAddedToast({
       message: isUpdate ? `"${label}" updated in quotation` : `"${label}" added to quotation`,
       isUpdate,
     });
     itemAddedToastTimerRef.current = setTimeout(() => setItemAddedToast(null), 4000);
   }

   useEffect(() => () => {
     if (itemAddedToastTimerRef.current) clearTimeout(itemAddedToastTimerRef.current);
   }, []);

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
         setBookletBindingType(m.bookletBindingType || "CENTER_CLIP");
       }
       setItemTitle(m.itemTitle || "");
     }

    setItemsPanelExpanded(false);
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
        label: formatPaperStockOptionLabel(s),
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
        label: formatPaperStockOptionLabel(s),
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

  const recalculateBrochurePricing = useCallback(async (overrides = {}) => {
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
        colorPages: brochureColorPagesInput.trim(),
        sides: "DOUBLE",
        isOnlyClipCharge: brochureIsOnlyClipCharge,
        pageNumberingOrientation: overrides.brochureOrientation ?? brochureOrientation,
        bindingType: bookletBindingType,
      };

      const data = await getBrochureLaserQuoteOptions(payload);
      if (data.recommendation?.code === "CENTER_CLIP_NO_FIT_USE_PERFECT_BINDING" && bookletBindingType === "CENTER_CLIP") {
        setBrochureNotice(data.recommendation.message);
        setBookletBindingType("PERFECT_BINDING");
        return;
      }
      if (bookletBindingType === "CENTER_CLIP") {
        setBrochureNotice("");
      }
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
  }, [brochureSizeId, brochureStockItemId, brochureCopies, brochurePagesPerBrochure, customWidth, customBreadth, customUnit, sizeList, brochureColorPagesInput, brochureIsOnlyClipCharge, brochureOrientation, bookletBindingType]);

  const handleBrochureOrientationChange = useCallback((nextOrientation) => {
    if (brochureOrientation === nextOrientation) return;
    setBrochureOrientation(nextOrientation);

    if (activeTab === "brochure" && brochureSizeId && brochureStockItemId && brochureCopies && brochurePagesPerBrochure) {
      skipNextBrochureAutoRecalcRef.current = true;
      window.setTimeout(() => {
        recalculateBrochurePricing({ brochureOrientation: nextOrientation });
      }, 0);
    }
  }, [
    activeTab,
    brochureCopies,
    brochureOrientation,
    brochurePagesPerBrochure,
    brochureSizeId,
    brochureStockItemId,
    recalculateBrochurePricing,
  ]);

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
      if (skipNextBrochureAutoRecalcRef.current) {
        skipNextBrochureAutoRecalcRef.current = false;
        return;
      }
      const timer = setTimeout(recalculateBrochurePricing, 500);
      return () => clearTimeout(timer);
    }
  }, [brochureSizeId, brochureStockItemId, brochureColorPagesInput, brochureCopies, brochurePagesPerBrochure, brochureIsOnlyClipCharge, brochureOrientation, bookletBindingType, activeTab, customWidth, customBreadth, customUnit, recalculateBrochurePricing]);




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

  const brochureWorkflowBadgeMeta = {
    PRINTING_FRIENDLY: { label: "Printing Friendly", tone: "mint" },
    POST_PRINT_FRIENDLY: { label: "Post Print Friendly", tone: "amber" },
    COST_FRIENDLY: { label: "Cost Friendly", tone: "sky" },
    BALANCED: { label: "Balanced", tone: "slate" },
    LOOSE_CENTER_CLIP: { label: "Loose Clip", tone: "rose" },
  };

  const hasLooseCenterClip = (item) => {
    if (!isCenterClipBinding) return false;
    if (item?.signatures?.length) {
      return item.signatures.some((sig) => Number(sig.signaturePages) <= 2);
    }
    if (item?.parts?.length) {
      return item.parts.some((part) => Number(part) <= 2);
    }
    return false;
  };

  const brochureWorkflowBadges = (item) => {
    const tags = item?.workflowTags || [];
    const displayTags = hasLooseCenterClip(item) && !tags.includes("LOOSE_CENTER_CLIP")
      ? [...tags, "LOOSE_CENTER_CLIP"]
      : tags;
    return displayTags.map((tag) => ({
      key: tag,
      label: brochureWorkflowBadgeMeta[tag]?.label || tag,
      tone: brochureWorkflowBadgeMeta[tag]?.tone || "slate",
    }));
  };

  const renderBrochureWorkflowBadge = (badge) => (
    <span
      key={badge.key}
      className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter ${
        badge.tone === "amber"
          ? "bg-amber-100 text-amber-800"
          : badge.tone === "sky"
            ? "bg-sky-100 text-sky-800"
            : badge.tone === "rose"
              ? "bg-rose-100 text-rose-800"
            : badge.tone === "slate"
              ? "bg-brand-navy/8 text-gov-blue/60"
              : "bg-gov-blue-light text-gov-blue"
      }`}
    >
      {badge.label}
    </span>
  );

  const isPostPrintFriendlyPlan = (plan) => {
    if (plan?.workflowTags?.includes("POST_PRINT_FRIENDLY")) return true;
    if (!plan?.signatures?.length) return false;
    return plan.signatures.every((sig) => sig.signaturePages === 4);
  };

  const nestedPlanInstruction = (plan) => {
    if (hasLooseCenterClip(plan)) {
      return "Includes loose 2pp insert sheets; print and clip these with the folded center-pin sets instead of treating the whole plan as a nested fold.";
    }
    if (plan?.workflowSummary) return plan.workflowSummary;
    if (isPostPrintFriendlyPlan(plan)) {
      return "Print every small set below. Cut each set, stack from outer to inner, then center pin.";
    }
    return "Print every set below. Fold each set, then nest from outer to inner.";
  };

  const nestedPlanPrinterNames = (plan) => {
    const names = plan?.signatures
      ?.map((signature) => signature.printerModelName)
      .filter(Boolean) || [];
    return [...new Set(names)];
  };

  const nestedPlanPrinterSummary = (plan, maxVisible = 2) => {
    const names = nestedPlanPrinterNames(plan);
    if (names.length === 0) return "Printer not selected";
    const visible = names.slice(0, maxVisible).join(", ");
    const hiddenCount = names.length - maxVisible;
    return hiddenCount > 0 ? `${visible} +${hiddenCount} more` : visible;
  };

  const paperWasteStatsForSignature = (signature) => {
    const utilization = Number(signature?.fit?.utilization);
    const usedRatio = Number.isFinite(utilization) ? Math.max(0, Math.min(1, utilization)) : 0;
    const usedPercent = Math.round(usedRatio * 100);
    return {
      usedPercent,
      wastePercent: Math.max(0, 100 - usedPercent),
    };
  };

  const paperWasteStatsForPlan = (plan) => {
    const signatures = (plan?.signatures || []).filter((signature) => !signature.piggybackOnRunIndex);
    if (signatures.length === 0) return { usedPercent: 0, wastePercent: 0 };
    const weighted = signatures.reduce((acc, signature) => {
      const weight = Math.max(1, Number(signature.printedSheetsForCopies) || 1);
      const stats = paperWasteStatsForSignature(signature);
      return {
        used: acc.used + stats.usedPercent * weight,
        weight: acc.weight + weight,
      };
    }, { used: 0, weight: 0 });
    const usedPercent = weighted.weight > 0 ? Math.round(weighted.used / weighted.weight) : 0;
    return {
      usedPercent,
      wastePercent: Math.max(0, 100 - usedPercent),
    };
  };

  const nestedPlanPaperUsageLabel = (plan) => {
    if (plan?.printedSheetsForCopies != null) {
      return `${plan.printedSheetsForCopies} print sheet${plan.printedSheetsForCopies === 1 ? "" : "s"} for job`;
    }
    const sheetsPerBook = Number(plan?.physicalSheetsPerBrochure);
    if (!Number.isFinite(sheetsPerBook)) return "Paper usage pending";
    const formatted = Number.isInteger(sheetsPerBook)
      ? String(sheetsPerBook)
      : sheetsPerBook.toFixed(2);
    return `${formatted} sheet${sheetsPerBook === 1 ? "" : "s"} per booklet`;
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
      : "border-gov-blue/10 bg-zinc-200/80 text-gov-blue";

  const renderBrochurePricingBreakdown = (pricingBreakdown = [], totals = null) => {
    if (!pricingBreakdown?.length) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black text-gov-blue/65 uppercase tracking-[0.2em]">Pricing Breakdown</h4>
          {totals?.price != null && (
            <div className="text-lg font-black text-gov-blue">₹{Number(totals.price).toLocaleString()}</div>
          )}
        </div>
        {totals && (
          <div className="text-[10px] font-bold text-gov-blue/70 uppercase tracking-tight px-1">
            {totals.colorPrints ?? 0} color impression{(totals.colorPrints ?? 0) === 1 ? "" : "s"} • {totals.bwPrints ?? 0} B&amp;W impression{(totals.bwPrints ?? 0) === 1 ? "" : "s"}
          </div>
        )}
        <div className="space-y-2">
          {pricingBreakdown.map((row) => (
            <div key={`${row.printerModelId}-${row.pricingKind}`} className="rounded-xl border border-gov-blue/5 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-gov-blue">{row.printerModelName}</div>
                <div className="text-sm font-black text-gov-blue">₹{Number(row.total).toLocaleString()}</div>
              </div>
              <div className="mt-2 space-y-1">
                {row.colorPrints > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-gov-blue/50">
                    <span>Color • {row.colorPrints} × ₹{Number(row.colorUnitCharge).toLocaleString()}</span>
                    <span>₹{Number(row.colorTotal).toLocaleString()}</span>
                  </div>
                )}
                {row.bwPrints > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-gov-blue/50">
                    <span>B&amp;W • {row.bwPrints} × ₹{Number(row.bwUnitCharge).toLocaleString()}</span>
                    <span>₹{Number(row.bwTotal).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const buildBrochureChargeComponents = (pricingBreakdown = []) =>
    pricingBreakdown.flatMap((row) => {
      const parts = [];
      if (row.colorPrints > 0) {
        parts.push({
          role: "printing",
          label: `${row.printerModelName} • Color`,
          amount: row.colorTotal,
          unitPrice: row.colorUnitCharge,
          quantity: row.colorPrints,
          printerModelId: row.printerModelId,
          meta: { pricingKind: row.pricingKind, bucket: "COLOR" },
        });
      }
      if (row.bwPrints > 0) {
        parts.push({
          role: "printing",
          label: `${row.printerModelName} • B&W`,
          amount: row.bwTotal,
          unitPrice: row.bwUnitCharge,
          quantity: row.bwPrints,
          printerModelId: row.printerModelId,
          meta: { pricingKind: row.pricingKind, bucket: "BW" },
        });
      }
      return parts;
    });

  const getBrochureTrimPageSize = () => {
    if (brochureSizeId === "custom") {
      const width = Number(customWidth);
      const breadth = Number(customBreadth);
      if (!width || !breadth) return null;
      return { width, breadth, unit: customUnit };
    }
    const selectedSize = sizeList.find((s) => s.id === brochureSizeId);
    if (!selectedSize) return null;
    return { width: selectedSize.width, breadth: selectedSize.breadth, unit: selectedSize.unit };
  };

  /** Portrait trim page with width as the shorter edge. */
  const normalizeTrimPage = (trimPage) => {
    if (!trimPage?.width || !trimPage?.breadth) return null;
    const w = Number(trimPage.width);
    const b = Number(trimPage.breadth);
    if (!w || !b) return null;
    return w <= b ? { width: w, breadth: b, unit: trimPage.unit } : { width: b, breadth: w, unit: trimPage.unit };
  };

  /**
   * UI Normal  → long-edge pair   → portrait imposition cells.
   * UI Rotated → short-edge pair  → landscape cells (page turned on sheet).
   */
  const previewFootprintForUi = (uiOrientation = brochureOrientation) => uiOrientation;

  /** Trim short/long edges in cm-ish numbers; falls back to A5 when size chart unavailable. */
  const trimEdgesForPreview = (trimPage = getBrochureTrimPageSize()) => {
    const page = normalizeTrimPage(trimPage);
    if (page) {
      return { short: Math.min(page.width, page.breadth), long: Math.max(page.width, page.breadth) };
    }
    return { short: 14.8, long: 21 };
  };

  /** Cell footprint for imposition preview (ROTATED footprint = landscape cell on grid). */
  const impositionCellFootprint = (trimPage, footprintOrientation) => {
    const { short, long } = trimEdgesForPreview(trimPage);
    if (footprintOrientation === "ROTATED") {
      return { cellWidth: long, cellBreadth: short, cellAspectRatio: `${long} / ${short}` };
    }
    return { cellWidth: short, cellBreadth: long, cellAspectRatio: `${short} / ${long}` };
  };

  /** One signature tile (canonical imposition), not the full repeated printer sheet. */
  const canonicalBaseGrid = (signaturePages) => {
    if (signaturePages === 2) return { rows: 1, cols: 1 };
    if (signaturePages === 4) return { rows: 1, cols: 2 };
    if (signaturePages === 8) return { rows: 2, cols: 2 };
    if (signaturePages === 16) return { rows: 2, cols: 4 };
    if (signaturePages === 32) return { rows: 4, cols: 4 };
    const perSide = Math.max(1, signaturePages / 2);
    return { rows: Math.max(1, Math.round(Math.sqrt(perSide))), cols: Math.max(1, Math.round(perSide / Math.max(1, Math.round(Math.sqrt(perSide))))) };
  };

  const baseImpositionSideRows = (sideRows, repeatOnPortion = { across: 1, down: 1 }, signaturePages = 0) => {
    if (!sideRows?.length) return [[]];
    const repeatAcross = Math.max(1, repeatOnPortion.across ?? 1);
    const repeatDown = Math.max(1, repeatOnPortion.down ?? 1);
    const canonical = signaturePages > 0 ? canonicalBaseGrid(signaturePages) : null;
    const derivedRows = Math.max(1, Math.round(sideRows.length / repeatDown));
    const derivedCols = Math.max(1, Math.round((sideRows[0]?.length ?? 1) / repeatAcross));
    const baseRows = canonical ? Math.min(canonical.rows, sideRows.length) : derivedRows;
    const baseCols = canonical
      ? Math.min(canonical.cols, sideRows[0]?.length ?? canonical.cols)
      : derivedCols;

    return sideRows.slice(0, baseRows).map((row) => row.slice(0, baseCols));
  };

  /** Full press sheet when multi-up; otherwise the single signature tile. */
  const impositionSideRowsForDisplay = (sideRows, repeatOnPortion = { across: 1, down: 1 }, signaturePages = 0) => {
    const repeatCopies =
      Math.max(1, repeatOnPortion?.across ?? 1) * Math.max(1, repeatOnPortion?.down ?? 1);
    if (repeatCopies > 1 && sideRows?.length) {
      return sideRows;
    }
    return baseImpositionSideRows(sideRows, repeatOnPortion, signaturePages);
  };

  /** Metrics for the imposition grid shown in inspect (base tile or full repeated sheet). */
  const nestedPreviewMetrics = (signature, sideRows) => {
    const rowCount = Math.max(1, sideRows?.length || 1);
    const colCount = Math.max(1, sideRows?.[0]?.length || 1);
    const impositionFootprint =
      signature?.imposition?.previewFootprintOrientation ??
      signature?.imposition?.orientation ??
      brochureOrientation;
    const footprint = impositionCellFootprint(getBrochureTrimPageSize(), impositionFootprint);
    const previewWidth = footprint.cellWidth * colCount;
    const previewBreadth = footprint.cellBreadth * rowCount;

    return {
      rowCount,
      colCount,
      previewWidth,
      previewBreadth,
      cellAspectRatio: footprint.cellAspectRatio,
      isLandscapeSpread: previewWidth >= previewBreadth,
      isNormalImposition: impositionFootprint === "NORMAL",
      impositionFootprint,
    };
  };

  const impositionPreviewBoxSize = (previewWidth, previewBreadth, maxPx = 260) => {
    const scale = maxPx / Math.max(previewWidth, previewBreadth, 1);
    return {
      widthPx: Math.max(72, Math.round(previewWidth * scale)),
      heightPx: Math.max(72, Math.round(previewBreadth * scale)),
    };
  };

  const renderCustomSizeFields = ({ className = "", widthRef, onWidthEnter, onBreadthEnter } = {}) => (
    <div className={`p-3 bg-gov-blue-light border border-gov-border ${className}`.trim()}>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Custom page size</div>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-2 max-w-lg">
        <label className="flex-1 min-w-[5.5rem]">
          <span className="text-[10px] font-medium text-gray-500 mb-1 block">Width</span>
          <input
            type="number"
            ref={widthRef}
            placeholder="e.g. 210"
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onWidthEnter?.();
              }
            }}
            className="gov-input w-full"
          />
        </label>
        <span className="pb-2.5 text-sm text-gray-400 shrink-0">×</span>
        <label className="flex-1 min-w-[5.5rem]">
          <span className="text-[10px] font-medium text-gray-500 mb-1 block">Height</span>
          <input
            type="number"
            ref={customBreadthRef}
            placeholder="e.g. 297"
            value={customBreadth}
            onChange={(e) => setCustomBreadth(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onBreadthEnter?.();
              }
            }}
            className="gov-input w-full"
          />
        </label>
        <label className="w-[4.5rem] shrink-0">
          <span className="text-[10px] font-medium text-gray-500 mb-1 block">Unit</span>
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            className="gov-input w-full px-2"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="inch">in</option>
          </select>
        </label>
      </div>
    </div>
  );

  const renderNestedImpositionSide = (signature, sideRows, tone = "teal", planPreviewScale = null) => {
    const displayRows = impositionSideRowsForDisplay(sideRows, signature.repeatOnPortion, signature.signaturePages);
    const repeatCopies =
      Math.max(1, signature.repeatOnPortion?.across ?? 1) * Math.max(1, signature.repeatOnPortion?.down ?? 1);
    const { rowCount, colCount, previewWidth, previewBreadth, isNormalImposition, impositionFootprint } =
      nestedPreviewMetrics(signature, displayRows);
    const maxPx = planPreviewScale?.maxPreviewWidth
      ? Math.max(160, Math.min(320, planPreviewScale.maxPreviewWidth * 6))
      : 260;
    const { widthPx, heightPx } = impositionPreviewBoxSize(previewWidth, previewBreadth, maxPx);
    const isShortEdgePair = impositionFootprint === "ROTATED";
    const numberRotation = (cell, rowIndex, colIndex) => {
      if (typeof cell.previewRotationDeg === "number") {
        return `rotate(${cell.previewRotationDeg}deg)`;
      }
      if (colCount === 1 && !isShortEdgePair) {
        return "rotate(90deg)";
      }
      return cell.designOrientation === "INVERTED" ? "rotate(180deg)" : "rotate(0deg)";
    };

    return (
      <div className="overflow-x-auto pb-1">
        <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          {isShortEdgePair ? "Rotated imposition" : "Normal imposition"}
          {repeatCopies > 1 ? ` · full sheet ×${repeatCopies}` : ""}
          <span className="text-gray-400 font-normal normal-case">
            {" "}
            · {isNormalImposition ? "long-edge pair" : "short-edge pair"}
          </span>
        </div>
        <div
          className={`grid gap-1 mx-auto border p-2 ${tone === "teal" ? "border-gov-blue/20 bg-gov-blue/3" : "border-gov-border bg-white"}`}
          style={{
            width: widthPx,
            height: heightPx,
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          }}
        >
          {displayRows.flatMap((row, ri) =>
            row.map((cell, ci) => (
              <div
                key={`${ri}-${ci}-${cell.pageNumber}`}
                title={`${cell.designOrientation.toLowerCase()} page design${isBrochureColorPage(cell.pageNumber) ? " • color page" : ""}`}
                className={`flex items-center justify-center rounded-sm border shadow-sm min-h-0 min-w-0 overflow-hidden ${brochurePreviewPageClass(cell.pageNumber)}`}
              >
                <span
                  className="inline-flex items-center justify-center text-sm font-black leading-none transition-transform"
                  style={{ transform: numberRotation(cell, ri, ci) }}
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
    const footprint = impositionCellFootprint(getBrochureTrimPageSize(), previewFootprintForUi(brochureOrientation));
    const previewWidth = footprint.cellWidth * colCount;
    const previewBreadth = footprint.cellBreadth * rowCount;
    const { widthPx, heightPx } = impositionPreviewBoxSize(previewWidth, previewBreadth);
    const isNormalImposition = brochureOrientation === "NORMAL";
    const partPages = seg.partPages ?? 0;
    const numberRotation = (pageNumber, rowIndex, colIndex) => {
      if (colCount === 1) {
        return "rotate(90deg)";
      }
      if (brochureOrientation === "ROTATED") {
        if (partPages === 8 && rowCount >= 2) {
          return rowIndex === rowCount - 1 ? "rotate(180deg)" : "rotate(0deg)";
        }
        if (partPages === 4) {
          return "rotate(0deg)";
        }
        return "rotate(0deg)";
      }
      if (partPages === 4) {
        return "rotate(0deg)";
      }
      if (partPages === 8 && rowCount >= 2) {
        return rowIndex === rowCount - 1 ? "rotate(180deg)" : "rotate(0deg)";
      }
      if (rowCount >= 2) {
        return rowIndex === rowCount - 1 ? "rotate(180deg)" : "rotate(0deg)";
      }
      return "rotate(0deg)";
    };

    return (
      <div className="overflow-x-auto pb-1">
        <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          {brochureOrientation === "ROTATED" ? "Rotated imposition" : "Normal imposition"}
          <span className="text-gray-400 font-normal normal-case">
            {" "}
            · {isNormalImposition ? "long-edge pair" : "short-edge pair"}
          </span>
        </div>
        <div
          className={`grid gap-2 mx-auto border p-3 ${tone === "teal" ? "border-gov-blue/20 bg-gov-blue/3" : "border-gov-blue/10 bg-white"}`}
          style={{
            width: widthPx,
            height: heightPx,
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
          }}
        >
          {sideRows.flatMap((row, ri) =>
            row.map((pageNumber, ci) => (
              <div
                key={`${ri}-${ci}-${pageNumber}`}
                title={isBrochureColorPage(pageNumber) ? "Color page" : "Black and white page"}
                className={`flex items-center justify-center rounded-sm border shadow-sm min-h-0 min-w-0 ${brochurePreviewPageClass(pageNumber)}`}
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

  const nestedSignatureGroupsForPlan = (plan) => {
    if (!plan) return [];
    return Array.from(
      plan.signatures
        .filter((signature) => !signature.piggybackOnRunIndex)
        .reduce((groups, signature) => {
          const key = String(signature.signaturePages);
          if (!groups.has(key)) {
            groups.set(key, { signaturePages: signature.signaturePages, signatures: [] });
          }
          groups.get(key).signatures.push(signature);
          return groups;
        }, new Map()).values()
    ).sort((a, b) => b.signaturePages - a.signaturePages);
  };

  const nestedPlanPreviewScaleForPlan = (plan) => {
    if (!plan) return null;
    const scale = plan.signatures.filter((signature) => !signature.piggybackOnRunIndex).reduce(
      (acc, signature) => {
        [signature.imposition.front, signature.imposition.back].forEach((sideRows) => {
          const displaySide = impositionSideRowsForDisplay(sideRows, signature.repeatOnPortion, signature.signaturePages);
          const metrics = nestedPreviewMetrics(signature, displaySide);
          acc.maxPreviewWidth = Math.max(acc.maxPreviewWidth, metrics.previewWidth);
          acc.maxPreviewBreadth = Math.max(acc.maxPreviewBreadth, metrics.previewBreadth);
        });
        return acc;
      },
      { maxPreviewWidth: 1, maxPreviewBreadth: 1, paperIsHorizontal: true },
    );
    scale.paperIsHorizontal = scale.maxPreviewWidth >= scale.maxPreviewBreadth;
    return scale;
  };

  const renderCompositionPlanInspect = (plan, planIdx) => {
    if (!plan) return null;
    const groups = nestedSignatureGroupsForPlan(plan);
    const previewScale = nestedPlanPreviewScaleForPlan(plan);
    const wasteStats = paperWasteStatsForPlan(plan);
    const sigSummary = plan.signatures.map((sig) => `${sig.signaturePages}pp`).join(" + ");

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gov-blue">Option {planIdx + 1}</span>
          {brochureWorkflowBadges(plan).map((badge) => renderBrochureWorkflowBadge(badge))}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Print sets", value: plan.printRunCount },
              { label: "Print sheets", value: plan.printedSheetsForCopies ?? plan.physicalSheetsPerBrochure },
              {
                label: "Impressions",
                value: plan.totals?.prints ?? "—",
                hint:
                  plan.totals?.prints != null
                    ? `${plan.totals.colorPrints ?? 0} color · ${plan.totals.bwPrints ?? 0} B&W`
                    : null,
              },
              { label: "Trim waste", value: `${wasteStats.wastePercent}%` },
            ].map((stat) => (
              <div key={stat.label} className="border border-gov-border bg-white px-3 py-2.5 min-w-0">
                <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</div>
                <div className="text-base font-bold text-gov-blue tabular-nums mt-0.5">{stat.value}</div>
                {stat.hint && (
                  <div className="text-[9px] text-gray-500 tabular-nums mt-1">{stat.hint}</div>
                )}
              </div>
            ))}
          </div>
          <div className="border border-gov-border bg-white px-3 py-2.5">
            <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Signature plan</div>
            <div className="text-sm font-bold text-gov-blue mt-0.5 break-words">{sigSummary}</div>
          </div>
        </div>

        <div className="px-3 py-2 bg-gray-50 border border-gov-border text-[10px] text-gray-600 leading-relaxed">
          {nestedPlanInstruction(plan)}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 py-2 bg-gray-50 border border-gov-border text-[10px]">
          <span className="text-gray-500">Printer: <strong className="text-gov-blue">{nestedPlanPrinterSummary(plan, 4)}</strong></span>
          <span className="text-gray-500">Paper used: <strong className="text-gov-blue">{wasteStats.usedPercent}%</strong></span>
          {plan.totals?.price != null && (
            <span className="text-gray-500">Total: <strong className="text-gov-blue">₹{Number(plan.totals.price).toLocaleString()}</strong></span>
          )}
        </div>

        {renderBrochurePricingBreakdown(plan.pricingBreakdown, plan.totals)}

        <div className="space-y-3">
          {groups.map((group) => (
            <div key={`${plan.planId}-${group.signaturePages}`} className="border border-gov-border bg-white">
              <div className="px-2.5 py-2 border-b border-gov-border bg-gray-50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-gov-blue uppercase tracking-wide">
                    {isPerfectBinding
                      ? `${group.signaturePages}pp stack`
                      : group.signaturePages === 2
                        ? "2pp loose insert"
                        : `${group.signaturePages}pp fold`}
                  </div>
                  <div className="text-[9px] text-gray-500">{group.signatures.length} set{group.signatures.length === 1 ? "" : "s"}</div>
                </div>
                <div className="text-[9px] text-gray-500 text-right shrink-0">
                  {group.signaturePages / 2} pp/side
                </div>
              </div>

              {group.signatures.map((signature) => (
                <div key={`${plan.planId}-${signature.runIndex}`} className="p-2.5 border-b border-gov-border last:border-b-0 space-y-2">
                  <div className="flex justify-between gap-2 text-[10px]">
                    <div className="min-w-0">
                      <div className="font-semibold text-gov-blue">
                        Set {signature.runIndex}: {isPerfectBinding ? "Stack" : nestedRoleLabel(signature.nestRole)}
                      </div>
                      <div className="text-gray-500 truncate">Pages {signature.readerPages.join(", ")}</div>
                      <div className="text-gray-500 truncate">{signature.printerModelName || "Printer TBD"}</div>
                    </div>
                    <div className="text-right shrink-0 text-gray-500">
                      <div>{signature.portion.width}×{signature.portion.breadth}{signature.portion.unit}</div>
                      <div>{signature.gridOnPortion.across}×{signature.gridOnPortion.down}</div>
                      <div className="text-amber-700">Waste {paperWasteStatsForSignature(signature).wastePercent}%</div>
                    </div>
                  </div>

                  {signature.cutAfterPrint && (
                    <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">{signature.cutAfterPrint}</div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div className="border border-gov-border bg-gray-50 p-2">
                      <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1.5">Front side</div>
                      {renderNestedImpositionSide(signature, signature.imposition.front, "teal", previewScale)}
                    </div>
                    <div className="border border-gov-border bg-gray-50 p-2">
                      <div className="text-[9px] font-semibold text-gray-500 uppercase mb-1.5">Back side</div>
                      {renderNestedImpositionSide(signature, signature.imposition.back, "navy", previewScale)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-gov-border border-t-gov-blue animate-spin"></div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-gov-bg print:bg-white overflow-x-hidden select-none">

       {/* Professional Printable Letterhead (Only visible in Print) */}
       <div className="print-only w-full mb-12">
          <div className="flex justify-between items-start border-b-4 border-gov-blue pb-8">
             <div className="flex items-center gap-4">
                <BrandLogo className="w-16 h-16 shadow-lg rounded-2xl" />
                <div className="flex flex-col">
                   <span className="text-2xl font-black text-gov-blue tracking-tighter uppercase">Print&shy;Q</span>
                   <span className="text-sm font-bold text-gov-blue uppercase tracking-widest">{activeOrgName}</span>
                </div>
             </div>
             
             <div className="text-right">
                <div className="text-3xl font-black text-gov-blue uppercase tracking-tighter mb-1">Quotation</div>
                <div className="text-[11px] font-black text-gov-blue/70 uppercase tracking-widest leading-relaxed">
                   No: {quoteNumber || "DRAFT"}
                </div>
                <div className="text-[11px] font-black text-gov-blue/70 uppercase tracking-widest mt-0.5">
                   Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {createdBy && (
                   <div className="text-[9px] font-black text-gov-blue uppercase tracking-widest mt-1.5 opacity-80 decoration-brand-teal/30 underline underline-offset-4 decoration-2">
                      Created By: {createdBy.displayName || createdBy.name}
                   </div>
                )}
             </div>

          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-12">
             <div className="space-y-1">
                <div className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest">Quoted For:</div>
                <div className="text-sm font-black text-gov-blue">{selectedCustomer?.name || 'Valued Customer'}</div>
                {selectedCustomer?.companyName && <div className="text-xs font-bold text-gov-blue/60">{selectedCustomer.companyName}</div>}
             </div>
             
             <div className="text-right space-y-1">
                <div className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest">Validity:</div>
                <div className="text-sm font-black text-gov-blue">{validUntil || '---'}</div>
                <div className="text-xs font-bold text-gov-blue/60">Subject to terms and conditions</div>
             </div>
          </div>
          
          <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
             <div className="flex-1">
                <div className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest mb-1">Subject:</div>
                <div className="text-sm font-bold text-gov-blue italic">"{title || 'General Printing Quotation'}"</div>
             </div>
             <div className="text-right">
                <div className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest mb-1">Grand Total:</div>
                <div className="text-xl font-black text-gov-blue">{currency} {lineItems.reduce((acc, curr) => acc + (curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0), 0).toLocaleString()}</div>
             </div>
         </div>

      </div>

       {/* 1. Compact Quote Header */}
       <section className="no-print border-b border-gov-border bg-white px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate("/dashboard/quotes")}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 border border-gov-border shrink-0"
                title="Back to list"
              >
                <MdArrowBack className="w-4 h-4" />
              </button>

              {/* Customer – compact inline block */}
          <div className="flex-1 min-w-[240px] max-w-[340px] border border-gov-border px-2 py-1 bg-white text-[11px] leading-tight">
              <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                 <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 {busy && <div className="w-2.5 h-2.5 border border-gov-border border-t-gov-blue animate-spin"></div>}
              </div>
              <div className="grid grid-cols-[52px_1fr] gap-x-1 gap-y-0.5">
                  <span className="text-gray-500">Cust :</span>
                     <div className="relative flex flex-col items-start min-w-0">
                        <div className="w-full flex items-center gap-1">
                           {!selectedCustomer ? (
                              <div className="relative flex-1 min-w-0">
                                 <input
                                   type="text"
                                   placeholder="Search account..."
                                   value={customerSearch}
                                   onFocus={() => setShowCustomerSearch(true)}
                                   onChange={e => setCustomerSearch(e.target.value)}
                                   onKeyDown={handleCustomerSearchKeyDown}
                                   className={`w-full text-[11px] font-semibold text-gov-blue outline-none border-b py-0 transition-colors ${headerErrors.customerId ? 'border-red-400' : 'border-gov-border focus:border-gov-blue'}`}
                                 />
                                 {showCustomerSearch && (
                                   <div className="absolute top-full left-0 right-0 z-50 mt-0 bg-white border border-gov-border shadow-md py-0.5 max-h-32 overflow-y-auto no-scrollbar">
                                      {customerList.length > 0 ? customerList.map(c => (
                                        <button key={c.id} onClick={() => handleCustomerSelect(c)} className="w-full px-2 py-1 text-left text-[11px] font-medium text-gov-blue hover:bg-gray-50">
                                           {c.name} {c.companyName && <span className="opacity-40 ml-1">({c.companyName})</span>}
                                        </button>
                                      )) : (
                                        <button onClick={() => { setShowCustomerSearch(false); phoneInputRef.current?.focus(); }} className="w-full px-2 py-1.5 text-left">
                                           <div className="text-[10px] font-semibold text-gov-blue">Press Enter to add "{customerSearch}"</div>
                                        </button>
                                      )}
                                   </div>
                                 )}
                              </div>
                           ) : (
                             <div className="flex-1 flex items-center justify-between border-b border-gov-border py-0 min-w-0">
                                <span className="text-[11px] font-semibold text-gov-blue truncate">{selectedCustomer.name}</span>
                                <button onClick={() => { setSelectedCustomer(null); setCustomerId(null); syncHeader({ customerId: null }); }} className="shrink-0 ml-1">
                                   <MdClose className="w-3 h-3 text-red-400" />
                                </button>
                             </div>
                           )}
                           {!selectedCustomer && (
                              <button onClick={() => setShowNewCustModal(true)} className="p-0.5 px-1 bg-gov-blue-light text-gov-blue hover:bg-gov-blue hover:text-white border border-gov-border shrink-0" title="Register new customer">
                                 <MdPersonAdd className="w-3.5 h-3.5" />
                              </button>
                           )}
                        </div>
                        {headerErrors.customerId && <span className="text-[8px] text-red-500">{headerErrors.customerId[0]}</span>}
                     </div>
                  <span className="text-gray-500">Phone :</span>
                  <span className="font-medium text-gov-blue truncate">
                    {!selectedCustomer && customerSearch.trim() ? (
                        <input ref={phoneInputRef} type="text" placeholder="Phone..." value={pendingPhone} onFocus={() => setShowCustomerSearch(false)} onChange={e => setPendingPhone(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addressInputRef.current?.focus(); } }} className="w-full text-[11px] font-semibold text-gov-blue outline-none border-b border-gov-border bg-transparent py-0" />
                    ) : (selectedCustomer?.phone || "--")}
                  </span>
                  <span className="text-gray-500">Address :</span>
                  <span className="font-medium text-gov-blue truncate">
                    {!selectedCustomer && customerSearch.trim() ? (
                        <input ref={addressInputRef} type="text" placeholder="Address..." value={pendingAddress} onFocus={() => setShowCustomerSearch(false)} onChange={e => setPendingAddress(e.target.value)} onKeyDown={async e => { if (e.key === "Enter") { e.preventDefault(); setBusy(true); try { const payload = { name: customerSearch.trim(), phone: pendingPhone.trim() || undefined, billingAddress: pendingAddress.trim() ? { line1: pendingAddress.trim() } : undefined, isActive: true }; const res = await createCustomer(payload); handleCustomerSelect(res.customer); setCustomerSearch(""); } catch (err) { console.error("Failed to quick-create customer", err); } finally { setBusy(false); } } }} className="w-full text-[11px] font-semibold text-gov-blue outline-none border-b border-gov-border bg-transparent py-0" />
                    ) : (selectedCustomer?.billingAddress ? `${selectedCustomer.billingAddress.line1}${selectedCustomer.billingAddress.city ? ', ' + selectedCustomer.billingAddress.city : ''}` : "--")}
                  </span>
              </div>
          </div>

          {/* Subject / Status / Valid – inline */}
          <div className="flex items-end gap-2 flex-1 min-w-[280px]">
              <div className="flex-1 min-w-[120px]">
                 <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Subject</label>
                 <input type="text" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} onBlur={() => syncHeader({ title: title.trim() })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); itemTitleRef.current?.focus(); } }} ref={titleInputRef} className={`gov-input py-1 text-xs ${headerErrors.title ? 'border-red-400' : ''}`} />
                 {headerErrors.title && <span className="text-[8px] text-red-500">{headerErrors.title[0]}</span>}
               </div>
              <div className="w-24">
                 <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Status</label>
                 <select value={status} onChange={(e) => { const v = e.target.value; setStatus(v); syncHeader({ status: v }); }} className="gov-input py-1 text-xs cursor-pointer">
                    <option value="DRAFT">Draft</option><option value="SENT">Sent</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option>
                 </select>
              </div>
              <div className="w-28">
                 <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Valid Till</label>
                 <input type="date" value={validUntil} onChange={(e) => { setValidUntil(e.target.value); syncHeader({ validUntil: e.target.value || null }); }} className="gov-input py-1 text-xs" />
              </div>
          </div>

          {/* Quote # & actions */}
          <div className="flex items-center gap-1.5 shrink-0">
              <BrandLogo className="w-6 h-6" />
              <span className="px-2 py-1 bg-gov-blue text-white text-[11px] font-bold">{quoteNumber || "DRAFT"}</span>
              <button onClick={handleWhatsAppShare} className={`flex items-center gap-1 px-2 py-1 border text-[11px] ${shareError ? 'border-red-400 text-red-500 bg-red-50' : 'border-gov-border text-gray-600 hover:border-gov-blue'}`} title="WhatsApp">
                <FaWhatsapp className="w-3.5 h-3.5" /><span>{shareError ? '!' : 'Share'}</span>
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1 px-2 py-1 border border-gov-border text-[11px] text-gray-600 hover:border-gov-blue" title="Print">
                <MdPrint className="w-3.5 h-3.5" /><span>Print</span>
              </button>
          </div>
      </div>
      </section>

      {/* 2. Quotation Items — capped height + collapsible so form/options keep space */}
      <section className="bg-white print:bg-white border-b border-gov-border shrink-0 no-print">
          <div className="w-full overflow-hidden flex flex-col">
              <div className="px-3 py-1 border-b border-gov-border bg-gray-50 flex items-center justify-between gap-2">
                 <button
                   type="button"
                   onClick={() => setItemsPanelExpanded((v) => !v)}
                   className="flex items-center gap-1.5 min-w-0 hover:text-gov-blue transition-colors"
                   title={itemsPanelExpanded ? "Collapse items list" : "Expand items list"}
                 >
                   {itemsPanelExpanded ? (
                     <MdExpandLess className="w-4 h-4 text-gov-blue shrink-0" />
                   ) : (
                     <MdExpandMore className="w-4 h-4 text-gray-500 shrink-0" />
                   )}
                   <span className={QUOTE_SECTION_LABEL_CLASS}>Quotation Items</span>
                   <span className={`text-[11px] font-semibold tabular-nums transition-colors ${itemAddedToast ? "text-emerald-600 font-bold" : "text-gov-blue"}`}>
                     ({lineItems.length})
                   </span>
                 </button>
                 <div className="flex items-center gap-3 shrink-0">
                   {!itemsPanelExpanded && lineItems.length > 0 && (
                     <span className="text-[10px] text-gray-500 hidden sm:inline truncate max-w-[200px]">
                       {lineItems.map((i) => i.meta?.itemTitle || i.title).filter(Boolean).slice(0, 3).join(" · ")}
                       {lineItems.length > 3 ? ` +${lineItems.length - 3}` : ""}
                     </span>
                   )}
                   <span className="text-[11px] font-bold text-gov-blue tabular-nums">
                     {currency} {lineItems.reduce((acc, curr) => acc + (curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0), 0).toLocaleString()}
                   </span>
                 </div>
              </div>

              {itemsPanelExpanded && (
              <div className={`overflow-y-auto no-scrollbar ${QUOTE_ITEMS_SCROLL_MAX} ${lineItems.length === 0 ? "py-4" : ""}`}>
                 {lineItems.length === 0 ? (
                   <div className="py-4 flex items-center justify-center text-[11px] text-gray-400 uppercase tracking-wider">No items yet — use the form below</div>
                 ) : (
                   <table className="gov-table text-xs">
                      <thead className="sticky top-0 z-[1] bg-gray-50 shadow-[0_1px_0_0_#d1d5db]">
                        <tr>
                            <th className="w-8 pl-3">#</th>
                            <th>Description</th>
                            <th className="w-16 text-center">Qty</th>
                            <th className="w-28 text-right pr-3">Total (₹)</th>
                            <th className="w-16 text-right pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => {
                          const primaryComp = item.chargeComponents?.[0] || {};
                          const lineTotal = item.chargeComponents?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0;

                          return (
                            <tr key={item.id || item._id} className="group hover:bg-gray-50">
                              <td className="pl-3 py-1 text-gray-400 tabular-nums align-top">{idx + 1}</td>
                              <td className="py-1 align-top max-w-0">
                                 <div className="flex flex-col pr-2 min-w-0">
                                    <input type="text" value={item.meta?.itemTitle || item.title || ''} onChange={(e) => handleUpdateLineItem(item.id || item._id, { meta: { ...item.meta, itemTitle: e.target.value }, title: e.target.value })} className="bg-transparent border-none text-xs font-semibold text-gov-blue focus:ring-0 p-0 w-full truncate" placeholder="Title..." />
                                    <input type="text" value={item.description} onChange={(e) => handleUpdateLineItem(item.id || item._id, { description: e.target.value })} className="bg-transparent border-none text-[10px] text-gray-500 focus:ring-0 p-0 w-full truncate" title={item.description} />
                                 </div>
                              </td>
                              <td className="py-1 text-center font-medium text-gray-700 align-top tabular-nums">{item.quantity}</td>
                              <td className="py-1 text-right pr-3 align-top">
                                 <div className="flex flex-col items-end">
                                    <input type="number" value={activeEditId === (item.id || item._id) ? activeEditValue : lineTotal.toFixed(2)} onFocus={() => { setActiveEditId(item.id || item._id); setActiveEditValue(lineTotal || ""); }} onBlur={() => { setActiveEditId(null); setActiveEditValue(""); }} onChange={(e) => { setActiveEditValue(e.target.value); if (e.target.value !== "") { handleUpdateLineItem(item.id || item._id, { totalAmount: e.target.value }); } }} onWheel={(e) => e.currentTarget.blur()} className="w-20 bg-transparent border-none text-right text-xs font-bold text-gov-blue focus:ring-0 p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    <span className="text-[9px] text-gray-400">{currency}</span>
                                 </div>
                              </td>
                              <td className="py-1 pr-2 align-top">
                                 <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                                    <button onClick={() => handleEditLineItem(item)} className="p-1 text-gray-400 hover:text-gov-blue border border-transparent hover:border-gov-border" title="Edit"><MdEdit className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteLineItem(item.id || item._id)} className="p-1 text-gray-300 hover:text-red-500 border border-transparent hover:border-red-200" title="Delete"><MdDeleteOutline className="w-3.5 h-3.5" /></button>
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                 )}
              </div>
              )}

              <div className="px-3 py-1 bg-gray-50 border-t border-gov-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 min-w-0">
                     <span className="text-gray-500">Items: <strong className="text-gov-blue">{lineItems.length}</strong></span>
                     <span className="text-gray-500 hidden sm:inline">Status: <strong className="text-gov-blue uppercase">{status}</strong></span>
                     {shareError && <span className="text-red-500 text-[10px] truncate">{shareError}</span>}
                     {lineItems.length > 3 && itemsPanelExpanded && (
                       <button type="button" onClick={() => setItemsPanelExpanded(false)} className="text-[10px] text-gov-blue/70 hover:text-gov-blue underline underline-offset-2 hidden md:inline">
                         Collapse to focus on form
                       </button>
                     )}
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                      <span className="text-[10px] text-gray-500 uppercase">Grand Total</span>
                      <span className="text-base font-bold text-gov-blue tabular-nums">
                        {currency} {lineItems.reduce((acc, curr) => acc + (curr.chargeComponents?.reduce((a, c) => a + (c.amount || 0), 0) || 0), 0).toLocaleString()}
                      </span>
                  </div>
              </div>
          </div>
      </section>

      {/* Print-only full items table */}
      {lineItems.length > 0 && (
        <section className="print-only bg-white border-b border-gov-border">
          <table className="gov-table text-xs w-full">
            <thead>
              <tr>
                <th className="w-8 pl-3">#</th>
                <th>Description</th>
                <th className="w-16 text-center">Qty</th>
                <th className="w-28 text-right pr-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => {
                const lineTotal = item.chargeComponents?.reduce((acc, c) => acc + (c.amount || 0), 0) || 0;
                return (
                  <tr key={item.id || item._id}>
                    <td className="pl-3 py-1">{idx + 1}</td>
                    <td className="py-1">
                      <div className="font-semibold">{item.meta?.itemTitle || item.title}</div>
                      <div className="text-[10px] text-gray-600">{item.description}</div>
                    </td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right pr-3 font-bold">{currency} {lineTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Item saved feedback — visible even when items panel is collapsed */}
      {itemAddedToast && (
        <div className="no-print shrink-0 px-3 py-2 bg-emerald-50 border-b border-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MdCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800 truncate">{itemAddedToast.message}</span>
            <span className="text-[10px] text-emerald-600 shrink-0 hidden sm:inline">
              · {lineItems.length} item{lineItems.length === 1 ? "" : "s"} total
            </span>
            {!itemsPanelExpanded && (
              <button
                type="button"
                onClick={() => setItemsPanelExpanded(true)}
                className="text-[10px] font-semibold text-emerald-700 underline underline-offset-2 shrink-0"
              >
                View list
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setItemAddedToast(null)}
            className="p-0.5 text-emerald-600 hover:text-emerald-900 shrink-0"
            title="Dismiss"
          >
            <MdClose className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Print Configuration Calculator — flex-1 fills all remaining viewport height */}
      <section id="calc-top" className="no-print bg-white flex flex-col flex-1 min-h-0 basis-0">
          {/* Tab bar: both columns always show sub-tab row (icons when parent inactive) */}
          <div className="flex items-stretch border-b border-gov-border bg-gray-50 shrink-0">
             {/* Laser Printing + sub-options */}
             <div className="flex flex-col shrink-0 border-r border-gov-border w-[15rem]">
                <button
                  type="button"
                  onClick={() => setActiveTab("laser")}
                  className={`flex w-full items-center justify-center gap-1.5 px-4 min-h-[2.5rem] text-xs font-semibold transition-colors ${isLaserTab(activeTab) ? "bg-gov-blue text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <MdComputer className="w-4 h-4 shrink-0" />
                  Laser Printing
                </button>

                <div className={`flex w-full border-t ${isLaserTab(activeTab) ? "border-gov-blue/20 bg-gov-blue-light/50" : "border-gov-border bg-gray-100/80"}`}>
                  {LASER_SUB_TABS.map((mode) => {
                    const laserActive = isLaserTab(activeTab);
                    const modeSelected = activeTab === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        title={mode.label}
                        onClick={() => setActiveTab(mode.id)}
                        className={`flex flex-1 items-center justify-center gap-1 min-h-[2rem] border-r border-gov-blue/15 last:border-r-0 transition-colors ${
                          laserActive
                            ? `px-2 text-[11px] font-medium ${modeSelected ? "bg-white text-gov-blue font-semibold shadow-[inset_0_-2px_0_0_#1a3a6b]" : "text-gray-600 hover:bg-white/60"}`
                            : "px-2 text-gray-400 hover:text-gov-blue hover:bg-white/70"
                        }`}
                      >
                        <mode.icon className={laserActive ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
                        {laserActive && <span className="truncate">{mode.label}</span>}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* Offset Printing + sub-options */}
             <div className="flex flex-col shrink-0 border-r border-gov-border w-[15rem]">
                <button
                  type="button"
                  onClick={() => setActiveTab("offset")}
                  className={`flex w-full items-center justify-center gap-1.5 px-4 min-h-[2.5rem] text-xs font-semibold transition-colors ${isOffsetTab(activeTab) ? "bg-gov-blue text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <MdPrint className="w-4 h-4 shrink-0" />
                  Offset Printing
                </button>

                <div className={`flex w-full border-t ${isOffsetTab(activeTab) ? "border-gov-blue/20 bg-gov-blue-light/50" : "border-gov-border bg-gray-100/80"}`}>
                  {OFFSET_SUB_TABS.map((mode) => {
                    const offsetActive = isOffsetTab(activeTab);
                    const modeSelected = activeTab === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        title={mode.label}
                        onClick={() => setActiveTab(mode.id)}
                        className={`flex flex-1 items-center justify-center gap-1 min-h-[2rem] border-r border-gov-blue/15 last:border-r-0 transition-colors ${
                          offsetActive
                            ? `px-2 text-[11px] font-medium ${modeSelected ? "bg-white text-gov-blue font-semibold shadow-[inset_0_-2px_0_0_#1a3a6b]" : "text-gray-600 hover:bg-white/60"}`
                            : "px-2 text-gray-400 hover:text-gov-blue hover:bg-white/70"
                        }`}
                      >
                        <mode.icon className={offsetActive ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
                        {offsetActive && <span className="truncate">{mode.label}</span>}
                      </button>
                    );
                  })}
                </div>
             </div>

             <div className="flex items-center px-3 flex-1 min-w-0 min-h-[2.5rem]">
               <span className={`${QUOTE_SECTION_LABEL_CLASS} truncate`}>Print Configuration & Pricing</span>
             </div>
          </div>

          <div className="p-3 flex-1 min-h-0 overflow-y-auto flex flex-col">
            {activeTab === "laser" ? (
              <div className={QUOTE_CALC_ROW_CLASS}>
                  {/* Left: Inputs */}
                  <div className={QUOTE_FORM_COLUMN_CLASS}>
                      <div className={QUOTE_INPUT_GRID_CLASS}>
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


                          {laserSizeId === 'custom' && renderCustomSizeFields({
                            className: "col-span-full",
                            widthRef: customWidthRef,
                            onWidthEnter: () => customBreadthRef.current?.focus(),
                            onBreadthEnter: () => laserStockRef.current?.focus(),
                          })}

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
                              <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Charge Method</label>
                              <div className="flex bg-zinc-50 p-1 rounded-xl border border-gov-blue/5 h-11">
                                 {[
                                   { id: true, label: "Printing Only" },
                                   { id: false, label: "Slab Charge" }
                                 ].map(m => (
                                   <button
                                     key={m.label}
                                     onClick={() => setIsOnlyClipCharge(m.id)}
                                     className={`flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isOnlyClipCharge === m.id ? 'bg-white text-gov-blue shadow-sm' : 'text-gov-blue/60 hover:text-gov-blue/80'}`}
                                   >
                                     {m.label}
                                   </button>
                                 ))}
                              </div>
                           </div>
                      </div>

                   
                      <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                             <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Colour Mode</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-gov-blue/5">
                                {['COLOR', 'BW'].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setLaserColorMode(m)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${laserColorMode === m ? 'bg-white text-gov-blue shadow-sm' : 'text-gov-blue/60 hover:text-gov-blue/80'}`}
                                  >
                                    {m === 'BW' ? 'B&W' : 'Multicolor'}
                                  </button>
                                ))}
                             </div>
                          </div>
                          <div className="flex-1 space-y-2">
                             <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Sides</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-gov-blue/5">
                                {['SINGLE', 'DOUBLE'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setLaserSides(s)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${laserSides === s ? 'bg-white text-gov-blue shadow-sm' : 'text-gov-blue/60 hover:text-gov-blue/80'}`}
                                  >
                                    {s === 'SINGLE' ? 'Front Only' : 'Front & Back'}
                                  </button>
                                ))}
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Pricing Preview */}
                  <div className={`${QUOTE_OPTIONS_PANEL_CLASS} min-h-[240px] ${!!editingLineId ? QUOTE_OPTIONS_PANEL_ACTIVE : QUOTE_OPTIONS_PANEL_IDLE}`}>
                       <div className="mb-2 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                             <MdOutlineAnalytics className="w-4 h-4 text-gov-blue shrink-0" />
                             <h3 className={`text-[11px] font-semibold text-gov-blue uppercase tracking-wide truncate ${OPT_COMPACT}`}>
                                Options
                             </h3>
                             <h3 className={`${OPT_EXPAND} text-[11px] font-semibold text-gov-blue uppercase tracking-wide`}>
                                {!!editingLineId ? "Editing Line Item" : "Printer Options"}
                             </h3>
                          </div>
                          <span className="hidden lg:block text-[9px] text-gray-400 uppercase tracking-wide shrink-0 ml-1 group-hover/options:hidden">Hover to expand</span>
                          {laserLoading && <div className="w-3.5 h-3.5 border border-gov-border border-t-gov-blue animate-spin shrink-0"></div>}
                       </div>

                      {laserError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{laserError}</p>
                        </div>
                      ) : laserPricingOptions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdComputer className={`w-12 h-12 ${laserSizeId && laserStockItemId && laserCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${laserSizeId && laserStockItemId && laserCopies ? 'text-red-400' : 'text-gov-blue/65'}`}>
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
                                    className={`p-2 lg:group-hover/options:p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between gap-2 group cursor-pointer transition-all ${!isPrintable ? 'opacity-50 grayscale bg-zinc-50 border-red-100 cursor-not-allowed' : (isSelected ? 'border-gov-blue ring-2 lg:group-hover/options:ring-4 ring-brand-teal/10 bg-gov-blue/[0.02]' : 'hover:border-gov-blue/40 border-gov-blue/5')}`}
                                   >
                                      <div className="flex-1 min-w-0">
                                         <div className={`${OPT_COMPACT} flex items-center justify-between gap-2`}>
                                           <div className="text-[11px] font-black text-gov-blue truncate min-w-0">{opt.printerModelName}</div>
                                           <div className="text-sm font-black text-gov-blue shrink-0">
                                              {isPrintable ? `₹${opt.pricing.total.toLocaleString()}` : '--'}
                                           </div>
                                         </div>
                                         <div className={`${OPT_COMPACT} text-[9px] font-bold text-gov-blue/55 uppercase tracking-tight mt-0.5 truncate`}>
                                            {isPrintable ? `${opt.prints} pr · ${opt.sheets} sh` : (opt.unprintableReason?.replace(/_/g, ' ') || 'Unavailable')}
                                         </div>
                                         <div className={`${OPT_EXPAND}`}>
                                         <div className="text-xs font-black text-gov-blue flex items-center gap-2">
                                            {opt.printerModelName}
                                            {idx === 0 && isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-gov-blue-light text-gov-blue rounded uppercase tracking-tighter">Best Value</span>}
                                            {!isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded uppercase tracking-tighter shadow-sm">Non-Printable</span>}
                                         </div>
                                         <div className="text-[10px] font-bold text-gov-blue/65 uppercase tracking-tight mt-1 flex flex-wrap items-center gap-x-2">
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
                                      </div>
                                      <div className={`${OPT_EXPAND_FLEX} items-center gap-4 shrink-0`}>
                                         {opt.layout && isPrintable && (
                                           <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewingLayoutOption(opt);
                                            }}
                                            className="p-2 text-gov-blue font-black text-[9px] uppercase tracking-widest hover:bg-gov-blue/10 rounded-lg transition-all"
                                           >
                                              Inspect
                                           </button>
                                         )}
                                         <div className="text-right min-w-[70px]">
                                            <div className="text-lg font-black text-gov-blue">
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
                             <div className="mt-auto pt-2 border-t border-gov-border shrink-0 flex gap-2 px-0.5">
                                {editingLineId && (
                                  <button
                                    onClick={resetCalculator}
                                    className={`px-2 text-[10px] font-black uppercase tracking-widest text-gov-blue/65 hover:text-red-400 transition-colors ${OPT_EXPAND}`}
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
                                    onLineItemSaved(newLineItem.title || itemTitle, !!editingLineId);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 text-xs lg:group-hover/options:text-sm py-2"
                                >
                                   {!!editingLineId ? <MdCheckCircle className="w-4 h-4 shrink-0" /> : <MdAdd className="w-4 h-4 shrink-0" />}
                                   <span className={`truncate ${OPT_COMPACT}`}>
                                     {!!editingLineId ? "Update" : "Add"} · ₹{selectedLaserOption.pricing.total.toLocaleString()}
                                   </span>
                                   <span className={`truncate ${OPT_EXPAND}`}>
                                     {!!editingLineId ? "Update Line Item" : "Add to Quotation"}
                                   </span>
                                </PrimaryButton>
                             </div>
                           )}
                         </div>
                      )}
                  </div>
              </div>
            ) : activeTab === "brochure" ? (
              <div className={`${QUOTE_CALC_ROW_CLASS} animate-fade-in`}>
                  {/* Left: Inputs */}
                  <div className={QUOTE_FORM_COLUMN_CLASS}>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Binding Type</label>
                          <div className="flex border border-gov-border">
                            {[
                              { id: "CENTER_CLIP", label: "Center Clip" },
                              { id: "PERFECT_BINDING", label: "Perfect Binding" },
                            ].map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => setBookletBindingType(mode.id)}
                                className={`flex-1 py-2 text-xs font-semibold border-r border-gov-border last:border-r-0 transition-colors ${bookletBindingType === mode.id ? "bg-gov-blue text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500 leading-snug">
                            {isCenterClipBinding
                              ? "Nested center-pin folded signatures with full composition intelligence."
                              : "Sequential folded stack signatures for perfect binding."}
                          </p>
                        </div>

                      <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                               if (!next) return;
                               if (next === "custom") {
                                 setBrochureSizeId("custom");
                                 setCustomWidth("");
                                 setCustomBreadth("");
                                 return;
                               }
                               setBrochureSizeId(next);
                             }}
                           />
                          </div>

                          {brochureSizeId === 'custom' && renderCustomSizeFields()}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <SearchableSelect
                             label="Paper / Stock"
                             options={laserStockOptions}
                             value={brochureStockItemId}
                             placeholder="Search Inventory..."
                             onChange={e => setBrochureStockItemId(e.target.value)}
                             onSearch={fetchLaserStocks}
                           />

                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Orientation</label>
                            <div className="flex border border-gov-border">
                              <button
                                type="button"
                                onClick={() => handleBrochureOrientationChange("NORMAL")}
                                className={`flex-1 flex items-center justify-between gap-2 px-2 py-1.5 border-r border-gov-border transition-colors min-w-0 ${brochureOrientation === "NORMAL" ? "bg-gov-blue text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                              >
                                <span className="text-xs font-semibold truncate">Normal</span>
                                <div className={`w-5 h-6 border flex items-center justify-center shrink-0 ${brochureOrientation === "NORMAL" ? "border-white/70" : "border-gov-border bg-gray-50"}`}>
                                  <span className="text-sm font-bold leading-none">A</span>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBrochureOrientationChange("ROTATED")}
                                className={`flex-1 flex items-center justify-between gap-2 px-2 py-1.5 transition-colors min-w-0 ${brochureOrientation === "ROTATED" ? "bg-gov-blue text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                              >
                                <span className="text-xs font-semibold truncate">Rotated</span>
                                <div className={`w-9 h-4 border flex items-center justify-center shrink-0 ${brochureOrientation === "ROTATED" ? "border-white/70" : "border-gov-border bg-gray-50"}`}>
                                  <span className="text-[10px] font-bold leading-none">A</span>
                                </div>
                              </button>
                            </div>
                          </div>
                          </div>

                      </div>

                      <div className="grid grid-cols-2 gap-2">
                           <TextField 
                              label="Pages per Booklet" 
                              type="number" 
                              value={brochurePagesPerBrochure} 
                              onChange={e => setBrochurePagesPerBrochure(e.target.value)} 
                           />
                           <TextField 
                              label="No of Copies" 
                              type="number" 
                              value={brochureCopies} 
                              onChange={e => setBrochureCopies(e.target.value)} 
                           />
                      </div>

                      <label className="block">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Color Pages</span>
                          <span className="text-[10px] text-gray-400 uppercase">blank = all B&W</span>
                        </div>
                        <input
                          type="text"
                          value={brochureColorPagesInput}
                          onChange={e => setBrochureColorPagesInput(e.target.value)}
                          placeholder="ALL or 1,6,8 or 1-6,56,20-25"
                          className="gov-input"
                        />
                        <div className="mt-1 border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 leading-snug">
                          Enter color pages as ALL, individual (1,6,8), ranges (1-6), or mixed (1-6,56,20-25).
                        </div>
                      </label>

                      <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Charge Method</label>
                          <div className="flex border border-gov-border">
                             {[
                               { id: true, label: "Printing Only" },
                               { id: false, label: "Slab Charge" }
                             ].map(m => (
                               <button
                                 key={m.label}
                                 type="button"
                                 onClick={() => setBrochureIsOnlyClipCharge(m.id)}
                                 className={`flex-1 py-2 text-xs font-semibold border-r border-gov-border last:border-r-0 transition-colors ${brochureIsOnlyClipCharge === m.id ? 'bg-gov-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                               >
                                 {m.label}
                               </button>
                             ))}
                          </div>
                      </div>

                  </div>

                  {/* Right: Brochure Composition \u0026 Pricing */}
                  <div className={`${QUOTE_OPTIONS_PANEL_CLASS} min-h-[280px] ${!!editingLineId ? QUOTE_OPTIONS_PANEL_ACTIVE : QUOTE_OPTIONS_PANEL_IDLE}`}>
                      <div className="mb-2 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                             <MdLayers className="w-4 h-4 text-gov-blue shrink-0" />
                             <h3 className={`text-[11px] font-semibold text-gov-blue uppercase tracking-wide truncate ${OPT_COMPACT}`}>
                                Options
                             </h3>
                             <h3 className={`${OPT_EXPAND} text-[11px] font-semibold text-gov-blue uppercase tracking-wide`}>
                                {!!editingLineId ? "Editing Booklet" : "Composition Options"}
                             </h3>
                          </div>
                          <span className="hidden lg:block text-[9px] text-gray-400 uppercase tracking-wide shrink-0 ml-1 group-hover/options:hidden">Hover to expand</span>
                          {brochureLoading && <div className="w-3.5 h-3.5 border border-gov-border border-t-gov-blue animate-spin shrink-0"></div>}
                      </div>

                      {brochureNotice && (
                        <div className={`${OPT_EXPAND} mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] font-bold text-amber-800 leading-relaxed`}>
                          {brochureNotice}
                        </div>
                      )}

                      {brochureError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{brochureError}</p>
                        </div>
                      ) : brochureViews.length === 0 && brochureNestedPrintPlans.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdLayers className={`w-12 h-12 ${brochureSizeId && brochureStockItemId && brochureCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${brochureSizeId && brochureStockItemId && brochureCopies ? 'text-red-400' : 'text-gov-blue/65'}`}>
                             {brochureSizeId && brochureStockItemId && brochureCopies 
                               ? "No booklet composition possible for this page count" 
                               : "Configure booklet details to see options"}
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
                                   className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all text-left min-w-[140px] ${selectedBrochureView?.viewId === view.viewId ? 'bg-gov-blue text-white border-gov-blue shadow-lg shadow-gov-blue/20' : 'bg-white text-gov-blue border-gov-blue/5 hover:border-gov-blue/30'}`}
                                 >
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Split</div>
                                    <div className="flex items-center gap-1 flex-wrap mb-1">
                                      {brochureWorkflowBadges(view).map((badge) => renderBrochureWorkflowBadge(badge))}
                                    </div>
                                    <div className="text-sm font-black">[{view.parts.join(', ')}]</div>
                                    <div className="text-[9px] font-bold uppercase tracking-tighter mt-1 opacity-80">{view.physicalSheetsPerBrochure} Sheets</div>
                                 </button>
                               ))}
                            </div>
                          )}

                           {brochureNestedPrintPlans.length > 0 && (
                             <div className="space-y-2 flex-1 flex flex-col min-h-0">
                               <div className="flex items-center justify-between px-0.5 shrink-0">
                                 <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                   {isPerfectBinding ? "Perfect binding" : "Center pin"} · {brochureNestedPrintPlans.length} plan{brochureNestedPrintPlans.length === 1 ? "" : "s"}
                                 </h4>
                               </div>

                              <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
                                 {brochureNestedPrintPlans.map((plan, planIdx) => {
                                   const isPlanSelected = selectedNestedPrintPlan?.planId === plan.planId;
                                   const planPrice = plan.totals?.price != null ? Number(plan.totals.price).toLocaleString() : null;
                                   const sigSummary = plan.signatures.map((sig) => `${sig.signaturePages}pp`).join("+");
                                   const wasteStats = paperWasteStatsForPlan(plan);
                                   return (
                                   <div
                                     key={plan.planId}
                                    onClick={() => setSelectedNestedPrintPlan(plan)}
                                    className={`p-2 border bg-white flex items-center gap-2 cursor-pointer transition-all w-full min-w-0 ${isPlanSelected ? "border-gov-blue ring-1 ring-gov-blue bg-gov-blue/[0.02]" : "border-gov-border hover:border-gov-blue/40"}`}
                                   >
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-1.5 flex-wrap">
                                         <span className="text-[11px] font-bold text-gov-blue">Option {planIdx + 1}</span>
                                         {brochureWorkflowBadges(plan).slice(0, 2).map((badge) => renderBrochureWorkflowBadge(badge))}
                                       </div>
                                       <div className="text-[9px] text-gray-500 truncate mt-0.5">
                                         {sigSummary} · {nestedPlanPaperUsageLabel(plan)} · waste {wasteStats.wastePercent}%
                                       </div>
                                       <div className="text-[9px] text-gray-400 truncate">
                                         {nestedPlanPrinterSummary(plan, 2)}
                                       </div>
                                     </div>
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setPreviewingCompositionPlan({ plan, planIdx });
                                       }}
                                       className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-gov-blue hover:bg-gov-blue/10 border border-gov-border shrink-0"
                                     >
                                       Inspect
                                     </button>
                                     {planPrice != null && (
                                       <div className="text-sm font-bold text-gov-blue shrink-0 tabular-nums">₹{planPrice}</div>
                                     )}
                                   </div>
                                 );})}
                               </div>

                               {selectedNestedPrintPlan && (
                                 <div className="mt-auto pt-2 border-t border-gov-border shrink-0 flex gap-2">
                                     {editingLineId && (
                                       <button
                                         onClick={resetCalculator}
                                         className={`px-2 text-[10px] font-black uppercase tracking-widest text-gov-blue/65 hover:text-red-400 transition-colors ${OPT_EXPAND}`}
                                       >
                                         Cancel
                                       </button>
                                     )}
                                     <PrimaryButton
                                       onClick={async () => {
                                         const plan = selectedNestedPrintPlan;
                                         const selPaper = stockItemList.find((s) => s.id === brochureStockItemId);
                                         let sizeName = "Custom Booklet";
                                         if (brochureSizeId === "custom") {
                                           sizeName = `Custom (${customWidth}x${customBreadth}${customUnit})`;
                                         } else {
                                           const selSize = sizeList.find((s) => s.id === brochureSizeId);
                                           sizeName = selSize ? `${selSize.name}` : "Standard Booklet";
                                         }

                                         const colorPagesSummary = brochureColorPagesInput.trim() || "B&W";
                                         const bindingLabel = isPerfectBinding ? "Perfect Binding" : "Center Clip";
                                         const newLineItem = {
                                           id: editingLineId || Date.now(),
                                           lineKind: "PRINTING",
                                           title: itemTitle || `${sizeName} Booklet`,
                                           description: `BKT • ${bindingLabel} • ${brochurePagesPerBrochure}pp • Color pages: ${colorPagesSummary} • ${selPaper?.name || "Standard"} • ${plan.signatures.map((sig) => `${sig.signaturePages}pp`).join("+")}`,
                                           quantity: Number(brochureCopies),
                                           meta: {
                                             itemTitle,
                                             brochureStockItemId,
                                             brochureSizeId,
                                             customWidth,
                                             customBreadth,
                                             customUnit,
                                             brochurePagesPerBrochure,
                                             brochureCopies,
                                             brochureColorMode: effectiveBrochureColorMode,
                                             brochureSides: "DOUBLE",
                                             brochureColorPagesInput,
                                             brochureIsOnlyClipCharge,
                                             brochureOrientation,
                                             bookletBindingType,
                                             selectedNestedPlanId: plan.planId,
                                             nestedPrintPlan: plan,
                                           },
                                           chargeComponents: buildBrochureChargeComponents(plan.pricingBreakdown),
                                         };

                                         let newList;
                                         if (editingLineId) {
                                           newList = lineItems.map((item) =>
                                             String(item.id || item._id) === String(editingLineId) ? newLineItem : item,
                                           );
                                         } else {
                                           newList = [...lineItems, newLineItem];
                                         }
                                         await syncLineItems(newList);
                                         onLineItemSaved(newLineItem.title || itemTitle, !!editingLineId);
                                       }}
                                       className="flex-1 flex items-center justify-center gap-1.5 text-xs lg:group-hover/options:text-sm py-2 lg:group-hover/options:py-2.5"
                                     >
                                       {!!editingLineId ? <MdCheckCircle className="w-4 h-4 shrink-0" /> : <MdAdd className="w-4 h-4 shrink-0" />}
                                       <span className={`truncate ${OPT_COMPACT}`}>
                                         {!!editingLineId ? "Update" : "Add"} · ₹{selectedNestedPrintPlan.totals?.price != null ? Number(selectedNestedPrintPlan.totals.price).toLocaleString() : "—"}
                                       </span>
                                       <span className={`truncate ${OPT_EXPAND}`}>
                                         {!!editingLineId ? "Update Booklet" : "Add Booklet to Quotation"}
                                       </span>
                                     </PrimaryButton>
                                   </div>
                               )}
                             </div>
                           )}

                          {brochureNestedPrintPlans.length === 0 && selectedBrochureView && (
                             <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                                {/* Intelligence Summary */}
                                <div className="p-4 bg-brand-navy/[0.03] rounded-xl border border-gov-blue/5">
                                   <div className="flex items-center gap-2 mb-2">
                                      <MdInfo className="w-4 h-4 text-gov-blue" />
                                      <span className="text-[10px] font-black text-gov-blue/70 uppercase tracking-widest">Composition Strategy</span>
                                   </div>
                                   <p className="text-[11px] font-bold text-gov-blue/70 leading-relaxed italic">
                                      "{selectedBrochureView.workflowSummary || selectedBrochureView.intelligence.humanSummary}"
                                   </p>
                                   {selectedBrochureView.workflowTags?.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-2">
                                       {brochureWorkflowBadges(selectedBrochureView).map((badge) => renderBrochureWorkflowBadge(badge))}
                                     </div>
                                   )}
                                </div>

                                {/* Ranked Printers */}
                                <div className="space-y-3">
                                   <h4 className="text-[10px] font-black text-gov-blue/65 uppercase tracking-[0.2em] px-1">Printer Options</h4>
                                   <div className="grid grid-cols-1 gap-3">
                                      {/* Single Printer Options */}
                                      {selectedBrochureView.singlePrinterRanked.map((opt, oIdx) => (
                                        <div
                                          key={`single-${oIdx}`}
                                          onClick={() => setSelectedBrochureOption({ viewId: selectedBrochureView.viewId, optionIdx: oIdx, kind: 'SINGLE' })}
                                          className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${selectedBrochureOption?.kind === 'SINGLE' && selectedBrochureOption?.optionIdx === oIdx ? 'border-gov-blue ring-4 ring-brand-teal/10 bg-gov-blue/[0.02]' : 'border-gov-blue/5 hover:border-gov-blue/40'}`}
                                        >
                                           <div className="flex-1">
                                              <div className="text-xs font-black text-gov-blue flex items-center gap-2">
                                                 {opt.printerModelName}
                                                 {oIdx === 0 && <span className="text-[8px] px-1.5 py-0.5 bg-gov-blue-light text-gov-blue rounded uppercase tracking-tighter">Best Value</span>}
                                              </div>
                                              <div className="text-[10px] font-bold text-gov-blue/65 uppercase tracking-tight mt-1">
                                                 Single Printer Workflow • {opt.totals.prints} Prints • {opt.totals.colorPrints ?? 0} Color / {opt.totals.bwPrints ?? 0} B&amp;W
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-lg font-black text-gov-blue">₹{opt.totals.price.toLocaleString()}</div>
                                           </div>
                                        </div>
                                      ))}

                                      {/* Mixed Printer Options */}
                                      {selectedBrochureView.mixedPrinterRanked.map((opt, oIdx) => (
                                        <div
                                          key={`mixed-${oIdx}`}
                                          onClick={() => setSelectedBrochureOption({ viewId: selectedBrochureView.viewId, optionIdx: oIdx, kind: 'MIXED' })}
                                          className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${selectedBrochureOption?.kind === 'MIXED' && selectedBrochureOption?.optionIdx === oIdx ? 'border-gov-blue ring-4 ring-brand-teal/10 bg-gov-blue/[0.02]' : 'border-gov-blue/5 hover:border-gov-blue/40'}`}
                                        >
                                           <div className="flex-1">
                                              <div className="text-xs font-black text-gov-blue flex items-center gap-2">
                                                 Mixed Machines
                                                 <span className="text-[8px] px-1.5 py-0.5 bg-brand-navy text-white rounded uppercase tracking-tighter">Hybrid</span>
                                              </div>
                                              <div className="text-[10px] font-bold text-gov-blue/65 uppercase tracking-tight mt-1">
                                                 Optimized per segment • {opt.totals.prints} Prints • {opt.totals.colorPrints ?? 0} Color / {opt.totals.bwPrints ?? 0} B&amp;W
                                              </div>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-lg font-black text-gov-blue">₹{opt.totals.price.toLocaleString()}</div>
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>

                                {/* Segment Details (Visual Breakdown) */}
                                {selectedBrochureOption && renderBrochurePricingBreakdown(
                                  (selectedBrochureOption.kind === "SINGLE"
                                    ? selectedBrochureView.singlePrinterRanked[selectedBrochureOption.optionIdx]?.pricingBreakdown
                                    : selectedBrochureView.mixedPrinterRanked[selectedBrochureOption.optionIdx]?.pricingBreakdown) || [],
                                  selectedBrochureOption.kind === "SINGLE"
                                    ? selectedBrochureView.singlePrinterRanked[selectedBrochureOption.optionIdx]?.totals
                                    : selectedBrochureView.mixedPrinterRanked[selectedBrochureOption.optionIdx]?.totals,
                                )}

                                <div className="space-y-3">
                                   <h4 className="text-[10px] font-black text-gov-blue/65 uppercase tracking-[0.2em] px-1">Segment Breakdown</h4>
                                   <div className="space-y-4">
                                      {selectedBrochureView.segments.map((seg, sIdx) => {
                                        const optData = selectedBrochureOption?.kind === 'SINGLE' 
                                          ? selectedBrochureView.singlePrinterRanked[selectedBrochureOption?.optionIdx]?.segments[sIdx]
                                          : selectedBrochureView.mixedPrinterRanked[selectedBrochureOption?.optionIdx]?.segments[sIdx];
                                        
                                        return (
                                          <div key={sIdx} className="bg-white rounded-2xl border border-gov-blue/5 p-4 relative overflow-hidden group">
                                             <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gov-blue/[0.03] rounded-full group-hover:bg-gov-blue/[0.06] transition-colors" />
                                             <div className="flex justify-between items-start mb-3 relative">
                                                <div>
                                                   <span className="text-[10px] font-black text-gov-blue uppercase tracking-widest">Segment {sIdx + 1}: {seg.partPages}pp</span>
                                                   <h5 className="text-xs font-black text-gov-blue mt-0.5">{seg.layoutSummary}</h5>
                                                </div>
                                                <div className="text-right">
                                                   <div className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest">Spread Size</div>
                                                   <div className="text-[11px] font-black text-gov-blue">{seg.spreadSize.width}×{seg.spreadSize.breadth}{seg.spreadSize.unit}</div>
                                                </div>
                                             </div>

                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                                {/* Page Numbering Grids */}
                                                {seg.pageNumbering && (
                                                  <div className="space-y-2 md:col-span-2">
                                                     <div className="text-[9px] font-black text-gov-blue/55 uppercase tracking-widest">Imposition ({seg.pageNumbering.orientation})</div>
                                                     {seg.partPages === 2 && (
                                                       <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed">{seg.layoutSummary}</p>
                                                     )}
                                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                           <div className="text-[8px] font-black text-gov-blue/65 uppercase tracking-widest mb-2">Front</div>
                                                           {renderBrochureImpositionSide(seg, seg.pageNumbering.front, "teal")}
                                                        </div>
                                                        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                                           <div className="text-[8px] font-black text-gov-blue/65 uppercase tracking-widest mb-2">Back</div>
                                                           {renderBrochureImpositionSide(seg, seg.pageNumbering.back, "navy")}
                                                        </div>
                                                     </div>
                                                  </div>
                                                )}

                                                {/* Printer Specs for this segment */}
                                                {optData && (
                                                  <div className="bg-gov-blue/[0.02] rounded-lg p-3 border border-gov-blue/5">
                                                     <div className="text-[9px] font-black text-gov-blue/60 uppercase tracking-widest mb-2">Segment Run</div>
                                                     <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-gov-blue/70">Yield</span>
                                                           <span className="text-gov-blue">{optData.laserOption?.piecesPerSheet || '--'} up</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-gov-blue/70">Impressions</span>
                                                           <span className="text-gov-blue">{optData.laserOption?.prints || '--'} prints</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-gov-blue/70">Front Side</span>
                                                           <span className="text-gov-blue">{seg.sideClassification?.frontSideMode || 'BW'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                           <span className="text-gov-blue/70">Back Side</span>
                                                           <span className="text-gov-blue">{seg.sideClassification?.backSideMode || 'BW'}</span>
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
                                  <div className="mt-4 pt-6 border-t border-gov-blue/5 flex gap-3">
                                     {editingLineId && (
                                       <button
                                         onClick={resetCalculator}
                                         className="px-4 text-[10px] font-black uppercase tracking-widest text-gov-blue/65 hover:text-red-400 transition-colors"
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
                                          let sizeName = "Custom Booklet";
                                          if (brochureSizeId === 'custom') {
                                            sizeName = `Custom (${customWidth}x${customBreadth}${customUnit})`;
                                          } else {
                                            const selSize = sizeList.find(s => s.id === brochureSizeId);
                                            sizeName = selSize ? `${selSize.name}` : "Standard Booklet";
                                          }

                                          const colorPagesSummary = brochureColorPagesInput.trim() || "B&W";
                                          const bindingLabel = isPerfectBinding ? "Perfect Binding" : "Center Clip";
                                          const newLineItem = {
                                            id: editingLineId || Date.now(),
                                            lineKind: "PRINTING",
                                            title: itemTitle || `${sizeName} Booklet`,
                                            description: `BKT • ${bindingLabel} • ${brochurePagesPerBrochure}pp • Color pages: ${colorPagesSummary} • ${selPaper?.name || 'Standard'} • ${view.parts.join('-')} split`,
                                            quantity: Number(brochureCopies),
                                            meta: {
                                              itemTitle,
                                              brochureStockItemId, brochureSizeId, customWidth, customBreadth, customUnit,
                                              brochurePagesPerBrochure, brochureCopies,
                                              brochureColorMode: effectiveBrochureColorMode,
                                              brochureSides: "DOUBLE",
                                              brochureColorPagesInput,
                                              brochureIsOnlyClipCharge, brochureOrientation,
                                              bookletBindingType,
                                              selectedViewId: view.viewId,
                                              selectedOptionKind: selectedBrochureOption.kind,
                                              selectedOptionIdx: selectedBrochureOption.optionIdx,
                                              viewData: view,
                                              optionData: opt
                                            },
                                            chargeComponents: buildBrochureChargeComponents(opt.pricingBreakdown),
                                          };

                                          let newList;
                                          if (editingLineId) {
                                            newList = lineItems.map(item => String(item.id || item._id) === String(editingLineId) ? newLineItem : item);
                                          } else {
                                            newList = [...lineItems, newLineItem];
                                          }
                                          await syncLineItems(newList);
                                          onLineItemSaved(newLineItem.title || itemTitle, !!editingLineId);
                                       }}
                                       className="flex-1 flex items-center justify-center gap-2"
                                     >
                                        {!!editingLineId ? <MdCheckCircle className="w-4 h-4 ml-[-8px]" /> : <MdAdd className="w-4 h-4 ml-[-8px]" />}
                                        {!!editingLineId ? "Update Booklet" : "Add Booklet to Quotation"}
                                     </PrimaryButton>
                                  </div>
                                )}
                             </div>
                           )}
                        </div>
                      )}
                  </div>
              </div>
            ) : activeTab === "offset-book" ? (
              <div className={`${QUOTE_CALC_ROW_CLASS} animate-fade-in`}>
                  <div className={QUOTE_FORM_COLUMN_CLASS}>
                    <div className="gov-panel min-h-[320px] flex flex-col">
                      <div className="gov-panel-header">
                        <h3 className="text-sm font-semibold text-gov-blue">Offset Book / Booklet Printing</h3>
                      </div>
                      <div className="gov-panel-body flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
                        <MdLayers className="w-12 h-12 text-gov-blue/20 mb-4" />
                        <p className="text-sm font-medium text-gray-700">Book printing workspace</p>
                        <p className="text-xs text-gray-500 mt-2 max-w-md">
                          Configuration for offset book and booklet jobs will be added here. Use Laser → Booklet / Book for laser booklet quoting in the meantime.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`${QUOTE_OPTIONS_PANEL_CLASS} min-h-[320px] ${QUOTE_OPTIONS_PANEL_IDLE} flex items-center justify-center`}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-4 text-center">Composition options will appear here</p>
                  </div>
              </div>
            ) : activeTab === "offset" ? (
              <div className={`${QUOTE_CALC_ROW_CLASS} animate-fade-in`}>
                  {/* Left: Inputs */}
                  <div className={QUOTE_FORM_COLUMN_CLASS}>
                      <div className={QUOTE_INPUT_GRID_CLASS}>
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


                          {offsetSizeId === 'custom' && renderCustomSizeFields({ className: "col-span-full" })}

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
                             <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Sides</label>
                             <div className="flex bg-zinc-50 p-1 rounded-xl border border-gov-blue/5 h-11">
                                {['SINGLE', 'DOUBLE'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setOffsetSides(s)}
                                    className={`flex-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${offsetSides === s ? 'bg-white text-gov-blue shadow-sm' : 'text-gov-blue/60 hover:text-gov-blue/80'}`}
                                  >
                                    {s === 'SINGLE' ? 'Front' : 'F&B'}
                                  </button>
                                ))}
                             </div>
                          </div>
                          {offsetSides === 'DOUBLE' && (
                             <div className="flex flex-col gap-2 animate-fade-in">
                                <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Diff Content?</label>
                                <button
                                  onClick={() => setOffsetIsBackSideDifferent(!offsetIsBackSideDifferent)}
                                  className={`h-11 rounded-xl border flex items-center justify-center transition-all ${offsetIsBackSideDifferent ? 'bg-gov-blue-light/10 border-brand-mint text-gov-blue' : 'bg-white border-gov-blue/10 text-gov-blue/70'}`}
                                  title="Check if back side content is different (requires 2 plate sets)"
                                >
                                   <span className="text-[10px] font-black uppercase tracking-tighter">{offsetIsBackSideDifferent ? 'Yes (2 Plates)' : 'No (1 Plate)'}</span>
                                </button>
                             </div>
                          )}
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">Colour Mode</label>
                         <div className="flex flex-wrap bg-zinc-50 p-1 rounded-xl border border-gov-blue/5">
                            {['Single', 'Two Colour', 'Three Colour', 'Multi'].map(m => (
                              <button
                                key={m}
                                onClick={() => setOffsetColorMode(m)}
                                className={`flex-1 py-2 px-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all whitespace-nowrap ${offsetColorMode === m ? 'bg-white text-gov-blue shadow-sm' : 'text-gov-blue/60 hover:text-gov-blue/80'}`}
                              >
                                {m}
                              </button>
                            ))}
                         </div>
                      </div>
                  </div>

                  {/* Right: Results Mirror Laser pattern */}
                  <div className={`${QUOTE_OPTIONS_PANEL_CLASS} min-h-[280px] ${!!editingLineId ? QUOTE_OPTIONS_PANEL_ACTIVE : QUOTE_OPTIONS_PANEL_IDLE}`}>
                       <div className="mb-2 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                             <MdOutlineAnalytics className="w-4 h-4 text-gov-blue shrink-0" />
                             <h3 className={`text-[11px] font-semibold text-gov-blue uppercase tracking-wide truncate ${OPT_COMPACT}`}>
                                Options
                             </h3>
                             <h3 className={`${OPT_EXPAND} text-[11px] font-semibold text-gov-blue uppercase tracking-wide`}>
                                {!!editingLineId ? "Editing Offset Item" : "Offset Options"}
                             </h3>
                              <button 
                                  onClick={() => setShowOffsetHelp(true)}
                                  className="w-6 h-6 flex items-center justify-center bg-gov-blue-light text-gov-blue border border-gov-border shrink-0"
                                  title="Understand Offset Calculation Logic"
                               >
                                  <MdHelpOutline className="w-3.5 h-3.5" />
                               </button>
                           </div>
                           <span className="hidden lg:block text-[9px] text-gray-400 uppercase tracking-wide shrink-0 ml-1 group-hover/options:hidden">Hover to expand</span>
                           {offsetLoading && <div className="w-3.5 h-3.5 border border-gov-border border-t-gov-blue animate-spin shrink-0"></div>}
                       </div>

                      {offsetError ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdWarningAmber className="w-12 h-12 text-red-400 opacity-20" />
                           <p className="text-xs font-bold text-red-400 uppercase tracking-widest max-w-[200px]">{offsetError}</p>
                        </div>
                      ) : offsetPricingOptions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                           <MdPrint className={`w-12 h-12 ${offsetSizeId && offsetStockItemId && offsetCopies ? 'text-red-400 opacity-20' : 'opacity-30 grayscale'}`} />
                           <p className={`text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] ${offsetSizeId && offsetStockItemId && offsetCopies ? 'text-red-400' : 'text-gov-blue/65'}`}>
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
                                     className={`p-2 lg:group-hover/options:p-3 rounded-xl border bg-white shadow-sm flex items-center justify-between gap-2 group cursor-pointer transition-all ${!isPrintable ? 'opacity-50 grayscale bg-zinc-50 border-red-100 cursor-not-allowed' : (isSelected ? 'border-gov-blue ring-2 lg:group-hover/options:ring-4 ring-brand-teal/10 bg-gov-blue/[0.02]' : 'hover:border-gov-blue/40 border-gov-blue/5')}`}
                                    >
                                       <div className="flex-1 min-w-0">
                                          <div className={`${OPT_COMPACT} flex items-center justify-between gap-2`}>
                                            <div className="text-[11px] font-black text-gov-blue truncate min-w-0">{opt.printerModelName}</div>
                                            <div className="text-sm font-black text-gov-blue shrink-0">
                                               {isPrintable ? `₹${opt.pricing.total.toLocaleString()}` : '--'}
                                            </div>
                                          </div>
                                          <div className={`${OPT_COMPACT} text-[9px] font-bold text-gov-blue/55 uppercase tracking-tight mt-0.5 truncate`}>
                                             {isPrintable ? `${opt.piecesPerSheet} up · ${opt.parentSheets} sh` : (opt.unprintableReason?.replace(/_/g, ' ') || 'Unavailable')}
                                          </div>
                                          <div className={`${OPT_EXPAND}`}>
                                          <div className="text-xs font-black text-gov-blue flex items-center gap-2">
                                             {opt.printerModelName}
                                             {idx === 0 && isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-gov-blue-light text-gov-blue rounded uppercase tracking-tighter">Best Match</span>}
                                             {!isPrintable && <span className="text-[8px] px-1.5 py-0.5 bg-red-500 text-white rounded uppercase tracking-tighter shadow-sm">Geometric Error</span>}
                                          </div>
                                          <div className="text-[10px] font-bold text-gov-blue/65 uppercase tracking-tight mt-1 flex flex-wrap items-center gap-x-2">
                                             {isPrintable ? (
                                               <>
                                                 <span>{opt.piecesPerSheet} Up</span>
                                                 <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                 <span>{opt.parentSheets} Parent Sheets</span>
                                                 <span className="w-1 h-1 rounded-full bg-brand-navy/10" />
                                                 <span>{opt.impressionsBilled?.toLocaleString()} Imps</span>

                                                 {opt.pricing.chargeComponents?.length > 0 && (
                                                   <div className="w-full mt-2 pt-2 border-t border-gov-blue/5 flex flex-wrap gap-x-4 gap-y-1">
                                                      {opt.pricing.chargeComponents.map(c => (
                                                        <div key={c.role} className="flex items-center gap-1.5">
                                                           <span className="text-[8px] font-black uppercase text-gov-blue/55 tracking-tighter">{c.role === 'printing' ? 'Print' : 'Paper'} :</span>
                                                           <span className={`text-[9px] font-black ${c.role === 'printing' ? 'text-gov-blue/60' : 'text-gov-blue'}`}>₹{c.amount.toLocaleString()}</span>
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
                                       </div>
                                       <div className={`${OPT_EXPAND_FLEX} items-center gap-4 shrink-0`}>
                                          {opt.layout && isPrintable && (
                                            <button
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setPreviewingLayoutOption(opt);
                                             }}
                                             className="p-2 text-gov-blue font-black text-[9px] uppercase tracking-widest hover:bg-gov-blue/10 rounded-lg transition-all"
                                            >
                                               Inspect
                                            </button>
                                          )}
                                          <div className="text-right min-w-[70px]">
                                             <div className="text-lg font-black text-gov-blue">
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
                              <div className="mt-auto pt-2 border-t border-gov-border shrink-0 flex gap-2 px-0.5">
                                 {editingLineId && (
                                   <button
                                     onClick={resetCalculator}
                                     className={`px-2 text-[10px] font-black uppercase tracking-widest text-gov-blue/65 hover:text-red-400 transition-colors ${OPT_EXPAND}`}
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
                                     onLineItemSaved(newLineItem.title || itemTitle, !!editingLineId);
                                   }}
                                   className="flex-1 flex items-center justify-center gap-1.5 text-xs lg:group-hover/options:text-sm py-2"
                                 >
                                    {!!editingLineId ? <MdCheckCircle className="w-4 h-4 shrink-0" /> : <MdAdd className="w-4 h-4 shrink-0" />}
                                    <span className={`truncate ${OPT_COMPACT}`}>
                                      {!!editingLineId ? "Update" : "Add"} · ₹{selectedOffsetOption.pricing.total.toLocaleString()}
                                    </span>
                                    <span className={`truncate ${OPT_EXPAND}`}>
                                      {!!editingLineId ? "Update Line Item" : "Add to Quotation"}
                                    </span>
                                 </PrimaryButton>
                              </div>
                            )}
                         </div>
                      )}
                  </div>
                </div>
            ) : null}
          </div>
      </section>



      <FormDrawer
        open={showNewCustModal}
        onClose={() => !busy && setShowNewCustModal(false)}
        disableClose={busy}
        title="New Customer"
        subtitle="Register and link to this quote"
        icon={<MdPersonAdd className="w-4 h-4" />}
        footer={
          <>
            <button type="button" onClick={() => setShowNewCustModal(false)} className="gov-btn-secondary" disabled={busy}>Cancel</button>
            <PrimaryButton onClick={handleCreateNewCustomer} disabled={busy}>{busy ? "Registering..." : "Create & Link"}</PrimaryButton>
          </>
        }
      >
         {newCustError && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs font-semibold border border-red-200">{newCustError}</div>}

         <div className="space-y-4">
           <TextField label="Customer Name" placeholder="e.g. Rahul Sharma" value={newCustName} onChange={e => setNewCustName(e.target.value)} disabled={busy} error={newCustFieldErrors.name?.[0]} />

           <div className="grid grid-cols-2 gap-3">
              <TextField label="Company Name" placeholder="Optional" value={newCustCompany} onChange={e => setNewCustCompany(e.target.value)} disabled={busy} error={newCustFieldErrors.companyName?.[0]} />
              <TextField label="Tax ID / GST" placeholder="Optional" value={newCustTaxId} onChange={e => setNewCustTaxId(e.target.value)} disabled={busy} error={newCustFieldErrors.taxId?.[0]} />
           </div>

           <div className="grid grid-cols-2 gap-3">
              <TextField label="Primary Email" placeholder="client@example.com" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} disabled={busy} error={newCustFieldErrors.email?.[0]} />
              <TextField label="Contact Phone" placeholder="+91..." value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} disabled={busy} error={newCustFieldErrors.phone?.[0]} />
           </div>

           <div className="space-y-3 pt-2 border-t border-gov-border">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Billing Address</h3>
              <TextField label="Address Line 1" value={newCustAddress.line1} onChange={e => setNewCustAddress({...newCustAddress, line1: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.line1?.[0]} />
              <div className="grid grid-cols-2 gap-3">
                 <TextField label="City" value={newCustAddress.city} onChange={e => setNewCustAddress({...newCustAddress, city: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.city?.[0]} />
                 <TextField label="Region / State" value={newCustAddress.region} onChange={e => setNewCustAddress({...newCustAddress, region: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.region?.[0]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <TextField label="Postal Code" value={newCustAddress.postalCode} onChange={e => setNewCustAddress({...newCustAddress, postalCode: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.postalCode?.[0]} />
                 <TextField label="Country" value={newCustAddress.country} onChange={e => setNewCustAddress({...newCustAddress, country: e.target.value})} disabled={busy} error={newCustFieldErrors.billingAddress?.country?.[0]} />
              </div>
           </div>
         </div>
      </FormDrawer>
      {/* 5. Layout / Composition Inspection Drawer */}
      {(previewingLayoutOption || previewingCompositionPlan) && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
           <div
            className="absolute inset-0 bg-brand-navy/50"
            onClick={() => { setPreviewingLayoutOption(null); setPreviewingCompositionPlan(null); }}
           />
           <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-slide-left border-l border-gov-border">
              <div className="px-3 py-2 border-b border-gov-border flex items-center justify-between bg-gray-50 shrink-0">
                 <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-gov-blue text-white flex items-center justify-center shrink-0">
                       {previewingCompositionPlan ? <MdLayers className="w-4 h-4" /> : <MdOutlineAnalytics className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                       <h2 className="text-sm font-bold text-gov-blue leading-tight">
                         {previewingCompositionPlan ? "Composition Inspection" : "Layout Inspection"}
                       </h2>
                       <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                         {previewingCompositionPlan
                           ? `Option ${previewingCompositionPlan.planIdx + 1} · ${nestedPlanPrinterSummary(previewingCompositionPlan.plan, 2)}`
                           : previewingLayoutOption.printerModelName}
                       </p>
                    </div>
                 </div>
                 <button
                  type="button"
                  onClick={() => { setPreviewingLayoutOption(null); setPreviewingCompositionPlan(null); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gov-blue hover:bg-white border border-transparent hover:border-gov-border shrink-0"
                 >
                    <MdClose className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                 {previewingCompositionPlan ? (
                   renderCompositionPlanInspect(previewingCompositionPlan.plan, previewingCompositionPlan.planIdx)
                 ) : (
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
                 )}
              </div>

               <div className="px-3 py-2 border-t border-gov-border bg-gray-50 flex justify-end shrink-0">
                  <PrimaryButton
                   type="button"
                   onClick={() => { setPreviewingLayoutOption(null); setPreviewingCompositionPlan(null); }}
                   className="px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
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
                   <div className="p-8 border-b border-gov-blue/5 flex items-center justify-between bg-zinc-50/50">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-gov-blue text-white flex items-center justify-center shadow-lg shadow-gov-blue/20">
                            <MdInfo className="w-6 h-6" />
                         </div>
                         <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gov-blue uppercase tracking-tighter leading-none">Offset Calculation Guide</h2>
                            <span className="text-[9px] font-bold text-gov-blue uppercase tracking-widest mt-1">Pricing & Logic Blueprint</span>
                       </div>
                      </div>
                      <button onClick={() => setShowOffsetHelp(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gov-blue/55 hover:text-gov-blue hover:bg-zinc-100 transition-all">
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
                               ₹ <span className="text-gov-blue">Total</span>
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
                         <h3 className="text-[11px] font-black text-gov-blue/70 uppercase tracking-[0.2em]">02. Material (Paper Sheets)</h3>
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
                         <h3 className="text-[11px] font-black text-gov-blue/70 uppercase tracking-[0.2em]">03. Machine Run (Logic)</h3>
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
                         <h3 className="text-[11px] font-black text-gov-blue/70 uppercase tracking-[0.2em]">04. Bulk Threshold Boundary</h3>
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
                                  <div className="text-[9px] font-black uppercase text-gov-blue/70 mb-1 text-center">Boundary Comparison (Example)</div>
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
                      <div className="text-[11px] font-medium text-gov-blue/70">The machine rates shown are final calculations based on the printer's current tiered configuration.</div>
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
       <label className="text-[9px] font-black text-gov-blue/65 uppercase tracking-widest pl-1">{label}</label>
       <input
        type="text"
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-10 px-4 rounded-xl border border-gov-blue/10 text-xs font-bold text-gov-blue outline-none focus:border-gov-blue focus:ring-4 focus:ring-brand-teal/5 transition-all shadow-sm ${isAmount ? 'bg-zinc-50 border-gov-blue/20' : 'bg-white'}`}
       />
    </div>
  );
}
