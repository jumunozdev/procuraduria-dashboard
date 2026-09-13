import type { Fila } from "../types";

export function exportarCsv(filas: Fila[], nombre = "convocatorias-pgn-2026.csv") {
  const cols: [string, (f: Fila) => string | number][] = [
    ["No", (f) => f.numero],
    ["Codigo", (f) => f.codigo],
    ["Codigo y grado", (f) => f.grado],
    ["Nivel", (f) => f.nivel],
    ["Denominacion", (f) => f.denominacion],
    ["Tipo", (f) => (f.tipo === "discapacidad" ? "Reservada discapacidad" : "General")],
    ["Decreto 2247", (f) => (f.decreto2247 ? "Si" : "No")],
    ["Ubicacion", (f) => f.ubicacion],
    ["Cargos", (f) => f.cargos],
    ["Inscritos", (f) => f.inscritos],
    ["Debo ganarle a", (f) => f.deboGanarleA],
    ["Delta ultima act.", (f) => f.deltaUltima ?? ""],
    ["Delta 1h", (f) => f.deltaHora ?? ""],
    ["Estudio", (f) => f.estudio],
    ["Experiencia", (f) => f.experiencia],
    ["Sueldo", (f) => f.sueldo],
    ["Dependencias", (f) => f.dependencias],
    ["PDF", (f) => f.pdf],
  ];
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [cols.map((c) => c[0]).join(";"), ...filas.map((f) => cols.map((c) => esc(c[1](f))).join(";"))];
  const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}
