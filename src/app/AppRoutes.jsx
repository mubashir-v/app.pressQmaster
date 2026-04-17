import { Navigate, Route, Routes } from "react-router-dom";
import WelcomePage from "../presentation/views/welcome/WelcomePage.jsx";
import LoginPage from "../presentation/views/auth/LoginPage.jsx";
import SignupPage from "../presentation/views/auth/SignupPage.jsx";
import DashboardLayout from "../presentation/layouts/DashboardLayout.jsx";
import GenericDashboardView from "../presentation/views/dashboard/GenericDashboardView.jsx";
import ProtectedRoute from "../presentation/components/routing/ProtectedRoute.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Dashboard Routes mapped to Protected Layout */}
      <Route element={<ProtectedRoute />}>
         <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<GenericDashboardView />} />
            <Route path="quotes" element={<GenericDashboardView />} />
            <Route path="finances" element={<GenericDashboardView />} />
            <Route path="stats" element={<GenericDashboardView />} />
            <Route path="docs" element={<GenericDashboardView />} />
            <Route path="calendar" element={<GenericDashboardView />} />
            <Route path="support" element={<GenericDashboardView />} />
         </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
