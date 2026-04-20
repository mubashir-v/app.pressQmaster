import React from "react";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import AuthShellLayout from "../../layouts/AuthShellLayout.jsx";
import { Link } from "react-router-dom";
import BrandLogo from "../../components/logo/BrandLogo.jsx";

// Utility to generate a stable 2-letter monogram style
function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter((n) => n.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function SelectWorkspacePage() {
  const { user } = useAuth();

  if (!user || user.organizations?.length === 0) {
    // Safety bounds handled normally by ProtectedRoute
    return null;
  }

  const handleOrgSelection = (orgId) => {
    localStorage.setItem("printq_active_org_id", orgId);
    // Hard reload mounts App, hooks up apiClient interceptors instantly, and routes to /dashboard
    window.location.href = "/dashboard";
  };

  return (
    <AuthShellLayout>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3">
          <BrandLogo className="w-10 h-10 shadow-[0_4px_14px_0_rgba(24,61,57,0.39)] rounded-[12px]" />
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight text-brand-navy">printQ</div>
          </div>
        </Link>

        <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-3xl">Select Workspace</h1>
        <p className="mt-2 text-sm text-brand-navy/60">Choose which organization context to load.</p>

        <div className="mt-8 rounded-[2rem] border border-brand-navy/5 bg-white p-6 sm:p-8 shadow-xl shadow-brand-navy/5">
          <div className="grid gap-3">
            {user.organizations.map((org, idx) => (
              <button
                key={org.id || org.organizationId || idx}
                onClick={() => handleOrgSelection(org.id || org.organizationId)}
                className="w-full p-4 flex items-center gap-4 text-left border border-brand-navy/10 hover:border-brand-teal transition-all rounded-xl hover:shadow-md hover:shadow-brand-teal/10 group bg-white"
              >
                <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy group-hover:bg-brand-mint text-lg font-bold tracking-tight transition-colors">
                  {getInitials(org.organizationName)}
                </div>
                <div>
                  <div className="font-bold text-brand-navy group-hover:text-brand-teal transition-colors">
                    {org.organizationName}
                  </div>
                  <div className="text-xs font-semibold text-brand-navy/50 uppercase tracking-widest mt-0.5">
                    {org.role} Role
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthShellLayout>
  );
}
