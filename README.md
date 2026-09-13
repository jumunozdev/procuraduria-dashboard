# Dashboard · Concurso Abierto de Méritos 2026 — Procuraduría General de la Nación

Dashboard interactivo (React + Vite + TypeScript + Tailwind CSS 4) que se conecta en vivo al
portal oficial **Mérito Construyendo Excelencia** (`meritoconstruyendoexcelencia.com.co`) y muestra
todas las convocatorias (generales y reservadas a personas con discapacidad) con:

- Inscritos en tiempo real por convocatoria (se refresca cada N segundos, configurable).
- Totales de inscritos / preinscritos del concurso y cuenta regresiva al cierre de inscripciones.
- Variación de inscritos (Δ) frente a la actualización anterior y frente a ~1 hora atrás
  (historial guardado en `localStorage`).
- **Debo ganarle a** = ⌈ inscritos ÷ cargos ⌉ (aspirantes por cada vacante).
- Denominación, ubicación inicial, dependencia, estudio y experiencia extraídos de los PDF oficiales.
- Filtros por texto, nivel, denominación, código y grado, sede, tipo, Decreto 2247, sueldo, inscritos,
  cargos, "debo ganarle a", sin experiencia y favoritas. Orden por cualquier columna. Exportación CSV.

## Fuentes de datos

| Dato | Origen | Frecuencia |
|---|---|---|
| Inscritos, cargos, salario, sedes, resolución | `GET /inscripciones/publico-c/convocatorias` (paginado, 100 por página) | cada refresco |
| Totales inscritos / preinscritos | `GET /inscripciones/publico-c/estadisticas-inscripcion?idConcurso=1` | cada refresco |
| Fechas del concurso | `GET /inscripciones/publico-c/concurso` | al iniciar |
| Reservadas discapacidad | `…/convocatorias?idCondicion=SOLO_DISCAPACITADOS` | al iniciar |
| Denominación, ubicación, estudio, experiencia | PDF `/statics/convocatorias/<código>/view.pdf` → `src/data/requisitos.json` | `npm run scrape` |

El portal no envía cabeceras CORS, por eso las peticiones pasan por un proxy: Vite en desarrollo
(`vite.config.ts`) y `server/index.js` (Express) en producción.

## GitHub Pages (URL pública)

La página vive en `https://jumunozdev.github.io/procuraduria-dashboard/` y se despliega con
`.github/workflows/deploy.yml` en cada push a `main`.

Como Pages es estático y el CDN del portal **no entrega el API a IPs extranjeras** (los runners de
GitHub reciben el `index.html` del portal en vez del JSON), los datos en vivo los captura un equipo
en Colombia con `scripts/publicar_datos.sh`, que ejecuta `scripts/fetch_live.mjs` y hace push de un
único commit a la rama `datos`. La página lee
`https://raw.githubusercontent.com/jumunozdev/procuraduria-dashboard/datos/live.json` en cada
refresco y muestra la hora de captura.

Automatizar cada 5 minutos en macOS (launchd):

```bash
cp scripts/com.jumunozdev.procuraduria-datos.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.jumunozdev.procuraduria-datos.plist
```

Detenerlo: `launchctl unload ~/Library/LaunchAgents/com.jumunozdev.procuraduria-datos.plist`.
Registro de ejecuciones: `.cache/publicar_datos.log`.

## Uso

```bash
npm install
npm run dev          # http://localhost:5173
```

Producción:

```bash
npm run build
npm start            # sirve dist/ + proxy en http://localhost:3000
```

Regenerar los requisitos desde los PDF (si la Procuraduría publica nuevas versiones):

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf
.venv/bin/python scripts/scrape_requisitos.py
```
