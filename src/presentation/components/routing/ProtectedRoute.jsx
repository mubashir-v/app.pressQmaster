import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

export default function ProtectedRoute() {
  const { user } = useAuth();

  // If user is not authenticated, bounce them unconditionally back to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the children routes mapped in AppRoutes!
  return <Outlet />;
}
