import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Timer, Cpu, BarChart3, List, Save } from 'lucide-react';
import GlassButton from '../components/ui/GlassButton';
import MetricCard from '../components/results/MetricCard';
import ResultsGantt from '../components/results/ResultsGantt';
import SaveExerciseModal from '../components/library/SaveExerciseModal';
import Toast from '../components/ui/Toast';
import type { GanttBlock, Metric, GlobalMetrics, ProcessFormData, ToastData } from '../types';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { gantt, metrics, globalMetrics, processes } = (location.state || {}) as {
    gantt: GanttBlock[];
    metrics: Metric[];
    globalMetrics: GlobalMetrics | null;
    processes: ProcessFormData[];
  };

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!metrics) {
    return (
      <div className="sim-loading">
        <div className="glass error-card">
          <p>No hay resultados disponibles.</p>
          <GlassButton variant="secondary" onClick={() => navigate('/')}>Volver</GlassButton>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="results-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="results-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <h2>Resultados de la simulación</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <GlassButton
            variant="primary"
            icon={<Save size={16} />}
            onClick={() => setShowSaveModal(true)}
          >
            Guardar ejercicio
          </GlassButton>
          <GlassButton variant="ghost" onClick={() => navigate('/')}>Volver al inicio</GlassButton>
        </div>
      </div>

      {globalMetrics && (
        <div className="metrics-grid">
          <MetricCard
            icon={<Timer size={22} />}
            label="Tiempo promedio de espera"
            value={`${globalMetrics.averageWaitingTime.toFixed(2)} ms`}
            color="#3b82f6"
            delay={0}
          />
          <MetricCard
            icon={<Clock size={22} />}
            label="Tiempo promedio de retorno"
            value={`${globalMetrics.averageTurnaroundTime.toFixed(2)} ms`}
            color="#8b5cf6"
            delay={0.1}
          />
          <MetricCard
            icon={<Cpu size={22} />}
            label="Utilización de CPU"
            value={`${globalMetrics.cpuUtilization.toFixed(1)}%`}
            color="#22c55e"
            delay={0.2}
          />
          <MetricCard
            icon={<BarChart3 size={22} />}
            label="Cantidad de procesos"
            value={`${metrics.length}`}
            color="#06b6d4"
            delay={0.3}
          />
        </div>
      )}

      <div className="results-section">
        <h3 className="results-section-title">
          <List size={18} />
          Métricas por proceso
        </h3>
        <div className="metrics-table-wrap glass">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Tiempo de retorno</th>
                <th>Tiempo de espera</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <motion.tr
                  key={m.processId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td className="metric-proc-id">{m.processId}</td>
                  <td>{m.turnaroundTime} ms</td>
                  <td>{m.waitingTime} ms</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResultsGantt blocks={gantt || []} />

      <div className="results-footer">
        <GlassButton variant="ghost" onClick={() => navigate('/')}>Volver al inicio</GlassButton>
      </div>

      <SaveExerciseModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        processes={processes || []}
        onSaved={() => setToast({ id: 'save', message: 'Ejercicio guardado correctamente', type: 'success' })}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </motion.div>
  );
}
