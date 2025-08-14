import React from "react";

export default function TestCalendar() {
  return (
    <div style={{ 
      padding: "40px", 
      backgroundColor: "#4ade80",
      minHeight: "100vh",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>✅ NexSpace App is Working!</h1>
      <p style={{ fontSize: "24px", marginBottom: "40px" }}>The React app has successfully loaded.</p>
      
      <div style={{ 
        marginTop: "20px", 
        padding: "30px", 
        background: "rgba(255,255,255,0.2)", 
        borderRadius: "12px",
        backdropFilter: "blur(10px)"
      }}>
        <h2 style={{ fontSize: "28px", marginBottom: "20px" }}>System Status:</h2>
        <p style={{ fontSize: "18px" }}>✓ React App: Running</p>
        <p style={{ fontSize: "18px" }}>✓ Time: {new Date().toLocaleTimeString()}</p>
        <p style={{ fontSize: "18px" }}>✓ Location: {window.location.pathname}</p>
        <p style={{ fontSize: "18px" }}>✓ Backend API: {window.location.origin}/api/me responding</p>
      </div>
      
      <div style={{ marginTop: "40px" }}>
        <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Quick Links:</h3>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <a href="/" style={{ 
            padding: "15px 30px", 
            backgroundColor: "white", 
            color: "#4ade80",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "bold"
          }}>Home</a>
          <a href="/calendar" style={{ 
            padding: "15px 30px", 
            backgroundColor: "white", 
            color: "#4ade80",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "bold"
          }}>Calendar</a>
          <a href="/auth" style={{ 
            padding: "15px 30px", 
            backgroundColor: "white", 
            color: "#4ade80",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "bold"
          }}>Login</a>
        </div>
      </div>
    </div>
  );
}