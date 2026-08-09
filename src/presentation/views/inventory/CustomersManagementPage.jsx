import React, { useState, useEffect } from "react";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import FormDrawer from "../../components/layout/FormDrawer.jsx";
import { 
  MdAdd, MdClose, MdSearch, MdChevronLeft, MdChevronRight, 
  MdOutlineDelete, MdEdit, MdPeople, MdEmail, MdBusiness, 
  MdPhone, MdLocationOn, MdDescription, MdCheckCircle, MdContactPage
} from "react-icons/md";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

const ADDRESS_TEMPLATE = { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };

function AddressFields({ label, address, onChange, disabled, errors = {} }) {
  const updateField = (f, v) => onChange({ ...address, [f]: v });
  
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-gov-blue/30 uppercase tracking-[0.2em]">{label}</h3>
      <TextField label="Line 1" value={address.line1 || ""} onChange={e => updateField("line1", e.target.value)} disabled={disabled} error={errors.line1?.[0]} />
      <TextField label="Line 2" value={address.line2 || ""} onChange={e => updateField("line2", e.target.value)} disabled={disabled} error={errors.line2?.[0]} />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="City" value={address.city || ""} onChange={e => updateField("city", e.target.value)} disabled={disabled} error={errors.city?.[0]} />
        <TextField label="Region / State" value={address.region || ""} onChange={e => updateField("region", e.target.value)} disabled={disabled} error={errors.region?.[0]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Postal Code" value={address.postalCode || ""} onChange={e => updateField("postalCode", e.target.value)} disabled={disabled} error={errors.postalCode?.[0]} />
        <TextField label="Country" value={address.country || ""} onChange={e => updateField("country", e.target.value)} disabled={disabled} error={errors.country?.[0]} />
      </div>
    </div>
  );
}


