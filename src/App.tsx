import { useEffect, useMemo, useState } from "react";
import Encabezado from "./components/Encabezado";
import PanelFiltros from "./components/PanelFiltros";
import ResumenNiveles from "./components/ResumenNiveles";
import Tabla from "./components/Tabla";
import { REQUISITOS_GENERADOS_EN, useConvocatorias } from "./hooks/useConvocatorias";
import { aplicarFiltros, FILTROS_INICIALES, ordenar, type ClaveOrden, type Filtros } from "./lib/filters";
import { cargarFavoritos, guardarFavoritos } from "./lib/favoritos";
import { exportarCsv } from "./lib/csv";
import { limpiarHistorial } from "./lib/history";

const INTERVALO_KEY = "pgn2026.intervalo";

export default function App() {
  const [intervaloMs, setIntervaloMs] = useState(() => Number(localStorage.getItem(INTERVALO_KEY)) || 60000);
  const [pausado, setPausado] = useState(false);
  const datos = useConvocatorias(intervaloMs, pausado);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [orden, setOrden] = useState<ClaveOrden>("deboGanarleA");
  const [asc, setAsc] = useState(true);
  const [favoritos, setFavoritos] = useState<Set<string>>(() => cargarFavoritos());

  useEffect(() => localStorage.setItem(INTERVALO_KEY, String(intervaloMs)), [intervaloMs]);

  const filtradas = useMemo(() => aplicarFiltros(datos.filas, filtros, favoritos), [datos.filas, filtros, favoritos]);
  const ordenadas = useMemo(() => {
    const base = ordenar(filtradas, orden, asc);
    if (favoritos.size === 0) return base;
    // Las favoritas (★) siempre van al inicio, conservando el orden elegido dentro de cada grupo.
    return [...base.filter((f) => favoritos.has(f.codigo)), ...base.filter((f) => !favoritos.has(f.codigo))];
  }, [filtradas, orden, asc, favoritos]);

  const cambiarOrden = (k: ClaveOrden) => {
    if (k === orden) setAsc(!asc);
    else {
      setOrden(k);
      setAsc(!["inscritos", "deltaUltima", "deltaHora", "sueldo", "cargos"].includes(k));
    }
  };

  const toggleFavorito = (codigo: string) => {
    const s = new Set(favoritos);
    if (s.has(codigo)) s.delete(codigo);
    else s.add(codigo);
    setFavoritos(s);
    guardarFavoritos(s);
  };

  return (
    <div className="min-h-screen">
      <Encabezado
        estadisticas={datos.estadisticas}
        concurso={datos.concurso}
        historial={datos.historial}
        actualizadoEn={datos.actualizadoEn}
        datosGeneradosEn={datos.datosGeneradosEn}
        cargando={datos.cargando}
        error={datos.error}
        intervaloMs={intervaloMs}
        pausado={pausado}
        onIntervalo={setIntervaloMs}
        onPausar={setPausado}
        onRefrescar={datos.refrescar}
      />

      <main className="mx-auto max-w-[1800px] space-y-4 px-4 py-4">
        <PanelFiltros
          filas={datos.filas}
          filtros={filtros}
          onChange={setFiltros}
          totalFiltradas={filtradas.length}
          onExportar={() => exportarCsv(ordenadas)}
          totalFavoritos={favoritos.size}
        />
        <ResumenNiveles filas={filtradas} />
        {datos.filas.length === 0 && datos.cargando ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Cargando convocatorias del portal…</div>
        ) : (
          <Tabla filas={ordenadas} orden={orden} asc={asc} onOrden={cambiarOrden} favoritos={favoritos} onFavorito={toggleFavorito} />
        )}
        <footer className="flex flex-wrap items-center justify-between gap-2 pb-6 text-xs text-slate-500">
          <span>
            Inscritos, cargos, sedes y salarios: API pública del portal en cada actualización. Denominación, ubicación, estudio y experiencia:
            extraídos de los PDF oficiales de cada convocatoria ({REQUISITOS_GENERADOS_EN}). Haz clic en una fila para ver el detalle.
          </span>
          <button
            className="underline hover:text-pgn-red"
            onClick={() => {
              if (confirm("¿Borrar el historial local de inscritos (usado para las columnas Δ)?")) {
                limpiarHistorial();
                location.reload();
              }
            }}
          >
            Borrar historial local
          </button>
        </footer>
      </main>
    </div>
  );
}
