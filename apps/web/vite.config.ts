import { reactRouter } from "@react-router/dev/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, normalizePath } from "vite";

const contractSource = normalizePath(fileURLToPath(new URL("../../packages/contracts/src/", import.meta.url)));

const apiProxy = {
  "/api": {
    changeOrigin: true,
    target: "http://127.0.0.1:8787",
  },
};

export default defineConfig({
  plugins: [
    reactRouter(),
    {
      name: "reload-contract-consumers",
      apply: "serve",
      handleHotUpdate({ file, server }) {
        // An open route can retain its previous clientAction after a component refresh.
        if (normalizePath(file).startsWith(contractSource)) {
          server.ws.send({ type: "full-reload" });
        }
      },
    },
  ],
  optimizeDeps: { include: ["@settleup/contracts > zod"] },
  preview: {
    proxy: apiProxy,
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
});
