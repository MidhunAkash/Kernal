import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardPage from "@/pages/OnboardPage";
import Chat from "@/pages/Chat";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import JobsPage from "@/pages/JobsPage";
import PostJobPage from "@/pages/PostJobPage";
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
      <Route path="/register" element={<SignupPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Auth-guarded */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
      <Route path="/onboard" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/post-job" element={<ProtectedRoute><PostJobPage /></ProtectedRoute>} />

      {/* MCP / Admin routes */}
      <Route path="/target" element={<TargetPage />} />
      <Route path="/executor" element={<ExecutorPage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/clone" element={<ClonePage />} />
      <Route path="/ops" element={<App />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
