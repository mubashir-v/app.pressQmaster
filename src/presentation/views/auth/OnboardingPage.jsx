import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShellLayout from "../../layouts/AuthShellLayout.jsx";
import { PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import BrandLogo from "../../components/logo/BrandLogo.jsx";
import { createOrganization } from "../../../infrastructure/api/backendService.js";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [slugConfig, setSlugConfig] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = orgName.trim().length > 1;

  async function handleSetupComplete() {
    setBusy(true);
    setErrorMsg("");
    try {
      // Auto-generate slug from name if user didn't specify one
      const finalSlug = slugConfig.trim() || orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      await createOrganization({
        name: orgName.trim(),
        slug: finalSlug
      });

      // Force page reload so the AuthContext re-hydrates the latest backend API response
      window.location.href = "/dashboard";
    } catch (e) {
      if (e.response?.status === 409) {
        setErrorMsg("This organization URL slug is already taken. Please try another.");
      } else {
        setErrorMsg(e.response?.data?.message || "Failed to finalize organization setup.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShellLayout>
      <div className="w-full max-w-md">
        <div className="inline-flex items-center gap-3">
          <BrandLogo className="w-10 h-10 shadow-[0_4px_14px_0_rgba(24,61,57,0.39)] rounded-[12px]" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-brand-navy">printQ</div>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-3xl">Let's set up your Press</h1>
        <p className="mt-2 text-sm text-brand-navy/60">Finalize your organization workspace.</p>

        <div className="mt-8 rounded-[2rem] border border-brand-navy/5 bg-white p-6 sm:p-8 shadow-xl shadow-brand-navy/5">
          <div className="grid gap-4">
            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-100">
                {errorMsg}
              </div>
            )}

            <TextField
              label="Organization name"
              placeholder="Your printing press name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <div className="pt-2">
              <PrimaryButton disabled={busy || !canSubmit} onClick={handleSetupComplete}>
                {busy ? "Saving..." : "Go to Dashboard"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </AuthShellLayout>
  );
}
