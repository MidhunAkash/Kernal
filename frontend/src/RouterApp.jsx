import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import HomePage from "@/pages/HomePage";
import TargetPage from "@/pages/TargetPage";
import ExecutorPage from "@/pages/ExecutorPage";
import ConsolePage from "@/pages/ConsolePage";
import ClonePage from "@/pages/ClonePage";

export default function RouterApp() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/target" element={<TargetPage />} />
      <Route path="/executor" element={<ExecutorPage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/clone" element={<ClonePage />} />
      <Route path="/ops" element={<App />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
