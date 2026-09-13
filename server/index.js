// Servidor de producción: sirve el build de Vite y hace de proxy al API público
// del portal (que no permite CORS). Cachea cada respuesta 15 s para no saturarlo.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORTAL = "https://meritoconstruyendoexcelencia.com.co/inscripciones/publico-c";
const PORT = process.env.PORT || 3000;
const CACHE_MS = Number(process.env.CACHE_MS || 15000);

const app = express();
const cache = new Map();

app.get("/api/{*rest}", async (req, res) => {
  const target = PORTAL + req.originalUrl.replace(/^\/api/, "");
  const hit = cache.get(target);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return res.type("json").send(hit.body);
  }
  try {
    const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
    const body = await r.text();
    if (r.ok) cache.set(target, { at: Date.now(), body });
    res.status(r.status).type("json").send(body);
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(dist));
app.get("/{*rest}", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => console.log(`Dashboard en http://localhost:${PORT}`));
