import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite = the tool that runs and builds our React app
export default defineConfig({
  plugins: [react()],
});
