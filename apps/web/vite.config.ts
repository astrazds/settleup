import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    changeOrigin: true,
    target: "http://127.0.0.1:8787",
  },
};

export default defineConfig({
  plugins: [reactRouter()],
  preview: {
    proxy: apiProxy,
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
});
