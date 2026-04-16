import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import ConsolePage from "@/pages/ConsolePage";

export default function RouterApp() {
  return (
    <Routes>
      <Route path="/" element={<ConsolePage />} />
      <Route path="/console" element={<ConsolePage />} />
      <Route path="/ops" element={<App />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
