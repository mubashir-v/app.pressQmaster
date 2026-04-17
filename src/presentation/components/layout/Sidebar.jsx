import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { 
  MdSpaceDashboard, 
  MdPeople, 
  MdAccountBalanceWallet, 
  MdInsertChart, 
  MdArticle, 
  MdEvent, 
  MdSupportAgent,
  MdPrint,
} from "react-icons/md";
import BrandLogo from "../logo/BrandLogo.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: <MdSpaceDashboard className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_dashboard"] },
  { label: "Quotations", href: "/dashboard/quotes", icon: <MdPeople className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["manage_quotes"] },
  { label: "Finances", href: "/dashboard/finances", icon: <MdAccountBalanceWallet className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["manage_billing"] },
  { label: "Statistics", href: "/dashboard/stats", icon: <MdInsertChart className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_statistics"] },
  { label: "Documents", href: "/dashboard/docs", icon: <MdArticle className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["manage_documents"] },
  { label: "Calendar", href: "/dashboard/calendar", icon: <MdEvent className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["manage_calendar"] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Scope verification logic
  const availableItems = SIDEBAR_ITEMS.filter((item) => {
    if (!item.requiredScopes) return true;
    return item.requiredScopes.some((scope) => user?.scopes?.includes(scope));
  });

  return (
    <aside className={`no-scrollbar flex h-screen flex-col overflow-y-auto bg-white border-r border-brand-navy/5 shadow-2xl shadow-brand-navy/5 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
      {/* App brand dropdown / toggle */}
      <div className={`py-6 flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-6"}`}>
         <div className="flex items-center gap-3 overflow-hidden">
             <div className="flex-shrink-0 flex items-center justify-center">
                 <BrandLogo className="w-10 h-10 shadow-sm" />
             </div>
             {!isCollapsed && (
                 <div className="font-bold text-lg text-brand-navy tracking-tight whitespace-nowrap">Press <span className="text-brand-teal">Master</span></div>
             )}
         </div>
         {!isCollapsed && (
             <button onClick={() => setIsCollapsed(true)} className="text-brand-navy/60 hover:text-brand-navy transition-colors flex-shrink-0">
                 <FaChevronLeft className="w-3 h-3"/>
             </button>
         )}
      </div>

      <div className="px-5 mb-8 mt-2 flex justify-center">
         {isCollapsed ? (
             <button onClick={() => setIsCollapsed(false)} className="w-10 h-10 flex items-center justify-center bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal text-white rounded-xl transition-all shadow-lg shadow-brand-teal/30">
                <FaChevronRight className="w-3 h-3" />
             </button>
         ) : (
             <button className="w-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-brand-teal/30">
                New Quote
             </button>
         )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {availableItems.map((item) => (
           <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            preventScrollReset={true}
            className={({ isActive }) =>
              [
                "group relative flex items-center gap-4 py-3 text-sm font-semibold transition-colors overflow-hidden whitespace-nowrap",
                isCollapsed ? "px-0 justify-center" : "px-8 justify-start",
                isActive
                  ? "text-brand-navy bg-brand-mint/20"
                  : "text-brand-navy/50 hover:text-brand-navy hover:bg-brand-mint/5"
              ].join(" ")
            }
          >
            {({ isActive }) => (
               <>
                  {/* Active Indicator Bar */}
                  {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-teal rounded-r-md"></div>
                  )}
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
               </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Support / Bottom Menu */}
      <div className="mt-auto mb-8 space-y-1">
         <NavLink
            to="/dashboard/support"
            className={({ isActive }) =>
               [
                 "group relative flex items-center gap-4 py-3 text-sm font-semibold transition-colors overflow-hidden whitespace-nowrap",
                 isCollapsed ? "px-0 justify-center" : "px-8 justify-start",
                 isActive
                   ? "text-brand-navy bg-brand-mint/20"
                   : "text-brand-navy/50 hover:text-brand-navy hover:bg-brand-mint/5"
               ].join(" ")
             }
          >
            {({ isActive }) => (
               <>
                  {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-teal rounded-r-md"></div>
                  )}
                  <MdSupportAgent className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>Support</span>}
               </>
            )}
         </NavLink>
         <div className={`mt-6 flex ${isCollapsed ? "justify-center" : "px-8"}`}>
            <button className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-teal text-white shadow-lg shadow-brand-teal/30 hover:bg-brand-teal-dark transition-all">
               <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
            </button>
         </div>
      </div>
    </aside>
  );
}
