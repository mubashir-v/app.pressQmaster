import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { updateOrganizationSettings, deleteOrganization } from "../../../infrastructure/api/backendService.js";
import { TextField, PrimaryButton } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdBusiness, MdShield, MdSave } from "react-icons/md";

// Reusable Tailwind Toggle Component
function ToggleSwitch({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${
        enabled ? "bg-brand-teal" : "bg-zinc-200"
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => onChange(!enabled)}
    >
      <span className="sr-only">Toggle selection</span>
      <span
        aria-hidden="true"
        className={`${
          enabled ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const activeOrg = user.organizations?.find(o => (o.id || o.organizationId) === user.activeOrganizationId);
  
  // Guard initialization defensively while router sorts layout
  if (!activeOrg) return null;

  const isOwner = activeOrg.role === "OWNER";

  // State mappings
  const [name, setName] = useState(activeOrg.organizationName || "");
  const [isActive, setIsActive] = useState(activeOrg.isActive ?? true);
  
  const [addressLine1, setAddressLine1] = useState(activeOrg.address?.line1 || "");
  const [addressLine2, setAddressLine2] = useState(activeOrg.address?.line2 || "");
  const [city, setCity] = useState(activeOrg.address?.city || "");
  const [region, setRegion] = useState(activeOrg.address?.region || "");
  const [postalCode, setPostalCode] = useState(activeOrg.address?.postalCode || "");
  const [country, setCountry] = useState(activeOrg.address?.country || "");

  const canSubmit = name.trim().length > 1;

  async function handleDelete() {
      setDeleteBusy(true);
      setErrorMsg("");
      try {
          await deleteOrganization();
          
          // Wipe the active tenancy explicitly since the organization is effectively obliterated
          localStorage.removeItem("pressmaster_active_org_id");
          window.location.href = "/dashboard";
          
      } catch (e) {
          setShowDeleteConfirm(false);
          setErrorMsg(e.response?.data?.message || "Failed to delete the organization.");
          setDeleteBusy(false);
      }
  }

  async function handleSave() {
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      // Build normalized address object (trim strings, drop empty ones)
      const rawAddress = { line1: addressLine1, line2: addressLine2, city, region, postalCode, country };
      const composedAddress = {};
      let hasAddressData = false;
      
      for (const [key, value] of Object.entries(rawAddress)) {
         if (value.trim()) {
             composedAddress[key] = value.trim();
             hasAddressData = true;
         }
      }

      const payload = {
         name: name.trim(),
         isActive,
         // The API contract dictates the address completely replaces the previous one
         address: hasAddressData ? composedAddress : null
      };

      await updateOrganizationSettings(payload);
      setSuccessMsg("Organization settings securely updated.");
      
      // Auto-refresh the DOM structure in 1.5 seconds mapping contexts to the latest Database state
      setTimeout(() => {
          localStorage.setItem("pressmaster_active_org_id", activeOrg.organizationId || activeOrg.id);
          window.location.reload();
      }, 1500);

    } catch (e) {
      if (e.response?.status === 403) {
         setErrorMsg("You are not authorized to update these settings.");
      } else {
         setErrorMsg(e.response?.data?.message || "Failed to save configuration.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-4 md:p-10 animate-fade-in relative pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Organization Profile</h1>
        <p className="mt-2 text-brand-navy/60">
          Manage your organization's core details and physical address.
        </p>
      </div>

      {!isOwner && (
        <div className="mb-8 rounded-xl bg-amber-50 p-4 border border-amber-200 flex gap-4">
           <MdShield className="w-6 h-6 text-amber-500 flex-shrink-0" />
           <div>
              <h3 className="text-sm font-bold text-amber-800">Read-Only Access</h3>
              <p className="text-sm text-amber-700 mt-1">You hold a `{activeOrg.role}` role locally. Only billing Owners are permitted to make changes to organization settings.</p>
           </div>
        </div>
      )}

      {errorMsg && (
         <div className="mb-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
            {errorMsg}
         </div>
      )}

      {successMsg && (
         <div className="mb-8 rounded-xl bg-brand-mint/30 p-4 text-sm font-semibold text-brand-teal border border-brand-mint">
            {successMsg}
         </div>
      )}

      <div className="space-y-6">
          {/* General Information Block */}
          <section className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
                 <h2 className="font-bold text-brand-navy">General Information</h2>
             </div>
             <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                       <TextField
                         label="Organization Name"
                         placeholder="e.g. Acme Printing Press"
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         disabled={!isOwner || busy}
                       />
                       <div>
                         <label className="block text-sm font-bold text-brand-navy mb-2">Custom URL Handle</label>
                         <p className="text-sm text-brand-navy/50 bg-zinc-50 p-3 rounded-lg font-mono border border-brand-navy/5">
                            {activeOrg.slug || "No handle provided"}
                         </p>
                       </div>
                   </div>
                   
                   <div className="pt-2">
                       <label className="flex items-center gap-4 cursor-pointer p-4 border border-brand-navy/5 rounded-xl hover:bg-zinc-50 transition-colors">
                           <ToggleSwitch enabled={isActive} onChange={setIsActive} disabled={!isOwner || busy} />
                           <div>
                              <div className="font-bold text-brand-navy">Organization Status</div>
                              <div className="text-xs text-brand-navy/50 mt-1">{isActive ? 'Active and accessible to your team.' : 'Paused. Members cannot access this workspace.'}</div>
                           </div>
                       </label>
                   </div>
                </div>
             </div>
          </section>

          {/* Physical Address Block */}
          <section className="bg-white rounded-2xl border border-brand-navy/5 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-brand-navy/5 bg-zinc-50/50">
                 <h2 className="font-bold text-brand-navy">Physical Address</h2>
             </div>
             <div className="p-6 md:p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                         <TextField
                             label="Address Line 1"
                             placeholder="Street address, P.O. box, company name, c/o"
                             value={addressLine1}
                             onChange={(e) => setAddressLine1(e.target.value)}
                             disabled={!isOwner || busy}
                         />
                     </div>
                     <div className="md:col-span-2">
                         <TextField
                             label="Address Line 2"
                             placeholder="Apartment, suite, unit, building, floor, etc."
                             value={addressLine2}
                             onChange={(e) => setAddressLine2(e.target.value)}
                             disabled={!isOwner || busy}
                         />
                     </div>
                     <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} disabled={!isOwner || busy}/>
                     <TextField label="State / Province" value={region} onChange={(e) => setRegion(e.target.value)} disabled={!isOwner || busy}/>
                     <TextField label="ZIP / Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={!isOwner || busy}/>
                     <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={!isOwner || busy}/>
                 </div>
             </div>
          </section>
          {/* Danger Zone */}
          {isOwner && (
             <section className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden mt-8">
                 <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
                     <h2 className="font-bold text-red-700">Danger Zone</h2>
                 </div>
                 <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="font-semibold text-brand-navy">Delete this organization</h3>
                        <p className="text-sm text-brand-navy/60 mt-1">
                           Once you delete an organization, there is no going back. Please be certain.
                        </p>
                    </div>
                    <button 
                       onClick={() => setShowDeleteConfirm(true)}
                       disabled={busy}
                       className="px-6 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap"
                    >
                       Delete Organization
                    </button>
                 </div>
             </section>
          )}
      </div>

      {isOwner && (
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 lg:p-6 bg-white/80 backdrop-blur-md border-t border-brand-navy/5 z-40 flex justify-end">
              <PrimaryButton disabled={busy || !canSubmit} onClick={handleSave} className="flex items-center gap-2 px-8">
                 <MdSave className="w-5 h-5" />
                 {busy ? "Saving Changes..." : "Save Changes"}
              </PrimaryButton>
          </div>
      )}

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
               <h2 className="text-xl font-bold text-red-600 mb-2">Delete Organization?</h2>
               <p className="text-brand-navy/70 mb-6">
                  Are you absolutely sure you want to delete <strong>{activeOrg.organizationName}</strong>? This action will permanently block access to this workspace.
               </p>
               <div className="flex gap-4 justify-end">
                  <button 
                     onClick={() => setShowDeleteConfirm(false)}
                     disabled={deleteBusy}
                     className="px-5 py-2 rounded-xl text-brand-navy/60 hover:text-brand-navy hover:bg-zinc-100 font-semibold transition-colors"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={handleDelete}
                     disabled={deleteBusy}
                     className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center gap-2"
                  >
                     {deleteBusy ? "Deleting..." : "Yes, Delete Organization"}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
