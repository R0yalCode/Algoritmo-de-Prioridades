import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Save } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { useStoredSimulation } from '../state/simulationContext';
import TimelineToolbar from '../components/history/TimelineToolbar';
import TimelineScroller from '../components/history/TimelineScroller';
import ReadyQueueRow from '../components/history/ReadyQueueRow';
import IOQueueRow from '../components/history/IOQueueRow';
import CPUGanttRow from '../components/history/CPUGanttRow';
import TimeScale from '../components/history/TimeScale';
import EventTimeline from '../components/history/EventTimeline';
import Legend from '../components/history/Legend';
import GlassButton from '../components/ui/GlassButton';
import SaveExerciseModal from '../components/library/SaveExerciseModal';
import Toast from '../components/ui/Toast';
import { processColor } from '../components/history/layout';
import type { ToastData } from '../types';

/**
 * Vista histórica: pantalla principal de análisis de una simulación.
 *
 * Consume exclusivamente simulation.history (readyTimeline, ioTimeline,
 * cpuTimeline y eventTimeline). No lee snapshots, no reconstruye historia, no
 * infiere estados y no calcula posiciones.
 */

export default function HistoryView() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const hv = useHistory(simId);
  const stored = useStoredSimulation(simId);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Un color por proceso (no por aparición): un proceso con varias tarjetas
  // (una por cada regreso de E/S) debe verse igual en todas ellas y en el
  // Gantt de CPU. El índice usado para elegir el color es un contador
  // compacto de procesos únicos en orden de primera aparición (0..N-1), no
  // el visualIndex de la aparición: ese vive en el espacio disperso de todas
  // las apariciones (0..22 en el ejercicio oficial) y repartiría mal los
  // colores de la paleta entre procesos realmente distintos.
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    let nextColorIndex = 0;
    hv.readyTimeline.forEach((entry) => {
      if (!map.has(entry.processId)) {
        map.set(entry.processId, processColor(nextColorIndex));
        nextColorIndex += 1;
      }
    });
    return map;
  }, [hv.readyTimeline]);

  const colorOf = useCallback(
    (processId: string) => colors.get(processId) ?? '#64748b',
    [colors],
  );

  const openResults = useCallback(() => {
    navigate(`/results/${simId}`, {
      state: stored
        ? {
            gantt: stored.gantt,
            metrics: stored.metrics,
            globalMetrics: stored.globalMetrics,
            processes: stored.processes,
          }
        : undefined,
    });
  }, [navigate, simId, stored]);

  if (hv.loading) {
    return (
      <div className="sim-loading">
        <motion.div
          className="glass loading-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="spinner-lg" />
          <p>Cargando historial...</p>
        </motion.div>
      </div>
    );
  }

  if (hv.error) {
    return (
      <div className="sim-loading">
        <div className="glass error-card">
          <p>{hv.error}</p>
          <GlassButton variant="secondary" onClick={() => navigate(-1)}>Volver</GlassButton>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="hv-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="sim-top-bar">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="sim-top-info">
          <h2>Vista histórica</h2>
          <span className="sim-top-id">
            Prioridades apropiativo · {hv.totalTime} ms · ID: {simId}
          </span>
        </div>
        <GlassButton
          variant="secondary" size="md" icon={<BarChart3 size={18} />}
          onClick={openResults}
        >
          Resultados
        </GlassButton>
        <GlassButton
          variant="primary" size="md" icon={<Save size={18} />}
          onClick={() => setShowSaveModal(true)}
          disabled={!stored}
        >
          Guardar
        </GlassButton>
      </div>

      <TimelineToolbar
        cursor={hv.cursor}
        totalEvents={hv.totalEvents}
        currentTime={hv.currentTime}
        currentEvent={hv.currentEvent}
        playState={hv.playState}
        speed={hv.speed}
        onGoToStart={hv.goToStart}
        onStepBack={hv.stepBack}
        onPlay={hv.play}
        onPause={hv.pause}
        onStepForward={hv.stepForward}
        onGoToEnd={hv.goToEnd}
        onSpeedChange={hv.setSpeed}
        onSeek={hv.goTo}
      />

      {/* Cada línea se desplaza por separado: recorrer el Gantt no oculta la
          cola de listos ni la de E/S. CPU y escala comparten viewport porque
          comparten el eje temporal. */}
      <div className="hv-lines">
        <TimelineScroller
          title="Procesos listos"
          sub={`${hv.readyTimeline.length} apariciones`}
        >
          <ReadyQueueRow entries={hv.readyTimeline} currentTime={hv.currentTime} />
        </TimelineScroller>

        <TimelineScroller
          title="Operaciones E/S"
          sub={`${hv.ioTimeline.length} operaciones`}
        >
          <IOQueueRow operations={hv.ioTimeline} currentTime={hv.currentTime} />
        </TimelineScroller>

        <TimelineScroller
          title="CPU"
          sub={`${hv.cpuTimeline.length} bloques`}
          hint="tiempo (ms)"
        >
          <CPUGanttRow
            blocks={hv.cpuTimeline}
            currentTime={hv.currentTime}
            totalTime={hv.totalTime}
            colorOf={colorOf}
          />
          <TimeScale totalTime={hv.totalTime} currentTime={hv.currentTime} />
        </TimelineScroller>
      </div>

      <div className="hv-bottom">
        <EventTimeline
          events={hv.eventTimeline}
          cursor={hv.cursor}
          onSelect={hv.goTo}
        />
        <Legend />
      </div>

      <SaveExerciseModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        processes={stored?.processes ?? []}
        onSaved={() => setToast({
          id: 'save',
          message: 'Ejercicio guardado correctamente',
          type: 'success',
        })}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </motion.div>
  );
}
