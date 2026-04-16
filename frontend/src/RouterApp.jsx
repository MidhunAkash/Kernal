import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardPage from "@/pages/OnboardPage";
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
      <Route path="/signup" element={<SignupPage />} />

      {/* Auth-guarded (guard handled inside each page) */}
      <Route path="/onboard" element={<OnboardPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/post-job" element={<PostJobPage />} />

      {/* Legacy / deep-link routes — kept intact */}
      <Route path="/target" element={<TargetPage />} />
      <Route path="/executor" element={<ExecutorPage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/clone" element={<ClonePage />} />
      <Route path="/ops" element={<App />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
