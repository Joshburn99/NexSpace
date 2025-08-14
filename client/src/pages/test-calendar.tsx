import React from "react";

export default function TestCalendar() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Test Calendar Page</h1>
      <p>If you can see this, the React app is working!</p>
      <div style={{ marginTop: "20px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h2>Debug Info:</h2>
        <p>Time: {new Date().toLocaleTimeString()}</p>
        <p>Location: {window.location.pathname}</p>
      </div>
    </div>
  );
}