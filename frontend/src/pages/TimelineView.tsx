import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTimeline } from '../hooks/useTimeline';
import TimelinePlayer from '../components/timeline/TimelinePlayer';
import ReadyQueueRow from '../components/timeline/ReadyQueueRow';
import IOQueueRow from '../components/timeline/IOQueueRow';
import CPURow from '../components/timeline/CPURow';
import GlassButton from '../components/ui/GlassButton';
import type { Snapshot, SnapshotEvent } from '../types';

interface IOOp {
  pid: string;
  priority: number;
  duration: number;
  startTime: number;
  endTime: number;
  remaining?: number;
  isActive: boolean;
}

interface ReadyEntry {
  pid: string;
  priority: number;
  isActive: boolean;
  remaining?: number;
}

function computeReadyHistory(snapshots: Snapshot[]): ReadyEntry[] {
  const seen = new Set<string>();
  const order: ReadyEntry[] = [];
  snapshots.forEach((s) => {
    s.readyQueue.forEach((p) => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        order.push({ pid: p.id, priority: p.priority, isActive: false });
      }
    });
  });
  return order;
}

function computeIOHistory(
  events: SnapshotEvent[],
  snapshots: Snapshot[],
): IOOp[] {
  const ops: IOOp[] = [];
  const startMap = new Map<string, number>();
  const sorted = [...events].sort((a, b) => a.time - b.time);
  sorted.forEach((e) => {
    if (e.type === 'IO_START') {
      startMap.set(e.processId, e.time);
    } else if (e.type === 'IO_END') {
      const start = startMap.get(e.processId);
      if (start !== undefined) {
        const dur = e.time - start;
        ops.push({
          pid: e.processId,
          priority: 0,
          duration: dur,
          startTime: start,
          endTime: e.time,
          isActive: false,
        });
        startMap.delete(e.processId);
      }
    }
  });
  ops.forEach((op) => {
    for (const s of snapshots) {
      const f = s.readyQueue.find((p) => p.id === op.pid);
      if (f) { op.priority = f.priority; break; }
    }
  });
  return ops;
}

function computeRemaining(
  snapshots: Snapshot[],
  pid: string,
  atTime: number,
): number | undefined {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const s = snapshots[i];
    if (s.time > atTime) continue;
    const f = s.readyQueue.find((p) => p.id === pid);
    if (f && f.remaining !== undefined) return f.remaining;
  }
  return undefined;
}

const SCROLL_STEP = 200;

export default function TimelineView() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const tl = useTimeline(simId);

  const readyRef = useRef<HTMLDivElement | null>(null);
  const ioRef = useRef<HTMLDivElement | null>(null);
  const cpuRef = useRef<HTMLDivElement | null>(null);
  const isSyncing = useRef(false);

  const syncScroll = useCallback((source: HTMLDivElement) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const x = source.scrollLeft;
    [readyRef, ioRef, cpuRef].forEach((ref) => {
      if (ref.current && ref.current !== source) {
        ref.current.scrollLeft = x;
      }
    });
    isSyncing.current = false;
  }, []);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => syncScroll(e.currentTarget),
    [syncScroll],
  );

  const scrollLeft = useCallback(() => {
    const v = readyRef.current;
    if (v) { v.scrollLeft -= SCROLL_STEP; syncScroll(v); }
  }, [syncScroll]);

  const scrollRight = useCallback(() => {
    const v = readyRef.current;
    if (v) { v.scrollLeft += SCROLL_STEP; syncScroll(v); }
  }, [syncScroll]);

  const readyHistory = useMemo(() => computeReadyHistory(tl.snapshots), [tl.snapshots]);
  const ioHistory = useMemo(() => computeIOHistory(tl.events, tl.snapshots), [tl.events, tl.snapshots]);
  const currentTime = tl.current?.time ?? 0;
  const activeReady = new Set(tl.current?.readyQueue.map((p) => p.id) ?? []);
  const activeBlocked = new Set(tl.current?.blockedQueue.map((p) => p.id) ?? []);

  const readyItems = useMemo(
    () =>
      readyHistory.map((e) => ({
        ...e,
        isActive: activeReady.has(e.pid),
        remaining: activeReady.has(e.pid)
          ? tl.current?.readyQueue.find((p) => p.id === e.pid)?.remaining
          : undefined,
      })),
    [readyHistory, activeReady, tl.current],
  );

  const ioItems = useMemo(
    () =>
      ioHistory.map((op) => ({
        ...op,
        isActive: activeBlocked.has(op.pid) && currentTime >= op.startTime && currentTime < op.endTime,
        remaining: computeRemaining(tl.snapshots, op.pid, op.startTime),
      })),
    [ioHistory, activeBlocked, currentTime, tl.snapshots],
  );

  const totalTime = tl.snapshots.length > 0 ? tl.snapshots[tl.snapshots.length - 1].time : 0;

  if (tl.loading) {
    return (
      <div className="sim-loading">
        <motion.div className="glass loading-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="spinner-lg" />
          <p>Cargando línea de tiempo...</p>
        </motion.div>
      </div>
    );
  }

  if (tl.error) {
    return (
      <div className="sim-loading">
        <div className="glass error-card">
          <p>{tl.error}</p>
          <GlassButton variant="secondary" onClick={() => navigate(-1)}>Volver</GlassButton>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="tl-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="sim-top-bar">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="sim-top-info">
          <h2>Timeline Pedagógico</h2>
          <span className="sim-top-id">ID: {simId}</span>
        </div>
        <GlassButton variant="secondary" size="sm" icon={<BarChart3 size={16} />} onClick={() => navigate(`/results/${simId}`)}>
          Resultados
        </GlassButton>
        <GlassButton variant="secondary" size="sm" icon={<Eye size={16} />} onClick={() => navigate(`/simulation/${simId}`)}>
          Simulación
        </GlassButton>
      </div>

      <TimelinePlayer
        currentIdx={tl.currentIdx}
        total={tl.totalSnapshots}
        currentTime={currentTime}
        playState={tl.playState}
        speed={tl.speed}
        onGoToStart={tl.goToStart}
        onStepBack={tl.stepBack}
        onPlay={tl.play}
        onPause={tl.pause}
        onStepForward={tl.stepForward}
        onGoToEnd={tl.goToEnd}
        onSpeedChange={tl.setSpeed}
        onSeek={(r) => tl.goTo(Math.round(r * (tl.totalSnapshots - 1)))}
      />

      <div className="tl-rows-section">
        <div className="tl-scroll-nav tl-scroll-nav-left" onClick={scrollLeft}>
          <ChevronLeft size={20} />
        </div>
        <div className="tl-rows-scroll-wrap">
          <div className="tl-rows-inner">
            <ReadyQueueRow items={readyItems} scrollRef={readyRef} onScroll={handleScroll} />

            <div className="tl-row-divider" />

            <IOQueueRow items={ioItems} scrollRef={ioRef} onScroll={handleScroll} />

            <div className="tl-row-divider" />

            <CPURow blocks={tl.gantt} totalTime={totalTime} currentTime={currentTime} scrollRef={cpuRef} onScroll={handleScroll} />
          </div>
        </div>
        <div className="tl-scroll-nav tl-scroll-nav-right" onClick={scrollRight}>
          <ChevronRight size={20} />
        </div>
      </div>
    </motion.div>
  );
}
