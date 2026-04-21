import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { updateOrganizationProfile, updateOrganizationSettings, deleteOrganization } from "../../../infrastructure/api/backendService.js";
import { TextField, PrimaryButton, SelectField } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdBusiness, MdShield, MdSave, MdSettingsSuggest } from "react-icons/md";

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
  const isAdmin = activeOrg.role === "ADMIN";
  const hasAllScope = activeOrg.scopes?.includes("all_scope");
  const canEdit = isOwner || isAdmin || hasAllScope;

  // State mappings
  const [name, setName] = useState(activeOrg.organizationName || "");
  const [isActive, setIsActive] = useState(activeOrg.isActive ?? true);
  
  const [addressLine1, setAddressLine1] = useState(activeOrg.address?.line1 || "");
  const [addressLine2, setAddressLine2] = useState(activeOrg.address?.line2 || "");
  const [city, setCity] = useState(activeOrg.address?.city || "");
  const [region, setRegion] = useState(activeOrg.address?.region || "");
  const [postalCode, setPostalCode] = useState(activeOrg.address?.postalCode || "");
  const [country, setCountry] = useState(activeOrg.address?.country || "");

  // UI Preferences state
  const [defaultLengthUnit, setDefaultLengthUnit] = useState(user.settings?.defaultLengthUnit || "mm");

  const canSubmit = name.trim().length > 1;

  async function handleDelete() {
      setDeleteBusy(true);
      setErrorMsg("");
      try {
          await deleteOrganization();
          
          // Wipe the active tenancy explicitly since the organization is effectively obliterated
          localStorage.removeItem("printq_active_org_id");
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

      const profilePayload = {
         name: name.trim(),
         isActive,
         address: hasAddressData ? composedAddress : null
      };

      const settingsPayload = {
         defaultLengthUnit
      };

      // Execute both updates in parallel for atomicity
      await Promise.all([
          updateOrganizationProfile(profilePayload),
          updateOrganizationSettings(settingsPayload)
      ]);

      setSuccessMsg("Organization profile and UI preferences updated.");
      
      // Auto-refresh the DOM structure in 1.5 seconds mapping contexts to the latest Database state
      setTimeout(() => {
          localStorage.setItem("printq_active_org_id", activeOrg.organizationId || activeOrg.id);
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
    <div className="max-w-7xl w-full mx-auto p-4 md:p-6 animate-fade-in relative pb-16">
      <div className="mb-4">
        <h1 className="text-xl font-black text-brand-navy tracking-tight">Organization Profile</h1>
        <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest mt-0.5">
          Workspace Identity & Preferences
        </p>
      </div>

      {!canEdit && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 border border-amber-200 flex gap-3 items-center">
           <MdShield className="w-4 h-4 text-amber-500 flex-shrink-0" />
           <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Read-Only Access: Only Owners or Admins can modify settings.</p>
        </div>
      )}

      {(errorMsg || successMsg) && (
         <div className={`mb-4 rounded-lg p-3 text-[10px] font-black uppercase tracking-widest border border-current italic flex items-center gap-2 ${errorMsg ? 'bg-red-50 text-red-600' : 'bg-brand-mint/20 text-brand-teal'}`}>
            <span>{errorMsg || successMsg}</span>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
              {/* General Information Block */}
              <section className="bg-white rounded-xl border border-brand-navy/5 shadow-sm overflow-hidden">
                 <div className="px-4 py-2 border-b border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
                     <h2 className="text-[10px] font-black text-brand-navy uppercase tracking-widest">General Information</h2>
                 </div>
                 <div className="p-4 space-y-4">
                    <TextField
                      label="Organization Name"
                      placeholder="e.g. Acme Printing Press"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canEdit || busy}
                    />
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="min-w-0">
                          <label className="block text-[10px] font-bold text-brand-navy/60 mb-1 uppercase tracking-wider">URL Handle</label>
                          <div className="text-[10px] font-bold text-brand-navy/40 bg-zinc-50 p-2 rounded-lg border border-brand-navy/5 truncate font-mono">
                             {activeOrg.slug || "No handle"}
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer p-2 border border-brand-navy/5 rounded-lg hover:bg-zinc-50 transition-colors shrink-0">
                            <ToggleSwitch enabled={isActive} onChange={setIsActive} disabled={!canEdit || busy} />
                            <div className="text-[10px] font-bold text-brand-navy uppercase tracking-tight leading-tight">Status</div>
                        </label>
                    </div>
                 </div>
              </section>

              {/* UI Preferences Block */}
              <section className="bg-white rounded-xl border border-brand-navy/5 shadow-sm overflow-hidden">
                 <div className="px-4 py-2 border-b border-brand-navy/5 bg-zinc-50/50 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <MdSettingsSuggest className="w-4 h-4 text-brand-teal" />
                        <h2 className="text-[10px] font-black text-brand-navy uppercase tracking-widest">UI Preferences</h2>
                     </div>
                 </div>
                 <div className="p-4">
                     <SelectField 
                       label="Default Length Unit" 
                       value={defaultLengthUnit} 
                       onChange={(e) => setDefaultLengthUnit(e.target.value)}
                       disabled={!canEdit || busy}
                       options={[
                          { label: "Millimeters (mm)", value: "mm" },
                          { label: "Centimeters (cm)", value: "cm" },
                          { label: "Inches (inch)", value: "inch" }
                       ]}
                     />
                     <p className="mt-2 text-[9px] font-bold text-brand-navy/20 uppercase tracking-widest italic leading-tight">
                        Used as default for all inventory and calculator forms.
                     </p>
                 </div>
              </section>
          </div>

          <div className="space-y-4">
              {/* Physical Address Block */}
              <section className="bg-white rounded-xl border border-brand-navy/5 shadow-sm overflow-hidden">
                 <div className="px-4 py-2 border-b border-brand-navy/5 bg-zinc-50/50">
                     <h2 className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Physical Address</h2>
                 </div>
                 <div className="p-4 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2">
                             <TextField
                                 label="Address Line 1"
                                 placeholder="Street address..."
                                 value={addressLine1}
                                 onChange={(e) => setAddressLine1(e.target.value)}
                                 disabled={!canEdit || busy}
                             />
                         </div>
                         <div className="md:col-span-2">
                             <TextField
                                 label="Address Line 2"
                                 placeholder="Suite, unit, etc."
                                 value={addressLine2}
                                 onChange={(e) => setAddressLine2(e.target.value)}
                                 disabled={!canEdit || busy}
                             />
                         </div>
                         <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEdit || busy}/>
                         <TextField label="State / Province" value={region} onChange={(e) => setRegion(e.target.value)} disabled={!canEdit || busy}/>
                         <TextField label="ZIP Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} disabled={!canEdit || busy}/>
                         <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={!canEdit || busy}/>
                     </div>
                 </div>
              </section>

              {/* Danger Zone */}
              {isOwner && (
                 <section className="bg-red-50/30 rounded-xl border border-red-100 shadow-sm overflow-hidden">
                     <div className="px-4 py-2 border-b border-red-100 bg-red-100/30">
                         <h2 className="text-[10px] font-black text-red-700 uppercase tracking-widest">Danger Zone</h2>
                     </div>
                     <div className="p-4 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-[10px] font-bold text-brand-navy uppercase">Delete Workspace</h3>
                            <p className="text-[9px] text-brand-navy/40 mt-0.5">Permenantly obliterate all data.</p>
                        </div>
                        <button 
                           onClick={() => setShowDeleteConfirm(true)}
                           disabled={busy}
                           className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                        >
                           Obliterate
                        </button>
                     </div>
                 </section>
              )}
          </div>
      </div>

      {canEdit && (
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
