import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardHeader from "../components/layout/DashboardHeader.jsx";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import Breadcrumbs from "../components/layout/Breadcrumbs.jsx";

export default function DashboardLayout() {
  const location = useLocation();

  const isEditorView =
    location.pathname.includes("/dashboard/quotes/new") ||
    /\/dashboard\/quotes\/[a-f0-9]{24}(\/view)?/.test(location.pathname) ||
    /\/dashboard\/jobs\/[a-f0-9]{24}$/.test(location.pathname) ||
    /\/dashboard\/jobs\/quotation\/[a-f0-9]{24}/.test(location.pathname);

  return (
    <div className="gov-app flex h-screen flex-col overflow-hidden bg-gov-bg font-sans text-brand-dark">
      <DashboardHeader />
      <TopNavBar />
      <Breadcrumbs />

      <main className={`flex-1 min-h-0 ${isEditorView ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
        {isEditorView ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="mx-auto max-w-[1600px] px-4 py-4">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
