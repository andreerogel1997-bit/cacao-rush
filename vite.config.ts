import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Juego estático: sin servidor, sin SSR, sin base de datos. Lo que sale de
 * `vite build` es HTML, JS, CSS y assets — servible tal cual desde GitHub Pages.
 *
 * `base` llega por entorno porque en Pages el juego cuelga de /<repo>/ y no de
 * la raíz del dominio. En desarrollo se queda en "/".
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [viteReact(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 8123,
  },
  preview: {
    host: "127.0.0.1",
    port: 8124,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
  },
});
