import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  // If user is not authenticated, bounce them unconditionally back to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the user hasn't set up an organization, they can ONLY visit /onboarding
  if (user.requiresOrganizationSetup && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If the user hasn't made an explicit local tenancy choice, block them until they do
  if (user.requiresOrganizationSelection && location.pathname !== "/select-workspace") {
    return <Navigate to="/select-workspace" replace />;
  }

  // If the user HAS setup an organization but is trying to hit onboarding, punt them to dashboard
  if (!user.requiresOrganizationSetup && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  // If the user HAS picked an organization but is trying to hit the selector, punt them to dashboard
  if (!user.requiresOrganizationSelection && location.pathname === "/select-workspace") {
    return <Navigate to="/dashboard" replace />;
  }

  // User is fully permitted
  return <Outlet />;
}
