import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../infrastructure/firebase/config.js";
import { getCurrentUser, getOrganizationScopes } from "../../infrastructure/api/backendService.js";
import BrandLogo from "../../presentation/components/logo/BrandLogo.jsx";

// Create the Context
const AuthContext = createContext(null);

// Create the Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApiResolving, setIsApiResolving] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    // Listen to Firebase Auth state stream
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setGlobalError(null);
      
      if (firebaseUser) {
        setIsApiResolving(true);
        try {
           // Verify against the central Database contract
           const payload = await getCurrentUser();
           
           let activeOrgId = localStorage.getItem("pressmaster_active_org_id");
           let needsOrgSelection = false;

           // Auto-resolve organization if only exactly 1 is provisioned
           if (payload.organizations && payload.organizations.length === 1) {
               activeOrgId = payload.organizations[0].organizationId || payload.organizations[0].id;
               localStorage.setItem("pressmaster_active_org_id", activeOrgId);
           } else if (payload.organizations && payload.organizations.length > 1) {
               // Verify the stored key actually maps to one they belong to!
               const isValid = payload.organizations.map(o => o.organizationId || o.id).includes(activeOrgId);
               if (!isValid) {
                   activeOrgId = null;
                   localStorage.removeItem("pressmaster_active_org_id");
                   needsOrgSelection = true;
               }
           }

           // Fetch runtime scopes if we securely bound an active organization context
           let resolvedScopes = [];
           if (activeOrgId && !needsOrgSelection && !(payload.requiresOrganizationSetup || payload.code === "NEEDS_ORGANIZATION_SETUP")) {
               try {
                  const scopePayload = await getOrganizationScopes();
                  resolvedScopes = scopePayload.scopes || [];
               } catch (scopeError) {
                  const errCode = scopeError.response?.data?.code;
                  console.error("Failed to fetch organization scopes bounds", scopeError.response?.data || scopeError.message);
                  
                  // Server explicitly rejected their active organization credential mapping
                  if (["MISSING_ORGANIZATION_ID", "INVALID_ORGANIZATION_ID", "NOT_ORGANIZATION_MEMBER"].includes(errCode)) {
                      console.warn("Invalidated Organization ID detected. Purging active session state.");
                      activeOrgId = null;
                      localStorage.removeItem("pressmaster_active_org_id");
                      needsOrgSelection = true; // Auto-triggers ProtectedRoute barrier
                  }
               }
           }
           
           // We expect { authenticated: true, code: 'SESSION_OK' | 'NEEDS_ORGANIZATION_SETUP', ... }
           setUser({
              ...payload.user, // id, firebaseUid, email, displayName, photoUrl
              // Double resilience: check both the literal boolean and the root status code
              requiresOrganizationSetup: payload.requiresOrganizationSetup || payload.code === "NEEDS_ORGANIZATION_SETUP",
              requiresOrganizationSelection: needsOrgSelection,
              activeOrganizationId: activeOrgId,
              organizations: payload.organizations,
              sessionCode: payload.code,
              
              // Load the dynamically computed server-bound scopes
              scopes: resolvedScopes
           });
        } catch (e) {
           console.error("Backend auth resolution failed. Logging out locally.", e);
           const errorResponse = e.response?.data?.message || "Our server is experiencing issues. Please try again later.";
           setGlobalError(`Server Error: ${errorResponse}`);
           setUser(null);
           localStorage.removeItem("pressmaster_active_org_id"); // Ensure cache purges dynamically
           await signOut(auth); // Purge stale firebase session if backend rejects it
        } finally {
           setIsApiResolving(false);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = () => {
     // Intentionally left here for older mocking, but Google Login uses the use-case
  };

  const logout = async () => {
    try {
       await signOut(auth);
       localStorage.removeItem("pressmaster_active_org_id");
    } catch (e) {
       console.error("Sign out error", e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, globalError, login, logout }}>
      {(loading || isApiResolving) ? (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 relative">
          <div className="flex flex-col items-center justify-center animate-pulse drop-shadow-xl">
             <BrandLogo className="w-16 h-16 shadow-[0_4px_14px_0_rgba(24,61,57,0.39)] rounded-[18px]" />
             <div className="mt-6 text-sm font-semibold tracking-widest text-brand-teal uppercase">Loading Workspace...</div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

/**
 * Global Authentication Hook
 * Use this across any component to gain access to auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
