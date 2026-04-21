import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { MdAdd, MdMoreVert } from "react-icons/md";

// Utility to generate a stable 2-letter monogram style
function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter((n) => n.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UserProfileDrawer({ isCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef(null);

  const fallbackName = user?.displayName || user?.name || "Member";
  const userInitials = getInitials(fallbackName);
  
  // Close the popup when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Anchor Button triggering the flyout */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center transition-all rounded-xl hover:bg-brand-navy/5 ${
          isCollapsed ? "justify-center p-2" : "p-3 gap-3"
        } ${isOpen ? "bg-brand-navy/5" : ""}`}
      >
        {(user?.photoURL || user?.photoUrl) && !imageError ? (
            <img 
               src={user.photoURL || user.photoUrl} 
               alt="profile" 
               referrerPolicy="no-referrer"
               onError={() => setImageError(true)}
               className="h-10 w-10 flex-shrink-0 rounded-full border border-brand-navy/10 object-cover shadow-sm"
            />
        ) : (
            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-mint text-brand-teal font-bold text-sm">
              {userInitials}
            </div>
        )}
        
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold text-brand-navy truncate">
                {fallbackName}
              </div>
              <div className="text-xs font-medium text-brand-navy/60 truncate">
                {user?.email}
              </div>
            </div>
            <MdMoreVert className="w-5 h-5 text-brand-navy/60 flex-shrink-0" />
          </>
        )}
      </button>

      {/* Flyout Window */}
      {isOpen && (
        <div className="absolute left-full lg:left-0 ml-4 lg:ml-0 bottom-2 lg:bottom-16 w-72 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-brand-navy/5 z-50 overflow-hidden flex flex-col transform transition-all duration-200 origin-bottom-left">
          
          <div className="p-4 flex items-center gap-3">
             {(user?.photoURL || user?.photoUrl) && !imageError ? (
                 <img 
                    src={user.photoURL || user.photoUrl} 
                    alt="profile" 
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="h-12 w-12 flex-shrink-0 rounded-full border border-brand-navy/10 object-cover shadow-sm"
                 />
             ) : (
                 <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full bg-brand-mint text-brand-teal font-bold text-lg">
                    {userInitials}
                 </div>
             )}
             <div className="min-w-0">
                <div className="text-sm font-bold text-brand-navy truncate">
                   {fallbackName}
                </div>
                <div className="text-sm font-medium text-brand-navy/60 truncate">
                   {user?.email}
                </div>
             </div>
          </div>

          <div className="w-full h-px bg-brand-navy/5"></div>

          <div className="py-2">
            <button className="w-full px-5 py-2.5 text-left text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 transition-colors">
              Account Settings
            </button>
            <button 
              onClick={() => { setIsOpen(false); navigate("/dashboard/organization-settings"); }}
              className="w-full px-5 py-2.5 text-left text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 transition-colors"
            >
              Organization Settings
            </button>
            <button 
              onClick={handleLogout}
              className="w-full px-5 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>

          <div className="w-full h-px bg-brand-navy/5"></div>

          {/* Org Switcher Box Segment */}
          <div className="py-3">
            <div className="px-5 pb-2 text-xs font-bold text-brand-navy/40 uppercase tracking-wider">
               Switch Organization
            </div>
            
            <div className="max-h-48 overflow-y-auto no-scrollbar">
               {user?.organizations?.map((org, idx) => {
                  const isActive = (org.id || org.organizationId) === user.activeOrganizationId;

                  return (
                    <button 
                      key={org.id || org.organizationId || idx}
                      onClick={() => {
                          setIsOpen(false);
                          if (!isActive) {
                             localStorage.setItem("printq_active_org_id", org.id || org.organizationId);
                             window.location.reload(); // Hard flush react component tree to reload intercepts
                          }
                      }}
                      className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-brand-navy/5 text-left transition-colors group"
                    >
                       <div className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${isActive ? 'bg-brand-mint text-brand-teal' : 'bg-brand-navy/5 text-brand-navy/60 group-hover:bg-brand-mint/50 group-hover:text-brand-teal'}`}>
                         {getInitials(org.organizationName)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-brand-navy truncate">
                             {org.organizationName}
                          </div>
                          <div className="text-xs font-medium text-brand-navy/50 truncate">
                             {org.role?.charAt(0).toUpperCase() + org.role?.slice(1).toLowerCase() || 'Member'}
                          </div>
                       </div>
                       
                       {/* Radio switch simulation */}
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'border-brand-navy' : 'border-brand-navy/20'}`}>
                          {isActive && <div className="w-2.5 h-2.5 bg-brand-navy rounded-full"></div>}
                       </div>
                    </button>
                  );
               })}
            </div>
          </div>

          <div className="w-full h-px bg-brand-navy/5"></div>
          
          <button 
             onClick={() => { setIsOpen(false); navigate("/dashboard/organizations/new"); }}
             className="w-full p-4 flex items-center gap-3 hover:bg-brand-navy/5 transition-colors text-left"
          >
             <div className="w-8 h-8 rounded-full bg-brand-navy/5 flex items-center justify-center text-brand-navy flex-shrink-0">
               <MdAdd className="w-5 h-5" />
             </div>
             <span className="text-sm font-semibold text-brand-navy">Create new organization</span>
          </button>
        </div>
      )}
    </div>
  );
}
