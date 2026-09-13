import type { Fila } from "../types";
import { fmtNum } from "../lib/format";

export default function ResumenNiveles({ filas }: { filas: Fila[] }) {
  const grupos = new Map<string, { cargos: number; inscritos: number; convocatorias: number }>();
  for (const f of filas) {
    const g = grupos.get(f.nivel) ?? { cargos: 0, inscritos: 0, convocatorias: 0 };
    g.cargos += f.cargos;
    g.inscritos += f.inscritos;
    g.convocatorias += 1;
    grupos.set(f.nivel, g);
  }
  const lista = [...grupos].sort((a, b) => b[1].inscritos - a[1].inscritos);
  const maxIns = Math.max(1, ...lista.map(([, g]) => g.inscritos));
  const totCargos = filas.reduce((s, f) => s + f.cargos, 0);
  const totIns = filas.reduce((s, f) => s + f.inscritos, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-pgn-blue">Resumen por nivel (según filtros)</h2>
        <div className="text-sm text-slate-600">
          <b>{fmtNum.format(totCargos)}</b> cargos · <b>{fmtNum.format(totIns)}</b> inscritos ·{" "}
          <b>{totCargos ? (totIns / totCargos).toFixed(1) : "0"}</b> inscritos por cargo
        </div>
      </div>
      <div className="space-y-1.5">
        {lista.map(([nivel, g]) => (
          <div key={nivel} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate font-medium">{nivel}</span>
            <div className="h-5 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-pgn-blue/80" style={{ width: `${(g.inscritos / maxIns) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap font-mono text-xs text-slate-600">
              {fmtNum.format(g.inscritos)} insc. / {fmtNum.format(g.cargos)} cargos · {g.convocatorias} conv. ·{" "}
              <b className="text-pgn-blue">{g.cargos ? Math.ceil(g.inscritos / g.cargos) : 0}</b> por cargo
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
