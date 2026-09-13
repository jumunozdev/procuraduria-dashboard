import { Fragment, useState } from "react";
import type { Fila } from "../types";
import type { ClaveOrden } from "../lib/filters";
import { fmtCop, fmtDelta, fmtNum } from "../lib/format";

interface Props {
  filas: Fila[];
  orden: ClaveOrden;
  asc: boolean;
  onOrden: (k: ClaveOrden) => void;
  favoritos: Set<string>;
  onFavorito: (codigo: string) => void;
}

const COLS: { k: ClaveOrden | null; t: string; cls?: string; title?: string }[] = [
  { k: null, t: "★", cls: "w-8 text-center" },
  { k: "numero", t: "No", cls: "text-right" },
  { k: "grado", t: "Cód./Grado" },
  { k: "nivel", t: "Nivel" },
  { k: "denominacion", t: "Denominación" },
  { k: null, t: "Tipo" },
  { k: "ubicacion", t: "Ubicación inicial" },
  { k: "cargos", t: "Cargos", cls: "text-right" },
  { k: "inscritos", t: "Inscritos", cls: "text-right" },
  { k: "deltaUltima", t: "Δ últ.", cls: "text-right", title: "Variación de inscritos desde la actualización anterior" },
  { k: "deltaHora", t: "Δ 1h", cls: "text-right", title: "Variación de inscritos en la última hora (aprox.)" },
  { k: "deboGanarleA", t: "Debo ganarle a", cls: "text-right", title: "Inscritos ÷ cargos (redondeado hacia arriba)" },
  { k: null, t: "Estudio" },
  { k: null, t: "Experiencia" },
  { k: "sueldo", t: "Sueldo 2025", cls: "text-right" },
  { k: null, t: "PDF", cls: "text-center" },
];

function Delta({ n }: { n: number | null }) {
  if (n === null) return <span className="text-slate-300">—</span>;
  if (n === 0) return <span className="text-slate-400">=</span>;
  return <span className={`font-semibold ${n > 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtDelta(n)}</span>;
}

function colorGanarle(n: number): string {
  if (n <= 30) return "bg-emerald-100 text-emerald-800";
  if (n <= 80) return "bg-lime-100 text-lime-800";
  if (n <= 150) return "bg-amber-100 text-amber-800";
  if (n <= 300) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export default function Tabla({ filas, orden, asc, onOrden, favoritos, onFavorito }: Props) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-pgn-yellow text-[11px] uppercase tracking-wide text-pgn-blue">
          <tr>
            {COLS.map((c) => (
              <th
                key={c.t}
                title={c.title}
                onClick={c.k ? () => onOrden(c.k!) : undefined}
                className={`whitespace-nowrap px-2 py-2 text-left font-bold ${c.cls ?? ""} ${c.k ? "cursor-pointer select-none hover:bg-yellow-300" : ""}`}
              >
                {c.t}
                {c.k && orden === c.k && <span className="ml-1">{asc ? "▲" : "▼"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-4 py-10 text-center text-slate-500">
                Ninguna convocatoria coincide con los filtros.
              </td>
            </tr>
          )}
          {filas.map((f, i) => {
            const fav = favoritos.has(f.codigo);
            const open = abierta === f.codigo;
            return (
              <Fragment key={f.codigo}>
                <tr
                  onClick={() => setAbierta(open ? null : f.codigo)}
                  className={`cursor-pointer border-t border-slate-100 align-top hover:bg-sky-50 ${i % 2 ? "bg-slate-50/60" : ""} ${open ? "bg-sky-50" : ""} ${fav ? "bg-yellow-50/70" : ""} ${!f.activa ? "opacity-50" : ""}`}
                >
                  <td className="px-2 py-1.5 text-center" onClick={(e) => { e.stopPropagation(); onFavorito(f.codigo); }}>
                    <span className={`text-lg leading-none ${fav ? "text-pgn-yellow drop-shadow" : "text-slate-300 hover:text-slate-500"}`}>★</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-pgn-blue">{f.numero}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono">{f.grado}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{f.nivel}</td>
                  <td className="min-w-40 px-2 py-1.5">{f.denominacion}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {f.tipo === "discapacidad" ? (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">Discapacidad</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">General</span>
                    )}
                    {f.decreto2247 && <span className="ml-1 rounded bg-pink-100 px-1.5 py-0.5 text-xs text-pink-800">D.2247</span>}
                  </td>
                  <td className="max-w-56 truncate px-2 py-1.5" title={f.ubicacion}>{f.ubicacion || "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{f.cargos}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-pgn-blue">{fmtNum.format(f.inscritos)}</td>
                  <td className="px-2 py-1.5 text-right font-mono"><Delta n={f.deltaUltima} /></td>
                  <td className="px-2 py-1.5 text-right font-mono"><Delta n={f.deltaHora} /></td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`inline-block min-w-12 rounded px-1.5 py-0.5 text-right font-mono font-bold ${colorGanarle(f.deboGanarleA)}`}>{fmtNum.format(f.deboGanarleA)}</span>
                  </td>
                  <td className="max-w-64 truncate px-2 py-1.5 text-xs text-slate-700" title={f.estudio}>{f.estudio || "—"}</td>
                  <td className="max-w-48 truncate px-2 py-1.5 text-xs text-slate-700" title={f.experiencia}>{f.experiencia || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono">{fmtCop.format(f.sueldo)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <a href={f.pdf} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-pgn-blue underline hover:text-pgn-red">
                      Ver
                    </a>
                  </td>
                </tr>
                {open && (
                  <tr className="bg-sky-50/70">
                    <td colSpan={COLS.length} className="px-4 py-3">
                      <Detalle f={f} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Detalle({ f }: { f: Fila }) {
  const Campo = ({ t, v }: { t: string; v: string }) =>
    v ? (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t}</div>
        <div className="text-sm text-slate-800">{v}</div>
      </div>
    ) : null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Campo t="Convocatoria" v={`${f.codigo} · ${f.denominacion} · ${f.grado} · Resolución ${f.resolucion} · Versión ${f.version}`} />
      <Campo t="Ubicación(es) inicial(es)" v={f.ubicacionTexto || f.ubicacion} />
      <Campo t="Sedes registradas en el portal" v={f.sedes.join(", ")} />
      <Campo t="Dependencia(s)" v={f.dependencias} />
      <Campo t="Proceso" v={f.proceso} />
      <Campo t="Costo de inscripción" v={fmtCop.format(f.costoInscripcion)} />
      <div className="md:col-span-2 xl:col-span-3">
        <Campo t="Estudio" v={f.estudio} />
      </div>
      <div className="md:col-span-2 xl:col-span-3">
        <Campo t="Experiencia" v={f.experiencia} />
      </div>
      <Campo t="Inscritos por cargo" v={`${fmtNum.format(f.inscritos)} inscritos / ${f.cargos} cargos = ${(f.inscritos / Math.max(f.cargos, 1)).toFixed(1)}`} />
      {f.plantaGlobal && <Campo t="Nota" v="Cargo de planta global: puede ser reubicado a nivel nacional según necesidad del servicio." />}
    </div>
  );
}
