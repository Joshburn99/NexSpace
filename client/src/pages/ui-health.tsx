import React from "react";

export default function UIHealthPage() {
  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>UI is alive ✅</h1>
      <p>This is a no-fetch health check page.</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  );
}