import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, existsSync } from "fs";
import type { Plugin } from "vite";

/**
 * O app é uma SPA: ao recarregar /dashboard o servidor não tem esse arquivo.
 * Além do rewrite do vercel.json, gera dist/404.html igual ao index.html, que a
 * Vercel (e outros hosts estáticos) servem para rotas desconhecidas: o app abre
 * e o React Router mostra a tela certa.
 */
const spaFallback = (): Plugin => ({
  name: "spa-404-fallback",
  apply: "build",
  closeBundle() {
    const dist = path.resolve(__dirname, "dist");
    if (existsSync(path.join(dist, "index.html"))) {
      copyFileSync(path.join(dist, "index.html"), path.join(dist, "404.html"));
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), spaFallback()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
