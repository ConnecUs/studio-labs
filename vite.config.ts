import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const DEV_PORT = Number(process.env["PORT"]) || 8085;
const BASE_PATH = process.env["VITE_BASE_PATH"] || "/";

export default defineConfig({
  vite: {
    base: BASE_PATH,
    server: {
      port: DEV_PORT,
      strictPort: false,
      proxy: {
        "/api/ollama": {
          target: "http://127.0.0.1:11434",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ollama/, ""),
        },
        "/api/cortex": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cortex/, ""),
        },
        "/api/comfy": {
          target: "http://127.0.0.1:8188",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/comfy/, ""),
        },
        "/api/forge": {
          target: "http://127.0.0.1:7860",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/forge/, ""),
        },
        "/api/myviber": {
          target: "http://127.0.0.1:25088",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/myviber/, ""),
        },
        "/api/studio-labs": {
          target: "https://kushnovels.com",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(process.env["VITE_SPA_MODE"] === "true"
      ? {
          spa: {
            enabled: true,
            prerender: {
              outputPath: "/index.html",
            },
          },
        }
      : {}),
  },
});
