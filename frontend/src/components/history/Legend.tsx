/** Leyenda de la vista histórica: qué significa cada color de cada fila. */

const READY_STATES = [
  { state: 'READY', label: 'Listo' },
  { state: 'RUNNING', label: 'Ejecutando' },
  { state: 'BLOCKED', label: 'Bloqueado' },
  { state: 'TERMINATED', label: 'Terminado' },
  { state: 'NEW', label: 'Sin llegar' },
];

const IO_PHASES = [
  { phase: 'pending', label: 'Pendiente' },
  { phase: 'active', label: 'En curso' },
  { phase: 'done', label: 'Completada' },
];

export default function Legend() {
  return (
    <section className="hv-legend" aria-label="Leyenda">
      <div className="hv-legend-group">
        <span className="hv-legend-title">Ready</span>
        {READY_STATES.map(({ state, label }) => (
          <span key={state} className="hv-legend-item">
            <span className="hv-legend-swatch hv-card" data-state={state} />
            {label}
          </span>
        ))}
      </div>

      <div className="hv-legend-group">
        <span className="hv-legend-title">E/S</span>
        {IO_PHASES.map(({ phase, label }) => (
          <span key={phase} className="hv-legend-item">
            <span className="hv-legend-swatch hv-io" data-phase={phase} />
            {label}
          </span>
        ))}
      </div>

      <div className="hv-legend-group">
        <span className="hv-legend-title">CPU</span>
        <span className="hv-legend-item">
          <span className="hv-legend-swatch hv-gantt hv-legend-proc" />
          Proceso en CPU
        </span>
        <span className="hv-legend-item">
          <span className="hv-legend-swatch hv-gantt" data-idle="true" />
          CPU ociosa
        </span>
      </div>
    </section>
  );
}
