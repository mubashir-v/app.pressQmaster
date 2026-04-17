import React from "react";
import { useLocation } from "react-router-dom";

export default function GenericDashboardView() {
  const location = useLocation();
  const path = location.pathname.split("/").pop();
  let title = "Dashboard";

  switch (path) {
    case "dashboard":
      title = "Dashboard Overview";
      break;
    case "quotes":
      title = "Quotations Engine";
      break;
    case "finances":
      title = "Finances & Billing";
      break;
    case "stats":
      title = "Production Statistics";
      break;
    case "docs":
      title = "Documents & Assets";
      break;
    case "calendar":
      title = "Production Calendar";
      break;
    case "support":
       title = "Support & Help Center";
       break;
    default:
      title = "Page Content";
  }

  return (
    <div className="w-full h-[600px] rounded-3xl border border-brand-navy/10 bg-white p-10 shadow-sm flex flex-col items-center justify-center text-brand-navy/50">
        <div className="h-24 w-24 rounded-full bg-brand-mint/30 flex items-center justify-center mb-6">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-brand-teal"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"></path></svg>
        </div>
        <h1 className="text-3xl font-bold text-brand-navy">{title}</h1>
        <p className="mt-2 text-sm text-brand-navy/60">This content area changes dynamically based on the sidebar scope restrictions above.</p>
    </div>
  );
}
