import { Navigate, Route, Routes } from "react-router-dom";
import WelcomePage from "../presentation/views/welcome/WelcomePage.jsx";
import LoginPage from "../presentation/views/auth/LoginPage.jsx";
import SignupPage from "../presentation/views/auth/SignupPage.jsx";
import OnboardingPage from "../presentation/views/auth/OnboardingPage.jsx";
import DashboardLayout from "../presentation/layouts/DashboardLayout.jsx";
import GenericDashboardView from "../presentation/views/dashboard/GenericDashboardView.jsx";
import CreateOrganizationPage from "../presentation/views/organization/CreateOrganizationPage.jsx";
import SelectWorkspacePage from "../presentation/views/organization/SelectWorkspacePage.jsx";
import OrganizationSettingsPage from "../presentation/views/organization/OrganizationSettingsPage.jsx";
import UsersManagementPage from "../presentation/views/organization/UsersManagementPage.jsx";
import StocksManagementPage from "../presentation/views/inventory/StocksManagementPage.jsx";
import PrintersManagementPage from "../presentation/views/inventory/PrintersManagementPage.jsx";
import CustomersManagementPage from "../presentation/views/inventory/CustomersManagementPage.jsx";
import QuotationsManagementPage from "../presentation/views/quotes/QuotationsManagementPage.jsx";
import QuotationEditorPage from "../presentation/views/quotes/QuotationEditorPage.jsx";
import SizeChartsManagementPage from "../presentation/views/inventory/SizeChartsManagementPage.jsx";

import ProtectedRoute from "../presentation/components/routing/ProtectedRoute.jsx";





export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Protected Routes mapped inside Authentication boundary */}
      <Route element={<ProtectedRoute />}>
         <Route path="/onboarding" element={<OnboardingPage />} />
         <Route path="/select-workspace" element={<SelectWorkspacePage />} />
         <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<GenericDashboardView />} />
            <Route path="customers" element={<CustomersManagementPage />} />
            <Route path="quotes" element={<QuotationsManagementPage />} />
            <Route path="quotes/new" element={<QuotationEditorPage />} />
            <Route path="quotes/:id" element={<QuotationEditorPage />} />
            <Route path="invoices" element={<GenericDashboardView />} />


            <Route path="jobs" element={<GenericDashboardView />} />
            <Route path="users" element={<UsersManagementPage />} />
            
            {/* Inventory Routes */}
            <Route path="printers" element={<PrintersManagementPage />} />

            <Route path="papers" element={<StocksManagementPage />} />
            <Route path="plates" element={<GenericDashboardView />} />
            <Route path="inks" element={<GenericDashboardView />} />
            <Route path="size-charts" element={<SizeChartsManagementPage />} />
            <Route path="finishing" element={<GenericDashboardView />} />
            
            <Route path="support" element={<GenericDashboardView />} />
            <Route path="organizations/new" element={<CreateOrganizationPage />} />
            <Route path="organization-settings" element={<OrganizationSettingsPage />} />
         </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
