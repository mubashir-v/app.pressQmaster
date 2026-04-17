import React, { createContext, useContext, useState } from "react";

// Create the Context
const AuthContext = createContext(null);

// Create the Provider component
export const AuthProvider = ({ children }) => {
  // We initialize as null to represent "logged out" by default
  const [user, setUser] = useState(null);

  const login = (role = "admin") => {
    // Mock login simulating a backend response
    setUser({
      name: "Admin User",
      email: "admin@pressmaster.io",
      role: role,
      scopes: [
        "view_dashboard", 
        "manage_quotes", 
        "view_production", 
        "manage_billing",
        "view_statistics",
        "manage_documents",
        "manage_calendar"
      ],
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
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
