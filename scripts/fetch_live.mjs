// Descarga del API público del portal todo lo que el dashboard necesita y lo
// deja en public/data/live.json. Lo usa GitHub Actions para el despliegue
// estático en GitHub Pages (que no puede hacer de proxy).
import { writeFileSync, mkdirSync } from "node:fs";

const API = "https://meritoconstruyendoexcelencia.com.co/inscripciones/publico-c";
const SIZE = 100;
const out = process.argv[2] || "public/data/live.json";

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  const text = await r.text();
  if (!r.ok || !text.trim().startsWith("{") && !text.trim().startsWith("[")) {
    throw new Error(`Respuesta no JSON (HTTP ${r.status}) de ${url}\ncontent-type=${r.headers.get("content-type")} server=${r.headers.get("server")} cf-ray=${r.headers.get("cf-ray")}\n${text.slice(0, 800)}`);
  }
  return JSON.parse(text);
}

const first = await getJson(`${API}/convocatorias?soloActivas=false&size=${SIZE}&page=0`);
const pages = Math.ceil(first.totalElementos / SIZE);
const rest = await Promise.all(
  Array.from({ length: pages - 1 }, (_, i) => getJson(`${API}/convocatorias?soloActivas=false&size=${SIZE}&page=${i + 1}`))
);
const convocatorias = [first, ...rest].flatMap((p) => p.convocatorias);
const [estadisticas, discapacidad, concurso] = await Promise.all([
  getJson(`${API}/estadisticas-inscripcion?idConcurso=1`),
  getJson(`${API}/convocatorias?soloActivas=false&size=${SIZE}&idCondicion=SOLO_DISCAPACITADOS`),
  getJson(`${API}/concurso`),
]);

const live = {
  generadoEn: new Date().toISOString(),
  convocatorias,
  estadisticas,
  codigosDiscapacidad: discapacidad.convocatorias.map((c) => c.codigoConvocatoria),
  concurso: concurso[0]?.tipoConcurso?.concurso ?? null,
};
mkdirSync(out.replace(/\/[^/]+$/, ""), { recursive: true });
writeFileSync(out, JSON.stringify(live));
console.log(`${convocatorias.length} convocatorias, ${estadisticas.totalInscritos} inscritos -> ${out}`);
