import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, Vite serves on :5173 and proxies /api to the FastAPI
// backend on :8000. In production, FastAPI serves the built dist/ folder.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
