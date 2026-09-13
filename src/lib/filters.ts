import type { Fila } from "../types";

export interface Filtros {
  texto: string;
  niveles: Set<string>;
  tipo: "todas" | "general" | "discapacidad";
  decreto: "todas" | "si" | "no";
  grado: string;
  sede: string;
  denominacion: string;
  sueldoMin: number | null;
  sueldoMax: number | null;
  ganarleMax: number | null;
  inscritosMin: number | null;
  inscritosMax: number | null;
  cargosMin: number | null;
  soloFavoritos: boolean;
  sinExperiencia: boolean;
}

export const FILTROS_INICIALES: Filtros = {
  texto: "",
  niveles: new Set(),
  tipo: "todas",
  decreto: "todas",
  grado: "",
  sede: "",
  denominacion: "",
  sueldoMin: null,
  sueldoMax: null,
  ganarleMax: null,
  inscritosMin: null,
  inscritosMax: null,
  cargosMin: null,
  soloFavoritos: false,
  sinExperiencia: false,
};

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function aplicarFiltros(filas: Fila[], f: Filtros, favoritos: Set<string>): Fila[] {
  const q = normalizar(f.texto.trim());
  const terminos = q ? q.split(/\s+/) : [];
  return filas.filter((r) => {
    if (f.soloFavoritos && !favoritos.has(r.codigo)) return false;
    if (f.niveles.size && !f.niveles.has(r.nivel)) return false;
    if (f.tipo !== "todas" && r.tipo !== f.tipo) return false;
    if (f.decreto === "si" && !r.decreto2247) return false;
    if (f.decreto === "no" && r.decreto2247) return false;
    if (f.grado && r.grado !== f.grado) return false;
    if (f.denominacion && r.denominacion !== f.denominacion) return false;
    if (f.sede && !r.sedes.includes(f.sede)) return false;
    if (f.sueldoMin !== null && r.sueldo < f.sueldoMin) return false;
    if (f.sueldoMax !== null && r.sueldo > f.sueldoMax) return false;
    if (f.ganarleMax !== null && r.deboGanarleA > f.ganarleMax) return false;
    if (f.inscritosMin !== null && r.inscritos < f.inscritosMin) return false;
    if (f.inscritosMax !== null && r.inscritos > f.inscritosMax) return false;
    if (f.cargosMin !== null && r.cargos < f.cargosMin) return false;
    if (f.sinExperiencia && !/no requiere/i.test(r.experiencia)) return false;
    if (terminos.length) {
      const pajar = normalizar(
        [r.codigo, r.grado, r.nivel, r.denominacion, r.ubicacion, r.dependencias, r.estudio, r.experiencia, r.sedes.join(" ")].join(" | ")
      );
      if (!terminos.every((t) => pajar.includes(t))) return false;
    }
    return true;
  });
}

export type ClaveOrden = keyof Pick<
  Fila,
  "numero" | "grado" | "nivel" | "denominacion" | "ubicacion" | "cargos" | "inscritos" | "deboGanarleA" | "sueldo" | "deltaUltima" | "deltaHora"
>;

export function ordenar(filas: Fila[], clave: ClaveOrden, asc: boolean): Fila[] {
  const dir = asc ? 1 : -1;
  return [...filas].sort((a, b) => {
    const va = a[clave];
    const vb = b[clave];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir || a.numero - b.numero;
    return String(va).localeCompare(String(vb), "es") * dir || a.numero - b.numero;
  });
}

export function contarFiltrosActivos(f: Filtros): number {
  let n = 0;
  if (f.texto.trim()) n++;
  if (f.niveles.size) n++;
  if (f.tipo !== "todas") n++;
  if (f.decreto !== "todas") n++;
  if (f.grado) n++;
  if (f.sede) n++;
  if (f.denominacion) n++;
  if (f.sueldoMin !== null || f.sueldoMax !== null) n++;
  if (f.ganarleMax !== null) n++;
  if (f.inscritosMin !== null || f.inscritosMax !== null) n++;
  if (f.cargosMin !== null) n++;
  if (f.soloFavoritos) n++;
  if (f.sinExperiencia) n++;
  return n;
}
