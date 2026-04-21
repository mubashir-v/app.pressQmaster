import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";





import { useAuth } from "../../../application/hooks/useAuth.jsx";
import {
   MdSpaceDashboard,
   MdPeople,
   MdArticle,
   MdReceiptLong,
   MdWork,
   MdGroup,
   MdSupportAgent,
   MdPrint,
   MdLayers,
   MdMemory,
   MdInvertColors,
   MdFormatSize,
   MdBuild
} from "react-icons/md";
import BrandLogo from "../logo/BrandLogo.jsx";
import UserProfileDrawer from "./UserProfileDrawer.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const MAIN_ITEMS = [
   // { label: "Dashboard", href: "/dashboard", icon: <MdSpaceDashboard className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_dashboard"] },
   { label: "Customers", href: "/dashboard/customers", icon: <MdPeople className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_customers", "edit_customers", "manage_customers"] },
   { label: "Quotation", href: "/dashboard/quotes", icon: <MdArticle className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_quotes", "edit_quotes", "manage_quotes"] },
   // { label: "Invoice", href: "/dashboard/invoices", icon: <MdReceiptLong className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_invoices", "edit_invoices", "manage_invoices"] },
   // { label: "Jobs", href: "/dashboard/jobs", icon: <MdWork className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_jobs", "edit_jobs", "manage_jobs"] },
   { label: "Users", href: "/dashboard/users", icon: <MdGroup className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_users", "edit_users", "manage_users"] },
];


const INVENTORY_ITEMS = [
   { label: "Printer & Plates", href: "/dashboard/printers", icon: <MdPrint className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_printers", "edit_printers", "manage_printers"] },
   { label: "Paper & Stock", href: "/dashboard/papers", icon: <MdLayers className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_stocks", "edit_stocks", "manage_stocks"] },
   { label: "Size Charts", href: "/dashboard/size-charts", icon: <MdFormatSize className="w-5 h-5 flex-shrink-0" />, requiredScopes: ["view_sizeChart", "edit_sizeChart", "manage_sizeChart"] },
];

export default function Sidebar() {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [isCollapsed, setIsCollapsed] = useState(false);





   // Scope verification logic
   const availableMainItems = MAIN_ITEMS.filter((item) => {
      if (!item.requiredScopes) return true;
      if (user?.scopes?.includes("all_scope")) return true;
      return item.requiredScopes.some((scope) => user?.scopes?.includes(scope));
   });

   const availableInventoryItems = INVENTORY_ITEMS.filter((item) => {
      if (!item.requiredScopes) return true;
      if (user?.scopes?.includes("all_scope")) return true;
      return item.requiredScopes.some((scope) => user?.scopes?.includes(scope));
   });

   return (
      <aside className={`flex h-screen flex-col bg-white border-r border-brand-navy/5 shadow-2xl shadow-brand-navy/5 transition-all duration-300 relative z-40 ${isCollapsed ? "w-20" : "w-64"}`}>
         {/* App brand dropdown / toggle */}
         <div className={`py-6 flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-6"}`}>
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="flex-shrink-0 flex items-center justify-center">
                  <BrandLogo className="w-10 h-10 shadow-sm" />
               </div>
               {!isCollapsed && (
                  <div className="font-bold text-lg text-brand-navy tracking-tight whitespace-nowrap">print<span className="text-brand-teal">Q</span></div>
               )}
            </div>
            {!isCollapsed && (
               <button onClick={() => setIsCollapsed(true)} className="text-brand-navy/60 hover:text-brand-navy transition-colors flex-shrink-0">
                  <FaChevronLeft className="w-3 h-3" />
               </button>
            )}
         </div>

         <div className="px-5 mb-8 mt-2 flex justify-center">
            {isCollapsed ? (
               <button onClick={() => setIsCollapsed(false)} className="w-10 h-10 flex items-center justify-center bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal text-white rounded-xl transition-all shadow-lg shadow-brand-teal/30">
                  <FaChevronRight className="w-3 h-3" />
               </button>
             ) : (
                <button 
                   onClick={() => navigate("/dashboard/quotes/new")}
                   className="w-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-brand-teal/30"
                >
                   New Quote
                </button>
             )}



         </div>

         {/* Navigation Links */}
         <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {availableMainItems.map((item) => (
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

            {availableInventoryItems.length > 0 && (
               <div className="pt-6 pb-2">
                  {!isCollapsed && (
                     <div className="px-8 text-xs font-bold tracking-widest text-brand-navy/40 uppercase mb-2">
                        Inventory & Equipment
                     </div>
                  )}
                  {isCollapsed && (
                     <div className="mx-auto w-8 border-t border-brand-navy/10 mb-4 mt-2"></div>
                  )}
                  {availableInventoryItems.map((item) => (
                     <NavLink
                        key={item.href}
                        to={item.href}
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
                              {isActive && (
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-teal rounded-r-md"></div>
                              )}
                              {item.icon}
                              {!isCollapsed && <span>{item.label}</span>}
                           </>
                        )}
                     </NavLink>
                  ))}
               </div>
            )}
         </nav>

         {/* Support / Bottom Menu */}
         <div className="mt-auto mb-4 space-y-1">
            <div className="pt-4 px-4 pb-0">
               <UserProfileDrawer isCollapsed={isCollapsed} />
            </div>
         </div>
      </aside>
   );
}
