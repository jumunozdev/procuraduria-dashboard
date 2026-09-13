import type { ConcursoInfo, ConvocatoriaApi, Estadisticas } from "./types";

// En dev, Vite reescribe /api -> /inscripciones/publico-c del portal.
// En producción lo hace server/index.js.
// En GitHub Pages (VITE_STATIC_DATA=1) no hay proxy: se lee un live.json que
// scripts/publicar_datos.sh regenera cada ~5 minutos en la rama `datos`
// (VITE_LIVE_URL), con data/live.json local como respaldo.
const BASE = "/api";
const PAGE_SIZE = 100;
export const MODO_ESTATICO = import.meta.env.VITE_STATIC_DATA === "1";
const LIVE_URLS = [import.meta.env.VITE_LIVE_URL as string | undefined, `${import.meta.env.BASE_URL}data/live.json`].filter(
  (u): u is string => !!u
);

export interface LiveJson {
  generadoEn: string;
  convocatorias: ConvocatoriaApi[];
  estadisticas: Estadisticas;
  codigosDiscapacidad: string[];
  concurso: ConcursoInfo | null;
}

/** Snapshot estático publicado por scripts/publicar_datos.sh (sin caché del navegador). */
export async function fetchLive(signal?: AbortSignal): Promise<LiveJson> {
  let ultimoError: unknown = null;
  for (const url of LIVE_URLS) {
    try {
      return await getJson<LiveJson>(`${url}?t=${Date.now()}`, signal);
    } catch (e) {
      ultimoError = e;
      if ((e as Error).name === "AbortError") throw e;
    }
  }
  throw ultimoError ?? new Error("No hay fuente de datos disponible");
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return r.json() as Promise<T>;
}

interface PaginaConvocatorias {
  convocatorias: ConvocatoriaApi[];
  totalElementos: number;
  numeroPagina: number;
  longitudPagina: number;
}

/** Trae TODAS las convocatorias (generales + reservadas) paginando de a 100. */
export async function fetchConvocatorias(signal?: AbortSignal): Promise<ConvocatoriaApi[]> {
  const first = await getJson<PaginaConvocatorias>(
    `${BASE}/convocatorias?soloActivas=false&size=${PAGE_SIZE}&page=0`,
    signal
  );
  const pages = Math.ceil(first.totalElementos / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      getJson<PaginaConvocatorias>(
        `${BASE}/convocatorias?soloActivas=false&size=${PAGE_SIZE}&page=${i + 1}`,
        signal
      )
    )
  );
  return [first, ...rest].flatMap((p) => p.convocatorias);
}

/** Códigos de las convocatorias reservadas a personas con discapacidad. */
export async function fetchCodigosDiscapacidad(signal?: AbortSignal): Promise<Set<string>> {
  const d = await getJson<PaginaConvocatorias>(
    `${BASE}/convocatorias?soloActivas=false&size=${PAGE_SIZE}&idCondicion=SOLO_DISCAPACITADOS`,
    signal
  );
  return new Set(d.convocatorias.map((c) => c.codigoConvocatoria));
}

export function fetchEstadisticas(signal?: AbortSignal): Promise<Estadisticas> {
  return getJson<Estadisticas>(`${BASE}/estadisticas-inscripcion?idConcurso=1`, signal);
}

interface NivelConcursoApi {
  id: number;
  nombreNivel: string;
  tipoConcurso: { concurso: ConcursoInfo; estado: string };
}

export async function fetchConcurso(signal?: AbortSignal): Promise<ConcursoInfo | null> {
  const d = await getJson<NivelConcursoApi[]>(`${BASE}/concurso`, signal);
  return d[0]?.tipoConcurso.concurso ?? null;
}
