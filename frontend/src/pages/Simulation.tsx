import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart3, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSimulation } from '../hooks/useSimulation';
import CPUPanel from '../components/simulation/CPUPanel';
import CPLPanel from '../components/simulation/CPLPanel';
import IOQueuePanel from '../components/simulation/IOQueuePanel';
import EventPanel from '../components/simulation/EventPanel';
import SimulationControls from '../components/simulation/SimulationControls';
import Timeline from '../components/simulation/Timeline';
import GanttChart from '../components/simulation/GanttChart';
import GlassButton from '../components/ui/GlassButton';

export default function Simulation() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sim = useSimulation(simId);
  const processes = (location.state as any)?.processes;

  if (sim.loading) {
    return (
      <div className="sim-loading">
        <motion.div
          className="glass loading-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="spinner-lg" />
          <p>Ejecutando simulación...</p>
        </motion.div>
      </div>
    );
  }

  if (sim.error) {
    return (
      <div className="sim-loading">
        <div className="glass error-card">
          <p>{sim.error}</p>
          <GlassButton variant="secondary" onClick={() => navigate(-1)}>Volver</GlassButton>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="sim-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="sim-top-bar">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="sim-top-info">
          <h2>Simulación</h2>
          <span className="sim-top-id">ID: {simId}</span>
        </div>
        <GlassButton
          variant="secondary"
          size="sm"
          icon={<History size={16} />}
          onClick={() => navigate(`/timeline/${simId}`)}
        >
          Historial
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="sm"
          icon={<BarChart3 size={16} />}
          onClick={() => navigate(`/results/${simId}`, {
            state: { gantt: sim.gantt, metrics: sim.metrics, globalMetrics: sim.globalMetrics, processes },
          })}
        >
          Resultados
        </GlassButton>
      </div>

      <div className="sim-grid">
        <div className="sim-col-left">
          <CPUPanel cpu={sim.current?.cpu} />
          <CPLPanel queue={sim.current?.readyQueue || []} />
          <IOQueuePanel queue={sim.current?.blockedQueue || []} />
        </div>
        <div className="sim-col-right">
          <EventPanel events={sim.events} currentTime={sim.current?.time || 0} />
        </div>
      </div>

      <Timeline
        currentTime={sim.current?.time || 0}
        totalTime={sim.totalTime}
        onClick={(t) => {
          const idx = sim.snapshots.findIndex((s) => s.time >= t);
          if (idx >= 0) sim.goTo(idx);
        }}
      />

      <SimulationControls
        currentIdx={sim.currentIdx}
        total={sim.snapshots.length}
        onStepBack={sim.stepBack}
        onStepForward={sim.stepForward}
        onPlay={sim.play}
        onPause={sim.pause}
        onReset={sim.reset}
        playState={sim.playState}
        speed={sim.speed}
        onSpeedChange={sim.setSpeed}
      />

      <GanttChart blocks={sim.gantt} />
    </motion.div>
  );
}