export default function CustomersManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState(1);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);


  // Search & Delete
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);

  // Pagination (Limit/Offset style)
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [billingAddress, setBillingAddress] = useState({ ...ADDRESS_TEMPLATE });
  const [shippingAddress, setShippingAddress] = useState({ ...ADDRESS_TEMPLATE });

  const canEdit = user?.scopes?.includes("all_scope") || user?.scopes?.includes("edit_customers") || user?.scopes?.includes("manage_customers");

  async function fetchItems(query = "", currentOffset = 0) {
    setLoading(true);
    setErrorText("");
    try {
      const data = await getCustomers(query, currentOffset, limit);
      setItems(data.items || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to load customers.");
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

  function resetForm() {
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setTaxId("");
    setNotes("");
    setIsActive(true);
    setBillingAddress({ ...ADDRESS_TEMPLATE });
    setShippingAddress({ ...ADDRESS_TEMPLATE });
    setModalTab(1);
    setEditingItemId(null);
    setModalError("");
    setFieldErrors({});
  }


  function handleEditClick(item) {
    resetForm();
    setEditingItemId(item.id);
    setName(item.name || "");
    setCompanyName(item.companyName || "");
    setEmail(item.email || "");
    setPhone(item.phone || "");
    setTaxId(item.taxId || "");
    setNotes(item.notes || "");
    setIsActive(item.isActive ?? true);
    setBillingAddress(item.billingAddress || { ...ADDRESS_TEMPLATE });
    setShippingAddress(item.shippingAddress || { ...ADDRESS_TEMPLATE });
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim()) { setModalError("Customer name is required."); return; }
    setBusy(true);
    setModalError("");
    setFieldErrors({});
    
    // Cleanup address objects: remove if all fields are empty
    const cleanAddress = (addr) => {
      const hasContent = Object.values(addr).some(v => v && v.trim());
      return hasContent ? addr : undefined;
    };

    try {
      const payload = {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        taxId: taxId.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive,
        billingAddress: cleanAddress(billingAddress),
        shippingAddress: cleanAddress(shippingAddress)
      };

      if (editingItemId) {
        await updateCustomer(editingItemId, payload);
      } else {
        await createCustomer(payload);
      }
      
      setShowModal(false);
      resetForm();
      fetchItems(searchQuery, offset);
    } catch (e) {
      if (e.response?.data?.code === "VALIDATION_ERROR") {
        setFieldErrors(e.response.data.issues?.fieldErrors || {});
        setModalError("Validation failed. Please check the highlighted fields.");
      } else {
        setModalError(e.response?.data?.message || "Failed to save customer.");
      }
    } finally {
      setBusy(false);
    }

  }

  async function handleApplyDelete() {
    if (!deleteTargetItem) return;
    setBusy(true);
    try {
      await deleteCustomer(deleteTargetItem.id);
      setShowDeleteModal(false);
      setDeleteTargetItem(null);
      fetchItems(searchQuery, offset);
    } catch (e) {
      setErrorText(e.response?.data?.message || "Failed to delete customer.");
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
          <h2 className="text-lg font-bold text-gray-900">Customer Directory</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, company, email..."
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
                <MdAdd className="w-4 h-4" />
                New Customer
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
                              <th>Customer Details</th>
                              <th>Contact Points</th>
                              <th>Tax / Financial</th>
                              <th className="text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="py-8 text-center text-gov-blue/40 font-bold">No customer accounts registered.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id}>
                                      <td>
                                          <div className="font-bold text-gov-blue text-sm">{item.name}</div>
                                          {item.companyName && <div className="text-[11px] font-bold text-gov-blue/40 uppercase flex items-center gap-1.5 mt-0.5"><MdBusiness className="w-3 h-3"/> {item.companyName}</div>}
                                          <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${item.isActive ? 'bg-gov-blue-light/20 text-gov-blue' : 'bg-zinc-100 text-gov-blue/30'}`}>
                                              {item.isActive ? 'Active Client' : 'Archived'}
                                          </div>
                                      </td>
                                      <td className="space-y-1">
                                          {item.email && <div className="text-xs font-semibold text-gov-blue/70 flex items-center gap-2 tracking-tight"><MdEmail className="w-3.5 h-3.5 text-gov-blue/20"/> {item.email}</div>}
                                          {item.phone && <div className="text-xs font-semibold text-gov-blue/70 flex items-center gap-2 tracking-tight"><MdPhone className="w-3.5 h-3.5 text-gov-blue/20"/> {item.phone}</div>}
                                          {!item.email && !item.phone && <span className="text-[10px] font-bold text-gov-blue/20 italic">No contact info</span>}
                                      </td>
                                      <td>
                                          <div className="text-xs font-bold text-gray-600">
                                              {item.taxId || <span className="text-gov-blue/20 italic font-medium">No Tax ID</span>}
                                          </div>
                                      </td>
                                      <td className="text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-1">
                                                  <button 
                                                    onClick={() => handleEditClick(item)}
                                                    className="p-2 text-gray-400 hover:text-gov-blue hover:bg-gray-50 transition-colors"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                          Showing {offset + 1}–{Math.min(offset + limit, totalItems)} of {totalItems} clients
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0 || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronLeft /></button>
                          <button onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= totalItems || loading} className="p-2 border border-gov-border disabled:opacity-30 hover:bg-gray-100"><MdChevronRight /></button>
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
        title={`${editingItemId ? "Update" : "Register"} Customer`}
        subtitle={editingItemId ? "Refine commercial relationship" : "Start a new commercial journey"}
        icon={<MdPeople className="w-4 h-4" />}
        headerExtra={
          <div className="flex gap-0 border border-gov-border">
            {[
              { id: 1, label: "Profile", icon: <MdContactPage className="w-3.5 h-3.5" /> },
              { id: 2, label: "Addresses", icon: <MdLocationOn className="w-3.5 h-3.5" /> },
              { id: 3, label: "Settings", icon: <MdSettings className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModalTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold border-r border-gov-border last:border-r-0 transition-colors ${modalTab === t.id ? "bg-gov-blue text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        }
        footer={
          <>
            <button type="button" onClick={() => !busy && setShowModal(false)} className="gov-btn-secondary" disabled={busy}>Cancel</button>
            <PrimaryButton onClick={handleSave} disabled={busy}>{busy ? "Persisting..." : editingItemId ? "Update Account" : "Register Account"}</PrimaryButton>
          </>
        }
      >
        {modalError && <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm font-semibold border border-red-200">{modalError}</div>}

        <div className="space-y-5">
          {modalTab === 1 && (
            <div className="space-y-4">
              <TextField label="Full Name / Primary Label" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} error={fieldErrors.name?.[0]} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Company Name" placeholder="e.g. Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={busy} error={fieldErrors.companyName?.[0]} />
                <TextField label="Tax ID / GST" placeholder="Legal identification" value={taxId} onChange={(e) => setTaxId(e.target.value)} disabled={busy} error={fieldErrors.taxId?.[0]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Primary Email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} error={fieldErrors.email?.[0]} />
                <TextField label="Contact Phone" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy} error={fieldErrors.phone?.[0]} />
              </div>
            </div>
          )}

          {modalTab === 2 && (
            <div className="space-y-8">
              <AddressFields label="Billing Logistics" address={billingAddress} onChange={setBillingAddress} disabled={busy} errors={fieldErrors.billingAddress || {}} />
              <div className="flex items-center justify-between border-t border-gov-border pt-4">
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Shipping Logistics</h3>
                <button type="button" onClick={() => setShippingAddress({ ...billingAddress })} className="text-[10px] font-semibold text-gov-blue uppercase tracking-wide hover:underline">
                  Same as Billing
                </button>
              </div>
              <AddressFields label="" address={shippingAddress} onChange={setShippingAddress} disabled={busy} errors={fieldErrors.shippingAddress || {}} />
            </div>
          )}

          {modalTab === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status Control</label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full py-3 border transition-all flex items-center justify-center gap-2 font-semibold text-xs uppercase tracking-wide ${isActive ? "bg-blue-50 border-gov-blue text-gov-blue" : "bg-gray-50 border-gov-border text-gray-400"}`}
                >
                  {isActive ? <MdCheckCircle className="w-5 h-5" /> : <MdClose className="w-5 h-5" />}
                  {isActive ? "Account Active" : "Account Archived"}
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Internal Relationship Notes</label>
                  {fieldErrors.notes && <span className="text-[10px] font-semibold text-red-500">{fieldErrors.notes[0]}</span>}
                </div>
                <textarea
                  className={`w-full h-32 p-2 border text-sm text-gray-800 outline-none resize-none gov-input ${fieldErrors.notes ? "border-red-400" : ""}`}
                  placeholder="Preferences, history, important details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          )}
        </div>
      </FormDrawer>

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
              <div className="w-full max-w-sm bg-white border border-gov-border p-8 text-center space-y-6 relative z-10">
                  <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center mx-auto"><MdOutlineDelete className="w-10 h-10" /></div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-black text-gov-blue uppercase tracking-tighter">Sever Relation?</h2>
                    <p className="text-xs font-bold text-gov-blue/40 uppercase tracking-widest leading-relaxed">This will permanently remove <span className="text-gov-blue">{deleteTargetItem.name}</span> and all associated historical data references. Continue?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-4">
                      <button onClick={handleApplyDelete} className="w-full py-3 bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">Yes, Remove Record</button>
                      <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-gov-blue/40 hover:text-gov-blue transition-all uppercase tracking-widest">Dismiss</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// Reused settings icon from md
function MdSettings(props) {
  return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" {...props}><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.06.61-.06.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>;
}
