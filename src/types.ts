export interface SedeApi {
  id: number;
  nombreSede: string;
}

/** Fila tal como la entrega el API público del portal. */
export interface ConvocatoriaApi {
  id: number;
  idConcurso: number;
  codigoConvocatoria: string;
  cargo: string;
  grado: string;
  nivel: string;
  numeroPlazas: number;
  salario: number;
  costoInscripcion: number;
  resolucion: string;
  version: string;
  esActiva: boolean;
  sedes: SedeApi[];
  totalInscritos: number;
}

export interface Ubicacion {
  ciudad: string;
  cargos: number;
}

/** Campos extraídos de los PDF (scripts/scrape_requisitos.py). */
export interface Requisitos {
  codigo: string;
  ok: boolean;
  denominacion: string;
  ubicacionTexto: string;
  ubicaciones: Ubicacion[];
  plantaGlobal: boolean;
  dependencias: string;
  proceso: string;
  estudio: string;
  experiencia: string;
  decreto2247: boolean;
  reservadaDiscapacidad: boolean;
  versionPdf: string;
  fechaFijacion: string;
  pdf: string;
}

export type Tipo = "general" | "discapacidad";

/** Fila fusionada: API en vivo + requisitos del PDF + métricas derivadas. */
export interface Fila {
  codigo: string;
  numero: number;
  grado: string;
  nivel: string;
  denominacion: string;
  tipo: Tipo;
  decreto2247: boolean;
  plantaGlobal: boolean;
  ubicacion: string;
  ubicacionTexto: string;
  ubicaciones: Ubicacion[];
  sedes: string[];
  dependencias: string;
  proceso: string;
  cargos: number;
  inscritos: number;
  /** ceil(inscritos / cargos): a cuántos aspirantes hay que superar por cada cargo. */
  deboGanarleA: number;
  estudio: string;
  experiencia: string;
  sueldo: number;
  costoInscripcion: number;
  resolucion: string;
  version: string;
  activa: boolean;
  pdf: string;
  /** Variación de inscritos respecto a la actualización anterior. */
  deltaUltima: number | null;
  /** Variación de inscritos respecto a ~1 hora atrás. */
  deltaHora: number | null;
}

export interface Estadisticas {
  totalInscritos: number;
  totalPreinscritos: number;
}

export interface ConcursoInfo {
  nombre: string;
  fechaInicialInscripcion: string;
  fechaFinalInscripcion: string;
  fechaFinalPagoBanco: string;
  enInscripciones: boolean;
}
