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
    <div className="gov-panel">
      <div className="gov-panel-header">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="gov-panel-body flex flex-col items-center justify-center text-center min-h-[400px] text-gray-500">
        <div className="h-16 w-16 bg-gray-100 border border-gov-border flex items-center justify-center mb-6">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-gov-blue"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"></path></svg>
        </div>
        <p className="text-sm text-gray-600 max-w-md">This content area changes dynamically based on the sidebar scope restrictions above.</p>
      </div>
    </div>
  );
}
