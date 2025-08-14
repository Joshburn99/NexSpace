import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx loading...");

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("Root element found, rendering app...");
  
  // Add test content directly to DOM first
  rootElement.innerHTML = '<h1 style="color: red;">Testing DOM...</h1>';
  
  // Then try to render React
  try {
    createRoot(rootElement).render(<App />);
    console.log("React app rendered successfully");
  } catch (error) {
    console.error("Error rendering React app:", error);
    rootElement.innerHTML = '<h1 style="color: red;">React Error: ' + error + '</h1>';
  }
} else {
  console.error("Root element not found!");
}
