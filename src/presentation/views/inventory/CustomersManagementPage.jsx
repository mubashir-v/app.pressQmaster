import React, { useState, useEffect } from "react";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../../../infrastructure/api/backendService.js";
import { PrimaryButton, TextField, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
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
      <h3 className="text-xs font-black text-brand-navy/30 uppercase tracking-[0.2em]">{label}</h3>
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
    <div className="max-w-6xl mx-auto animate-fade-in relative pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Customer Directory</h1>
           <p className="mt-2 text-brand-navy/60 font-medium">Manage client relationship data, billing logistics, and contact points.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20 group-focus-within:text-brand-teal transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, company, email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-white border border-brand-navy/10 rounded-xl text-sm font-semibold text-brand-navy placeholder:text-brand-navy/20 outline-none focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/5 transition-all w-full sm:w-80"
            />
          </div>
          {canEdit && (
            <button 
               onClick={() => { resetForm(); setShowModal(true); }}
               className="flex items-center gap-2 px-6 py-3 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
               <MdAdd className="w-5 h-5" />
               New Customer
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
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Customer Details</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Contact Points</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">Tax / Financial</th>
                              <th className="px-6 py-4 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.15em] text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-navy/5">
                          {items.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="px-6 py-12 text-center text-brand-navy/40 font-bold">No customer accounts registered.</td>
                              </tr>
                          ) : (
                              items.map(item => (
                                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-brand-navy text-sm">{item.name}</div>
                                          {item.companyName && <div className="text-[11px] font-bold text-brand-navy/40 uppercase flex items-center gap-1.5 mt-0.5"><MdBusiness className="w-3 h-3"/> {item.companyName}</div>}
                                          <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${item.isActive ? 'bg-brand-mint/20 text-brand-teal' : 'bg-zinc-100 text-brand-navy/30'}`}>
                                              {item.isActive ? 'Active Client' : 'Archived'}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 space-y-1">
                                          {item.email && <div className="text-xs font-semibold text-brand-navy/70 flex items-center gap-2 tracking-tight"><MdEmail className="w-3.5 h-3.5 text-brand-navy/20"/> {item.email}</div>}
                                          {item.phone && <div className="text-xs font-semibold text-brand-navy/70 flex items-center gap-2 tracking-tight"><MdPhone className="w-3.5 h-3.5 text-brand-navy/20"/> {item.phone}</div>}
                                          {!item.email && !item.phone && <span className="text-[10px] font-bold text-brand-navy/20 italic">No contact info</span>}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-xs font-bold text-brand-navy/60">
                                              {item.taxId || <span className="text-brand-navy/20 italic font-medium">No Tax ID</span>}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {canEdit && (
                                              <div className="flex justify-end gap-1">
                                                  <button 
                                                    onClick={() => handleEditClick(item)}
                                                    className="p-2 text-brand-navy/40 hover:text-brand-teal hover:bg-brand-mint/10 rounded-xl transition-all"
                                                  >
                                                      <MdEdit className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                    onClick={() => { setDeleteTargetItem(item); setShowDeleteModal(true); }}
                                                    className="p-2 text-brand-navy/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
                          Showing {offset + 1}–{Math.min(offset + limit, totalItems)} of {totalItems} clients
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0 || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30"><MdChevronLeft /></button>
                          <button onClick={() => setOffset(o => o + limit)} disabled={offset + limit >= totalItems || loading} className="p-2 rounded-lg border border-brand-navy/10 disabled:opacity-30"><MdChevronRight /></button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Management Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm transition-opacity" onClick={() => !busy && setShowModal(false)}></div>
              
              <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-fade-in mb-10 overflow-hidden">
                  {/* Modal Header */}
                  <div className="p-8 border-b border-brand-navy/5 bg-zinc-50/30">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-navy text-white flex items-center justify-center shadow-xl shadow-brand-navy/20">
                              {editingItemId ? <MdEdit className="w-6 h-6" /> : <MdPeople className="w-6 h-6" />}
                          </div>
                          <div>
                              <h2 className="text-2xl font-bold text-brand-navy leading-none mb-1.5">{editingItemId ? 'Update' : 'Register'} Customer</h2>
                              <p className="text-xs text-brand-navy/40 font-bold uppercase tracking-widest">{editingItemId ? 'Refine commercial relationship' : 'Start a new commercial journey'}</p>
                          </div>
                      </div>
                      <button onClick={() => !busy && setShowModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-brand-navy/40 hover:bg-zinc-100 transition-colors"><MdClose className="w-5 h-5" /></button>
                    </div>

                    <div className="flex gap-1 p-1 bg-zinc-100 rounded-2xl">
                        {[
                          { id: 1, label: 'Profile', icon: <MdContactPage /> },
                          { id: 2, label: 'Addresses', icon: <MdLocationOn /> },
                          { id: 3, label: 'Settings', icon: <MdSettings className="w-4 h-4" /> }
                        ].map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setModalTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${modalTab === t.id ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/40 hover:text-brand-navy hover:bg-white/50'}`}
                          >
                            {t.icon}
                            {t.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="overflow-y-auto p-8 flex-1 no-scrollbar bg-white">
                      {modalError && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> {modalError}</div>}

                      <div className="space-y-6">
                        {modalTab === 1 && (
                          <div className="space-y-5 animate-slide-up">
                            <TextField label="Full Name / Primary Label" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} disabled={busy} error={fieldErrors.name?.[0]} />
                            <div className="grid grid-cols-2 gap-4">
                              <TextField label="Company Name" placeholder="e.g. Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={busy} error={fieldErrors.companyName?.[0]} />
                              <TextField label="Tax ID / GST" placeholder="Legal identification" value={taxId} onChange={e => setTaxId(e.target.value)} disabled={busy} error={fieldErrors.taxId?.[0]} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <TextField label="Primary Email" placeholder="client@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} error={fieldErrors.email?.[0]} />
                              <TextField label="Contact Phone" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} error={fieldErrors.phone?.[0]} />
                            </div>
                          </div>
                        )}


                        {modalTab === 2 && (
                          <div className="space-y-10 animate-slide-up">
                            <AddressFields label="Billing Logistics" address={billingAddress} onChange={setBillingAddress} disabled={busy} errors={fieldErrors.billingAddress || {}} />
                            <div className="flex items-center justify-between border-t border-brand-navy/5 pt-8">
                                <h3 className="text-xs font-black text-brand-navy/30 uppercase tracking-[0.2em]">Shipping Logistics</h3>
                                <button 
                                  onClick={() => setShippingAddress({ ...billingAddress })}
                                  className="text-[10px] font-black text-brand-teal uppercase tracking-widest hover:underline"
                                >
                                  Same as Billing
                                </button>
                            </div>
                            <AddressFields label="" address={shippingAddress} onChange={setShippingAddress} disabled={busy} errors={fieldErrors.shippingAddress || {}} />
                          </div>
                        )}


                        {modalTab === 3 && (
                          <div className="space-y-6 animate-slide-up">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest pl-1">Status Control</label>
                                <button 
                                  onClick={() => setIsActive(!isActive)}
                                  className={`w-full py-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${isActive ? 'bg-brand-mint/20 border-brand-mint text-brand-teal' : 'bg-zinc-50 border-brand-navy/10 text-brand-navy/40'}`}
                                >
                                  {isActive ? <MdCheckCircle className="w-5 h-5"/> : <MdClose className="w-5 h-5"/>}
                                  {isActive ? 'Account Active' : 'Account Archived'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center pl-1">
                                    <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ">Internal Relationship Notes</label>
                                    {fieldErrors.notes && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-shake">{fieldErrors.notes[0]}</span>}
                                </div>
                                <textarea 
                                    className={`w-full h-40 p-4 rounded-2xl border-2 text-sm font-semibold text-brand-navy outline-none transition-all resize-none shadow-sm ${fieldErrors.notes ? 'border-red-300 ring-4 ring-red-500/10' : 'border-brand-navy/10 focus:border-brand-teal'}`}
                                    placeholder="Preferences, history, important details..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={busy}
                                />
                            </div>

                          </div>
                        )}
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-8 border-t border-brand-navy/5 bg-zinc-50/50 flex justify-end gap-4">
                      <button onClick={() => !busy && setShowModal(false)} className="px-6 py-3 text-xs font-black text-brand-navy/40 hover:text-brand-navy transition-all uppercase tracking-widest">Cancel</button>
                      <PrimaryButton onClick={handleSave} disabled={busy} className="shadow-2xl shadow-brand-teal/30">{busy ? "Persisting..." : editingItemId ? "Update Account" : "Register Account"}</PrimaryButton>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deleteTargetItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md transition-opacity" onClick={() => !busy && setShowDeleteModal(false)}></div>
              <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-8 relative z-10 animate-scale-in">
                  <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><MdOutlineDelete className="w-12 h-12" /></div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Sever Relation?</h2>
                    <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest leading-relaxed">This will permanently remove <span className="text-brand-navy">{deleteTargetItem.name}</span> and all associated historical data references. Continue?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-4">
                      <button onClick={handleApplyDelete} className="w-full py-5 bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-red-500/30 active:scale-95 transition-all">Yes, Remove Record</button>
                      <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-xs font-black text-brand-navy/40 hover:text-brand-navy transition-all uppercase tracking-widest">Dismiss</button>
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
