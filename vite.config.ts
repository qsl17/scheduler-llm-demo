import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8010,
  },
  resolve: {
    alias: {
      "@bryntum/scheduler": "@bryntum/scheduler-trial",
    },
  },
});
