import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createOrganization } from "../../../infrastructure/api/backendService.js";
import { TextField, PrimaryButton } from "../../components/auth/AuthFormPrimitives.jsx";
import { MdBusiness } from "react-icons/md";

export default function CreateOrganizationPage() {
  const [orgName, setOrgName] = useState("");
  const [slugConfig, setSlugConfig] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = orgName.trim().length > 1;

  async function handleCreate() {
    setBusy(true);
    setErrorMsg("");
    try {
      const finalSlug = slugConfig.trim() || orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      const result = await createOrganization({ 
         name: orgName.trim(), 
         slug: finalSlug 
      });
      
      // Pluck the newly generated ID directly from the backend's response payload
      const newOrgId = result?.organization?.id || result?.id || result?.organizationId;
      if (newOrgId) {
          localStorage.setItem("pressmaster_active_org_id", newOrgId);
      }
      
      // Force page reload so the AuthContext re-hydrates the latest backend API response
      // This guarantees the new organization sits securely in user.organizations array and is immediately active
      window.location.href = "/dashboard";
    } catch (e) {
      if (e.response?.status === 409) {
         setErrorMsg("This organization URL slug is already taken. Please try another.");
      } else {
         setErrorMsg(e.response?.data?.message || "Failed to create organization.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl w-full mx-auto p-6 md:p-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-navy tracking-tight">Create Organization</h1>
        <p className="mt-2 text-brand-navy/60">
          Provision a new isolated workspace. You will be assigned as its billing owner.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-brand-navy/5 shadow-xl shadow-brand-navy/5 overflow-hidden">
        <div className="p-6 md:p-8 grid gap-8 md:grid-cols-2">
          
          {/* Main Form Area */}
          <div className="space-y-6">
            {errorMsg && (
               <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
                  {errorMsg}
               </div>
            )}
            
            <TextField
              label="Organization Name"
              placeholder="e.g. Acme Printing Press"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <div className="pt-4 flex items-center gap-4">
               <PrimaryButton disabled={busy || !canSubmit} onClick={handleCreate}>
                 {busy ? "Provisioning..." : "Create Workspace"}
               </PrimaryButton>
               <Link to="/dashboard" className="text-sm font-semibold text-brand-navy/60 hover:text-brand-navy">
                 Cancel
               </Link>
            </div>
          </div>

          {/* Context Panel */}
          <div className="rounded-xl bg-brand-mint/20 border border-brand-mint/50 p-6 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-brand-teal shadow-md shadow-brand-teal/10">
                <MdBusiness className="w-8 h-8" />
             </div>
             <div>
                <h3 className="font-bold text-brand-navy text-lg line-clamp-1">
                   {orgName.trim() || "Your New Organization"}
                </h3>
                <p className="text-sm text-brand-navy/60 mt-1">
                   {slugConfig.trim() || orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || "your-handle"}
                </p>
             </div>
             <p className="text-xs font-semibold text-brand-teal bg-white px-3 py-1 rounded-full uppercase tracking-widest mt-4 shadow-sm shadow-brand-teal/5">
                Owner Privileges
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}
