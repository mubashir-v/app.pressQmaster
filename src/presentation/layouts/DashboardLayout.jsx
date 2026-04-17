import React from "react";
import Sidebar from "../components/layout/Sidebar.jsx";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans text-brand-dark">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full relative">
         {/* Top Header Placeholder corresponding to the user mock (Search, Notification, Profile) */}
         <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between bg-[#F8FAFC]/80 px-8 backdrop-blur-sm">
            <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-brand-navy/10 bg-white px-4 py-2.5 shadow-sm">
                <svg className="h-5 w-5 text-brand-navy/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search..." className="flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-brand-navy/30" />
            </div>

            <div className="flex items-center gap-6">
                <div className="text-sm font-semibold text-brand-navy/60">29 Aug 2019</div>
                <button className="relative text-brand-navy/60 hover:text-brand-navy transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-brand-teal ring-2 ring-white"></span>
                </button>
                <div className="flex items-center gap-3 border-l border-brand-navy/10 pl-6 cursor-pointer">
                    <div className="text-sm font-bold text-brand-navy">Charles Merl</div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-white shadow-sm font-bold tracking-widest text-xs">
                        CM
                    </div>
                    <svg className="w-4 h-4 text-brand-navy/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
         </header>

         {/* Extracted page content gets rendered here seamlessly */}
         <div className="px-8 pb-12 pt-6">
             <Outlet />
         </div>
      </main>
    </div>
  );
}
