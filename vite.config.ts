import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// El portal no envía cabeceras CORS, así que en desarrollo Vite hace de proxy
// y en producción lo hace server/index.js.
export default defineConfig({
  // En GitHub Pages la app vive en /<repo>/ (ver .github/workflows/deploy.yml).
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://meritoconstruyendoexcelencia.com.co",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "/inscripciones/publico-c"),
      },
    },
  },
});
