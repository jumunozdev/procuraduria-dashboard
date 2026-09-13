export const fmtNum = new Intl.NumberFormat("es-CO");
export const fmtCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function fmtHora(d: Date | number | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Profesional universitario." -> "Profesional Universitario" */
export function tituloCaso(s: string): string {
  return s
    .trim()
    .replace(/\.$/, "")
    .toLowerCase()
    .replace(/(^|\s|-)([a-záéíóúñ])/g, (_m, p, c) => p + c.toUpperCase())
    .replace(/\b(De|Del|La|Las|Los|En|Y|O|Para|Con)\b/g, (m) => m.toLowerCase());
}

export function fmtDelta(n: number | null): string {
  if (n === null) return "";
  if (n === 0) return "=";
  return n > 0 ? `+${n}` : `${n}`;
}

/** Número de convocatoria: "05-2026" -> 5, "74 2026" -> 74 */
export function numeroDeCodigo(codigo: string): number {
  return parseInt(codigo, 10) || 0;
}
