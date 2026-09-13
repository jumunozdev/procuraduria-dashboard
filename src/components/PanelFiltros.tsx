import type { Fila } from "../types";
import { contarFiltrosActivos, FILTROS_INICIALES, type Filtros } from "../lib/filters";
import { fmtNum } from "../lib/format";

interface Props {
  filas: Fila[];
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  totalFiltradas: number;
  onExportar: () => void;
  totalFavoritos: number;
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-pgn-blue focus:ring-2 focus:ring-pgn-blue/20";
const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

function num(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export default function PanelFiltros({ filas, filtros, onChange, totalFiltradas, onExportar, totalFavoritos }: Props) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v });
  const unicos = (fn: (f: Fila) => string) => [...new Set(filas.map(fn).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const niveles = unicos((f) => f.nivel);
  const grados = unicos((f) => f.grado);
  const denominaciones = unicos((f) => f.denominacion);
  const sedes = [...new Set(filas.flatMap((f) => f.sedes))].sort((a, b) => a.localeCompare(b, "es"));
  const activos = contarFiltrosActivos(filtros);

  const toggleNivel = (n: string) => {
    const s = new Set(filtros.niveles);
    if (s.has(n)) s.delete(n);
    else s.add(n);
    set("niveles", s);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-pgn-blue">
          Filtros{" "}
          {activos > 0 && <span className="ml-1 rounded-full bg-pgn-yellow px-2 py-0.5 text-xs text-pgn-blue">{activos} activos</span>}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">
            <b className="text-pgn-blue">{fmtNum.format(totalFiltradas)}</b> de {fmtNum.format(filas.length)} convocatorias
          </span>
          <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50" onClick={onExportar}>
            ⬇ Exportar CSV
          </button>
          <button
            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
            disabled={activos === 0}
            onClick={() => onChange({ ...FILTROS_INICIALES, niveles: new Set() })}
          >
            ✕ Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Buscar (código, denominación, estudio, ubicación, dependencia…)</label>
          <input
            className={inputCls}
            placeholder='Ej: "derecho bogotá", "ingeniería de sistemas", "245"'
            value={filtros.texto}
            onChange={(e) => set("texto", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Denominación</label>
          <select className={inputCls} value={filtros.denominacion} onChange={(e) => set("denominacion", e.target.value)}>
            <option value="">Todas</option>
            {denominaciones.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Código y grado</label>
          <select className={inputCls} value={filtros.grado} onChange={(e) => set("grado", e.target.value)}>
            <option value="">Todos</option>
            {grados.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 xl:col-span-2">
          <label className={labelCls}>Nivel jerárquico</label>
          <div className="flex flex-wrap gap-1.5">
            {niveles.map((n) => {
              const on = filtros.niveles.has(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleNivel(n)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on ? "border-pgn-blue bg-pgn-blue text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls}>Ubicación inicial (sede)</label>
          <select className={inputCls} value={filtros.sede} onChange={(e) => set("sede", e.target.value)}>
            <option value="">Todas</option>
            {sedes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo de convocatoria</label>
          <select className={inputCls} value={filtros.tipo} onChange={(e) => set("tipo", e.target.value as Filtros["tipo"])}>
            <option value="todas">Todas</option>
            <option value="general">Generales</option>
            <option value="discapacidad">Reservadas personas con discapacidad</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Sueldo mínimo</label>
          <input className={inputCls} inputMode="numeric" placeholder="Ej: 5000000" value={filtros.sueldoMin ?? ""} onChange={(e) => set("sueldoMin", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Sueldo máximo</label>
          <input className={inputCls} inputMode="numeric" placeholder="Ej: 12000000" value={filtros.sueldoMax ?? ""} onChange={(e) => set("sueldoMax", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>"Debo ganarle a" máximo</label>
          <input className={inputCls} inputMode="numeric" placeholder="Ej: 100" value={filtros.ganarleMax ?? ""} onChange={(e) => set("ganarleMax", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Cargos mínimos</label>
          <input className={inputCls} inputMode="numeric" placeholder="Ej: 2" value={filtros.cargosMin ?? ""} onChange={(e) => set("cargosMin", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Inscritos mínimo</label>
          <input className={inputCls} inputMode="numeric" placeholder="0" value={filtros.inscritosMin ?? ""} onChange={(e) => set("inscritosMin", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Inscritos máximo</label>
          <input className={inputCls} inputMode="numeric" placeholder="Ej: 200" value={filtros.inscritosMax ?? ""} onChange={(e) => set("inscritosMax", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Decreto 2247 de 2011</label>
          <select className={inputCls} value={filtros.decreto} onChange={(e) => set("decreto", e.target.value as Filtros["decreto"])}>
            <option value="todas">Todas</option>
            <option value="si">Sólo Decreto 2247</option>
            <option value="no">Excluir Decreto 2247</option>
          </select>
        </div>
        <div className="flex flex-col justify-end gap-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-pgn-blue" checked={filtros.soloFavoritos} onChange={(e) => set("soloFavoritos", e.target.checked)} />
            Sólo mis favoritas ★{totalFavoritos > 0 && <span className="text-xs text-slate-500">({totalFavoritos})</span>}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-pgn-blue" checked={filtros.sinExperiencia} onChange={(e) => set("sinExperiencia", e.target.checked)} />
            Sin experiencia requerida
          </label>
        </div>
      </div>
    </section>
  );
}
