import { Timer, Clock, BarChart3, Cpu } from 'lucide-react';

const metrics = [
  {
    icon: Timer,
    formula: 'TR = TF − TL',
    name: 'Tiempo de Retorno',
    desc: 'Tiempo de Finalización menos Tiempo de Llegada. Representa la duración total que el proceso permaneció en el sistema, desde que ingresa hasta que completa su ejecución.',
  },
  {
    icon: Clock,
    formula: 'TE = TR − CPU − E/S',
    name: 'Tiempo de Espera',
    desc: 'Tiempo de Retorno menos Tiempo de CPU menos Tiempo de E/S. Corresponde al tiempo que el proceso estuvo en la cola de listos sin recibir el procesador.',
  },
  {
    icon: BarChart3,
    formula: 'TP = Σ TR / N',
    name: 'Tiempo Promedio de Retorno',
    desc: 'Sumatoria de los tiempos de retorno individuales dividida entre el número total de procesos. Mide el rendimiento promedio del sistema.',
  },
  {
    icon: Cpu,
    formula: 'CPU% = (TO / TT) × 100',
    name: 'Uso de CPU',
    desc: 'Porcentaje del tiempo total de simulación en que la CPU estuvo ocupada ejecutando procesos. Indica la eficiencia en el uso del procesador.',
  },
];

export default function MetricsPanel() {
  return (
    <section className="landing-section">
      <h2 className="landing-section-title">Métricas Calculadas</h2>
      <div className="landing-metrics-grid">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.name} className="landing-metric-card">
              <div className="landing-fund-card-header" style={{ marginBottom: 12 }}>
                <Icon size={18} color="var(--primary)" />
                <h3 className="landing-fund-card-title">{m.name}</h3>
              </div>
              <div className="landing-metric-formula">{m.formula}</div>
              <p className="landing-metric-desc">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
