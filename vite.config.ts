import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Remove or comment out Replit plugins for deployment
// import runtimeErrorOverlay from "replit/vite-plugin-runtime-error-modal";
// ...and any code using it...

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // runtimeErrorOverlay(),    // REMOVE or COMMENT OUT
    // ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    //   ? [await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer())]
    //   : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/*.*"],
    },
    // Enable HMR over public Replit URL when present
    hmr: process.env.VITE_DISABLE_HMR === '1'
      ? false
      : (process.env.VITE_HMR_HOST
          ? {
              host: process.env.VITE_HMR_HOST,
              clientPort: 443,
              protocol: 'wss',
            }
          : true),
  },
});
