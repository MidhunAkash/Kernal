import React from "react";

export default function RoleBadge({ role, light = false, testId }) {
  if (!role) return null;
  const isClient1 = role === "CLIENT_1";
  const label = isClient1 ? "CLIENT_1 · Poster" : "CLIENT_2 · Solver";
  const cls = `k-role-badge ${isClient1 ? "client1" : "client2"} ${light ? "light" : ""}`.trim();
  return <span className={cls} data-testid={testId || `role-badge-${isClient1 ? "poster" : "solver"}`}>{label}</span>;
}
