/**
 * Historial de inscritos por convocatoria guardado en localStorage para poder
 * mostrar variaciones ("+5 desde la última actualización", "+40 en la última hora").
 */
export interface Snapshot {
  t: number;
  totalInscritos: number;
  totalPreinscritos: number;
  por: Record<string, number>;
}

const KEY = "pgn2026.historial";
const MAX_SNAPSHOTS = 400;
const HORA_MS = 60 * 60 * 1000;

export function cargarHistorial(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

export function guardarSnapshot(hist: Snapshot[], s: Snapshot): Snapshot[] {
  const prev = hist[hist.length - 1];
  // Si nada cambió, sólo actualizamos la marca de tiempo del último snapshot.
  const igual =
    prev &&
    prev.totalInscritos === s.totalInscritos &&
    prev.totalPreinscritos === s.totalPreinscritos &&
    Object.keys(s.por).every((k) => prev.por[k] === s.por[k]);
  const next = igual ? [...hist.slice(0, -1), { ...prev, t: s.t }] : [...hist, s];
  const recortado = next.length > MAX_SNAPSHOTS ? next.slice(next.length - MAX_SNAPSHOTS) : next;
  try {
    localStorage.setItem(KEY, JSON.stringify(recortado));
  } catch {
    /* localStorage lleno o bloqueado: seguimos sólo en memoria */
  }
  return recortado;
}

/** Snapshot anterior distinto al actual (para "Δ última actualización"). */
export function snapshotAnterior(hist: Snapshot[]): Snapshot | null {
  return hist.length >= 2 ? hist[hist.length - 2] : null;
}

/** Snapshot más cercano a hace una hora (o el más antiguo si hay menos de una hora). */
export function snapshotHaceUnaHora(hist: Snapshot[], ahora: number): Snapshot | null {
  if (hist.length < 2) return null;
  const objetivo = ahora - HORA_MS;
  let mejor: Snapshot | null = null;
  for (const s of hist) {
    if (s.t <= objetivo) mejor = s;
    else break;
  }
  return mejor ?? hist[0];
}

export function limpiarHistorial() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
