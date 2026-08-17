import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import BootPage from "../pages/BootPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import TeamPage from "../pages/TeamPage";
import ConnectPage from "../pages/ConnectPage";
import SettingsPage from "../pages/SettingsPage";
import CreatorPage from "../pages/dashboard/CreatorPage";
import MarketingPage from "../pages/dashboard/MarketingPage";
import BusinessPage from "../pages/dashboard/BusinessPage";
import AdminPage from "../pages/dashboard/AdminPage";
import CalendarPage from "../pages/dashboard/CalendarPage";
import PreviewPage from "../pages/dashboard/PreviewPage";
import CampaignsPage from "../pages/dashboard/CampaignsPage";
import AnalyticsPage from "../pages/dashboard/AnalyticsPage";
import CommandPalette from "../components/CommandPalette";

import PostEditorPage from "../pages/dashboard/PostEditorPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      {/* CommandPalette mounted here so it has router context and is available on every page */}
      <CommandPalette />

      <Routes>
        {/* Public */}
        <Route path="/" element={<BootPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* /dashboard — role-aware redirector (bookmark / back button safe) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Shared dashboard pages (accessible to all authenticated roles) */}
        <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
        <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
        <Route path="/dashboard/profile" element={<ProfilePage />} />
        <Route path="/dashboard/team" element={<TeamPage />} />
        <Route path="/dashboard/connect" element={<ConnectPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/calendar" element={<CalendarPage />} />
        <Route path="/dashboard/preview" element={<PreviewPage />} />

        {/* Role-specific dashboards (each protected by RoleGate internally) */}
        <Route path="/dashboard/creator"   element={<CreatorPage />} />
        <Route path="/dashboard/creator/new" element={<PostEditorPage />} />
        <Route path="/dashboard/creator/:id/edit" element={<PostEditorPage />} />
        <Route path="/dashboard/creator/duplicate/:id" element={<PostEditorPage />} />
        <Route path="/dashboard/marketing" element={<MarketingPage />} />
        <Route path="/dashboard/business"  element={<BusinessPage />} />
        <Route path="/dashboard/admin"     element={<AdminPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
