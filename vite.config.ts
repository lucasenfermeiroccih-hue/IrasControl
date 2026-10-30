import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, existsSync, writeFileSync } from "fs";
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

/**
 * Identificador desta publicação: o commit na Vercel ou a hora do build.
 * Vai embutido no app (__APP_VERSION__) e em dist/version.json; a aba aberta
 * compara os dois para saber que saiu versão nova (ver AvisoNovaVersao).
 */
const VERSAO = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 12) || `build-${Date.now()}`;

const arquivoVersao = (): Plugin => ({
  name: "version-json",
  apply: "build",
  closeBundle() {
    const dist = path.resolve(__dirname, "dist");
    if (existsSync(dist)) writeFileSync(path.join(dist, "version.json"), JSON.stringify({ versao: VERSAO }));
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
  plugins: [react(), mode === "development" && componentTagger(), spaFallback(), arquivoVersao()].filter(Boolean),
  define: {
    __APP_VERSION__: JSON.stringify(mode === "development" ? "dev" : VERSAO),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
