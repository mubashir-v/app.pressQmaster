import React from "react";
import Sidebar from "../components/layout/Sidebar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../application/hooks/useAuth.jsx";


// Utility to generate a stable 2-letter monogram style
function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter((n) => n.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DashboardLayout() {
  const { user } = useAuth();
  
  const activeOrg = user?.organizations?.find(o => (o.id || o.organizationId) === user.activeOrganizationId);
  const location = useLocation();

  // Hide sidebar/header only for the detailed Quotation Editor (new or specific ID)
  const isEditorView = location.pathname.includes("/dashboard/quotes/new") || /\/dashboard\/quotes\/[a-f0-9]{24}/.test(location.pathname);



  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans text-brand-dark">
      {!isEditorView && <Sidebar />}
      <main className="flex-1 overflow-y-auto w-full relative">
         {!isEditorView && (
           <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between bg-[#F8FAFC]/80 px-8 backdrop-blur-sm">
              <div className="flex lg:w-1/2 w-full max-lg items-center gap-3 rounded-full border border-brand-navy/10 bg-white px-4 py-2.5 shadow-sm">
                  <svg className="h-5 w-5 text-brand-navy/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  <input type="text" placeholder="Search..." className="flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-brand-navy/30" />
              </div>

              <div className="flex items-center gap-6">
                  <div className="text-sm font-semibold text-brand-navy/60">20 Apr 2026</div>
                  <button className="relative text-brand-navy/60 hover:text-brand-navy transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-brand-teal ring-2 ring-white"></span>
                  </button>
                  
                  {activeOrg && (
                      <div className="flex items-center gap-3 border-l border-brand-navy/10 pl-6 cursor-default">
                          <div className="flex flex-col items-end justify-center">
                             <div className="text-sm font-bold text-brand-navy">{activeOrg.organizationName}</div>
                             <div className="text-[10px] font-bold text-brand-teal uppercase tracking-widest leading-none mt-1">
                                {activeOrg.role.toLowerCase()}
                             </div>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy text-white shadow-sm font-bold text-sm border-2 border-brand-mint/50">
                              {getInitials(activeOrg.organizationName)}
                          </div>
                      </div>
                  )}
              </div>
           </header>
         )}

         {/* Extracted page content gets rendered here seamlessly */}
         <div className={isEditorView ? "p-0" : "px-8 pb-12 pt-6"}>
             <Outlet />
         </div>
      </main>
    </div>
  );

}
