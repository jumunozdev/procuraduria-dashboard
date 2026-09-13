import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCodigosDiscapacidad, fetchConcurso, fetchConvocatorias, fetchEstadisticas, fetchLive, MODO_ESTATICO } from "../api";
import requisitosJson from "../data/requisitos.json";
import type { ConcursoInfo, ConvocatoriaApi, Estadisticas, Fila, Requisitos } from "../types";
import { numeroDeCodigo, tituloCaso } from "../lib/format";
import {
  cargarHistorial,
  guardarSnapshot,
  snapshotAnterior,
  snapshotHaceUnaHora,
  type Snapshot,
} from "../lib/history";

const REQUISITOS = (requisitosJson as { generadoEn: string; convocatorias: Record<string, Requisitos> }).convocatorias;
export const REQUISITOS_GENERADOS_EN = (requisitosJson as { generadoEn: string }).generadoEn;

function ubicacionResumen(api: ConvocatoriaApi, req?: Requisitos): string {
  if (req?.ubicaciones?.length) {
    // Agrupa por ciudad sumando cargos: "Bogotá (5), Cali (1)"
    // Los PDF mezclan "Bogotá" y "Bogota": agrupamos sin tildes y mostramos la variante con tilde.
    const acc = new Map<string, { nombre: string; n: number }>();
    for (const u of req.ubicaciones) {
      const k = u.ciudad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
      const prev = acc.get(k);
      const nombre = prev && /[áéíóúñ]/i.test(prev.nombre) ? prev.nombre : u.ciudad;
      acc.set(k, { nombre, n: (prev?.n ?? 0) + u.cargos });
    }
    return [...acc.values()].map(({ nombre, n }) => `${nombre} (${n})`).join(", ");
  }
  if (req?.ubicacionTexto) return req.ubicacionTexto.replace(/ \| /g, ", ");
  return api.sedes.map((s) => tituloCaso(s.nombreSede)).join(", ");
}

export function fusionar(
  api: ConvocatoriaApi[],
  discapacidad: Set<string>,
  anterior: Snapshot | null,
  hace1h: Snapshot | null
): Fila[] {
  return api.map((c) => {
    const req = REQUISITOS[c.codigoConvocatoria];
    const inscritos = c.totalInscritos ?? 0;
    const cargos = c.numeroPlazas || 1;
    const delta = (s: Snapshot | null) =>
      s && s.por[c.codigoConvocatoria] !== undefined ? inscritos - s.por[c.codigoConvocatoria] : null;
    return {
      codigo: c.codigoConvocatoria,
      numero: numeroDeCodigo(c.codigoConvocatoria),
      grado: c.grado,
      nivel: tituloCaso(c.nivel),
      denominacion: tituloCaso(req?.denominacion || c.cargo),
      tipo: discapacidad.has(c.codigoConvocatoria) || req?.reservadaDiscapacidad ? "discapacidad" : "general",
      decreto2247: !!req?.decreto2247,
      plantaGlobal: req?.plantaGlobal ?? true,
      ubicacion: ubicacionResumen(c, req),
      ubicacionTexto: req?.ubicacionTexto ?? "",
      ubicaciones: req?.ubicaciones ?? [],
      sedes: c.sedes.map((s) => s.nombreSede),
      dependencias: req?.dependencias ?? "",
      proceso: req?.proceso ?? "",
      cargos: c.numeroPlazas,
      inscritos,
      deboGanarleA: Math.ceil(inscritos / cargos),
      estudio: req?.estudio ?? "",
      experiencia: req?.experiencia ?? "",
      sueldo: c.salario,
      costoInscripcion: c.costoInscripcion,
      resolucion: c.resolucion,
      version: c.version,
      activa: c.esActiva,
      pdf: req?.pdf ?? `https://meritoconstruyendoexcelencia.com.co/statics/convocatorias/${encodeURIComponent(c.codigoConvocatoria)}/view.pdf`,
      deltaUltima: delta(anterior),
      deltaHora: delta(hace1h),
    };
  });
}

export interface EstadoDatos {
  filas: Fila[];
  estadisticas: Estadisticas | null;
  concurso: ConcursoInfo | null;
  cargando: boolean;
  error: string | null;
  actualizadoEn: number | null;
  /** En modo estático: cuándo generó GitHub Actions el snapshot que se está mostrando. */
  datosGeneradosEn: string | null;
  historial: Snapshot[];
  refrescar: () => void;
}

export function useConvocatorias(intervaloMs: number, pausado: boolean): EstadoDatos {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [concurso, setConcurso] = useState<ConcursoInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null);
  const [datosGeneradosEn, setDatosGeneradosEn] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Snapshot[]>(() => cargarHistorial());
  const histRef = useRef(historial);
  const discRef = useRef<Set<string> | null>(null);
  const concursoRef = useRef<ConcursoInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cargar = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setCargando(true);
    try {
      let api: ConvocatoriaApi[];
      let est: Estadisticas;
      if (MODO_ESTATICO) {
        const live = await fetchLive(ac.signal);
        api = live.convocatorias;
        est = live.estadisticas;
        discRef.current = new Set(live.codigosDiscapacidad);
        if (!concursoRef.current) {
          concursoRef.current = live.concurso;
          setConcurso(live.concurso);
        }
        setDatosGeneradosEn(live.generadoEn);
      } else {
        [api, est] = await Promise.all([fetchConvocatorias(ac.signal), fetchEstadisticas(ac.signal)]);
        if (!discRef.current) discRef.current = await fetchCodigosDiscapacidad(ac.signal).catch(() => new Set<string>());
        if (!concursoRef.current) {
          concursoRef.current = await fetchConcurso(ac.signal).catch(() => null);
          setConcurso(concursoRef.current);
        }
      }
      const ahora = Date.now();
      const snap: Snapshot = {
        t: ahora,
        totalInscritos: est.totalInscritos,
        totalPreinscritos: est.totalPreinscritos,
        por: Object.fromEntries(api.map((c) => [c.codigoConvocatoria, c.totalInscritos ?? 0])),
      };
      const nuevoHist = guardarSnapshot(histRef.current, snap);
      histRef.current = nuevoHist;
      setHistorial(nuevoHist);
      setFilas(fusionar(api, discRef.current, snapshotAnterior(nuevoHist), snapshotHaceUnaHora(nuevoHist, ahora)));
      setEstadisticas(est);
      setActualizadoEn(ahora);
      setError(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!ac.signal.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => void cargar(), intervaloMs);
    return () => clearInterval(id);
  }, [cargar, intervaloMs, pausado]);

  return { filas, estadisticas, concurso, cargando, error, actualizadoEn, datosGeneradosEn, historial, refrescar: cargar };
}
