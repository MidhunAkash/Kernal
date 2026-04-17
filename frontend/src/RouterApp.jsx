import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import OnboardPage from "@/pages/OnboardPage";
import Chat from "@/pages/Chat";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import JobsPage from "@/pages/JobsPage";
import PostJobPage from "@/pages/PostJobPage";
import FindExpert from "@/pages/humex/FindExpert";
import Dashboard from "@/pages/humex/Dashboard";
import JobsListing from "@/pages/humex/JobsListing";
import JobDetails from "@/pages/humex/JobDetails";
import MyJobs from "@/pages/humex/MyJobs";
import AcceptedJobs from "@/pages/humex/AcceptedJobs";
import ProfilePage from "@/pages/humex/ProfilePage";
import TargetPage from "@/pages/TargetPage";
import ExecutorPage from "@/pages/ExecutorPage";
import ConsolePage from "@/pages/ConsolePage";
import ClonePage from "@/pages/ClonePage";

export default function RouterApp() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Auth-guarded */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
      <Route path="/onboard" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/post-job" element={<ProtectedRoute><PostJobPage /></ProtectedRoute>} />

      {/* HumEx expert flow (post-login) */}
      <Route path="/expert" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/expert/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/expert/profile/api-keys" element={<ProtectedRoute><FindExpert /></ProtectedRoute>} />
      <Route path="/expert/jobs" element={<ProtectedRoute><JobsListing /></ProtectedRoute>} />
      <Route path="/expert/jobs/:jobId" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
      <Route path="/expert/my-jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/expert/accepted-jobs" element={<ProtectedRoute><AcceptedJobs /></ProtectedRoute>} />

      {/* MCP / Admin routes */}
      <Route path="/target" element={<TargetPage />} />
      <Route path="/executor" element={<ExecutorPage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/clone" element={<ClonePage />} />
      <Route path="/ops" element={<App />} />

      <Route path="*" element={<div data-testid="not-found">Not Found: {window.location.pathname}</div>} />
    </Routes>
  );
}
