import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Eye } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import TimelineToolbar from '../components/history/TimelineToolbar';
import TimelineScroller from '../components/history/TimelineScroller';
import ReadyQueueRow from '../components/history/ReadyQueueRow';
import IOQueueRow from '../components/history/IOQueueRow';
import CPUGanttRow from '../components/history/CPUGanttRow';
import TimeScale from '../components/history/TimeScale';
import EventTimeline from '../components/history/EventTimeline';
import Legend from '../components/history/Legend';
import GlassButton from '../components/ui/GlassButton';
import { processColor } from '../components/history/layout';

/**
 * Vista histórica. Consume exclusivamente simulation.history:
 * readyTimeline, ioTimeline, cpuTimeline y eventTimeline.
 *
 * No lee snapshots, no reconstruye historia, no infiere estados y no calcula
 * posiciones: solo representa lo que el backend ya resolvió.
 */

export default function HistoryView() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const hv = useHistory(simId);

  // Un color por proceso, fijado por su visualIndex permanente.
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    hv.readyTimeline.forEach((entry) => {
      map.set(entry.processId, processColor(entry.visualIndex));
    });
    return map;
  }, [hv.readyTimeline]);

  const colorOf = useCallback(
    (processId: string) => colors.get(processId) ?? '#64748b',
    [colors],
  );

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
          variant="secondary" size="sm" icon={<BarChart3 size={16} />}
          onClick={() => navigate(`/results/${simId}`)}
        >
          Resultados
        </GlassButton>
        <GlassButton
          variant="secondary" size="sm" icon={<Eye size={16} />}
          onClick={() => navigate(`/simulation/${simId}`)}
        >
          Simulación
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
          title="READY QUEUE"
          sub={`${hv.readyTimeline.length} procesos`}
        >
          <ReadyQueueRow entries={hv.readyTimeline} currentTime={hv.currentTime} />
        </TimelineScroller>

        <TimelineScroller
          title="I/O QUEUE"
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
    </motion.div>
  );
}
