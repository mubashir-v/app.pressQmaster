import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { MdAdd, MdKeyboardArrowDown } from "react-icons/md";

function getInitials(name) {
  if (!name) return "??";
  const parts = name.split(" ").filter((n) => n.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UserProfileDrawer({ variant = "sidebar", isCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef(null);

  const fallbackName = user?.displayName || user?.name || "Member";
  const userInitials = getInitials(fallbackName);
  const activeOrg = user?.organizations?.find(
    (o) => (o.id || o.organizationId) === user.activeOrganizationId
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const avatar = (size = "h-8 w-8") => {
    if ((user?.photoURL || user?.photoUrl) && !imageError) {
      return (
        <img
          src={user.photoURL || user.photoUrl}
          alt="profile"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${size} flex-shrink-0 border border-gov-border object-cover`}
        />
      );
    }
    return (
      <div
        className={`${size} flex-shrink-0 flex items-center justify-center bg-gov-blue text-white font-bold text-xs`}
      >
        {userInitials}
      </div>
    );
  };

  if (variant === "header") {
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 border border-gov-border bg-white px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          {avatar()}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-gray-800 leading-tight max-w-[120px] truncate">
              {fallbackName}
            </div>
            {activeOrg && (
              <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                {activeOrg.organizationName}
              </div>
            )}
          </div>
          <MdKeyboardArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gov-border shadow-lg z-50 flex flex-col">
            <div className="p-4 flex items-center gap-3 border-b border-gov-border">
              {avatar("h-10 w-10")}
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">{fallbackName}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => { setIsOpen(false); navigate("/dashboard/organization-settings"); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Organization Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>

            {user?.organizations?.length > 0 && (
              <>
                <div className="border-t border-gov-border" />
                <div className="py-2">
                  <div className="px-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Switch Organization
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {user.organizations.map((org, idx) => {
                      const isActive = (org.id || org.organizationId) === user.activeOrganizationId;
                      return (
                        <button
                          key={org.id || org.organizationId || idx}
                          onClick={() => {
                            setIsOpen(false);
                            if (!isActive) {
                              localStorage.setItem("printq_active_org_id", org.id || org.organizationId);
                              window.location.reload();
                            }
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                        >
                          <div className={`h-8 w-8 flex items-center justify-center font-bold text-xs ${isActive ? "bg-gov-blue text-white" : "bg-gray-100 text-gray-600"}`}>
                            {getInitials(org.organizationName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">{org.organizationName}</div>
                            <div className="text-xs text-gray-500 truncate">{org.role}</div>
                          </div>
                          {isActive && <div className="w-2 h-2 bg-gov-blue" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-gov-border">
              <button
                onClick={() => { setIsOpen(false); navigate("/dashboard/organizations/new"); }}
                className="w-full p-3 flex items-center gap-2 hover:bg-gray-50 text-left text-sm font-semibold text-gov-blue"
              >
                <MdAdd className="w-4 h-4" />
                Create new organization
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* Legacy sidebar variant (kept for compatibility) */
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center transition-all hover:bg-brand-navy/5 ${
          isCollapsed ? "justify-center p-2" : "p-3 gap-3"
        } ${isOpen ? "bg-brand-navy/5" : ""}`}
      >
        {avatar("h-10 w-10")}
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold text-gov-blue truncate">{fallbackName}</div>
              <div className="text-xs font-medium text-gov-blue/60 truncate">{user?.email}</div>
            </div>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-full lg:left-0 ml-4 lg:ml-0 bottom-2 lg:bottom-16 w-72 bg-white border border-gov-border shadow-lg z-50 flex flex-col">
          <div className="p-4 flex items-center gap-3 border-b border-gov-border">
            {avatar("h-10 w-10")}
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-800 truncate">{fallbackName}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setIsOpen(false); navigate("/dashboard/organization-settings"); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Organization Settings
            </button>
            <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
