import { useEffect, useState } from "react";
import type { ConcursoInfo, Estadisticas } from "../types";
import type { Snapshot } from "../lib/history";
import { fmtFechaHora, fmtHora, fmtNum } from "../lib/format";
import { MODO_ESTATICO } from "../api";

interface Props {
  estadisticas: Estadisticas | null;
  concurso: ConcursoInfo | null;
  historial: Snapshot[];
  actualizadoEn: number | null;
  datosGeneradosEn: string | null;
  cargando: boolean;
  error: string | null;
  intervaloMs: number;
  pausado: boolean;
  onIntervalo: (ms: number) => void;
  onPausar: (p: boolean) => void;
  onRefrescar: () => void;
}

function CuentaRegresiva({ hasta }: { hasta: string }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(hasta).getTime() - ahora;
  if (ms <= 0) return <span className="font-mono text-pgn-red">Inscripciones cerradas</span>;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono tabular-nums text-2xl font-bold text-white">
      {d}d {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function deltaTotal(hist: Snapshot[], campo: "totalInscritos" | "totalPreinscritos"): number | null {
  if (hist.length < 2) return null;
  return hist[hist.length - 1][campo] - hist[hist.length - 2][campo];
}

export default function Encabezado(p: Props) {
  const dIns = deltaTotal(p.historial, "totalInscritos");
  const dPre = deltaTotal(p.historial, "totalPreinscritos");
  return (
    <header className="bg-pgn-blue text-white shadow-lg">
      <div className="mx-auto max-w-[1800px] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">
              Concurso Abierto de Méritos 2026 · <span className="text-pgn-yellow">Procuraduría General de la Nación</span>
            </h1>
            <p className="text-sm text-slate-300">
              Datos en vivo del portal Mérito Construyendo Excelencia
              {p.concurso && (
                <>
                  {" "}· Inscripciones {fmtFechaHora(p.concurso.fechaInicialInscripcion)} → {fmtFechaHora(p.concurso.fechaFinalInscripcion)}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Tarjeta titulo="Inscritos totales" valor={p.estadisticas ? fmtNum.format(p.estadisticas.totalInscritos) : "…"} delta={dIns} />
            <Tarjeta titulo="Preinscritos" valor={p.estadisticas ? fmtNum.format(p.estadisticas.totalPreinscritos) : "…"} delta={dPre} />
            {p.concurso && (
              <div className="rounded-lg bg-white/10 px-4 py-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-300">Cierre de inscripciones</div>
                <CuentaRegresiva hasta={p.concurso.fechaFinalInscripcion} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.error ? "bg-pgn-red" : p.cargando ? "animate-pulse bg-pgn-yellow" : "bg-emerald-400"}`} />
            {p.error ? (
              <span className="text-red-200">Error: {p.error}</span>
            ) : (
              <span className="text-slate-200">
                {p.cargando ? "Actualizando…" : `Última actualización: ${fmtHora(p.actualizadoEn)}`}
                {MODO_ESTATICO && p.datosGeneradosEn && (
                  <span className="text-slate-400" title="En GitHub Pages los datos se publican cada ~5 minutos desde un equipo en Colombia (el portal no responde a servidores extranjeros)">
                    {" "}· datos del portal capturados a las {fmtHora(new Date(p.datosGeneradosEn))}
                  </span>
                )}
              </span>
            )}
          </span>
          <label className="flex items-center gap-2 text-slate-200">
            Cada
            <select
              className="rounded bg-white/10 px-2 py-1 text-white outline-none"
              value={p.intervaloMs}
              onChange={(e) => p.onIntervalo(Number(e.target.value))}
            >
              <option className="text-slate-900" value={15000}>15 s</option>
              <option className="text-slate-900" value={30000}>30 s</option>
              <option className="text-slate-900" value={60000}>1 min</option>
              <option className="text-slate-900" value={120000}>2 min</option>
              <option className="text-slate-900" value={300000}>5 min</option>
            </select>
          </label>
          <button
            className="rounded bg-white/10 px-3 py-1 text-white hover:bg-white/20"
            onClick={() => p.onPausar(!p.pausado)}
          >
            {p.pausado ? "▶ Reanudar" : "⏸ Pausar"}
          </button>
          <button
            className="rounded bg-pgn-yellow px-3 py-1 font-semibold text-pgn-blue hover:brightness-110 disabled:opacity-50"
            onClick={p.onRefrescar}
            disabled={p.cargando}
          >
            ↻ Actualizar ahora
          </button>
        </div>
      </div>
    </header>
  );
}

function Tarjeta({ titulo, valor, delta }: { titulo: string; valor: string; delta: number | null }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-300">{titulo}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold tabular-nums">{valor}</span>
        {delta !== null && delta !== 0 && (
          <span className={`text-sm font-semibold ${delta > 0 ? "text-emerald-300" : "text-red-300"}`}>
            {delta > 0 ? "+" : ""}
            {fmtNum.format(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
