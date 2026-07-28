import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { Snapshot, GanttBlock, Metric, GlobalMetrics, SnapshotEvent } from '../types';

export function useSimulation(simId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [events, setEvents] = useState<SnapshotEvent[]>([]);
  const [gantt, setGantt] = useState<GanttBlock[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playState, setPlayState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback(async () => {
    if (!simId) return;
    setLoading(true);
    const execRes = await api.execute(simId);
    if (!execRes.success) {
      setError(execRes.error?.message || 'Error al ejecutar');
      setLoading(false);
      return;
    }
    const resRes = await api.getResults(simId);
    if (!resRes.success || !resRes.data) {
      setError('Error al obtener resultados');
      setLoading(false);
      return;
    }
    const d = resRes.data;
    setSnapshots(d.snapshots);
    setEvents(d.events);
    setGantt(d.gantt);
    setMetrics(d.metrics);
    setGlobalMetrics(d.globalMetrics);
    setCurrentIdx(0);
    setLoading(false);
  }, [simId]);

  useEffect(() => { execute(); }, [execute]);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, snapshots.length - 1)));
  }, [snapshots.length]);

  const stepBack = useCallback(() => goTo(currentIdx - 1), [currentIdx, goTo]);
  const stepForward = useCallback(() => goTo(currentIdx + 1), [currentIdx, goTo]);
  const play = useCallback(() => setPlayState('playing'), []);
  const pause = useCallback(() => setPlayState('paused'), []);
  const reset = useCallback(() => {
    setPlayState('stopped');
    setCurrentIdx(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (playState !== 'playing') return;
    if (currentIdx >= snapshots.length - 1) {
      setPlayState('stopped');
      return;
    }
    const delay = Math.max(100, Math.round(1000 / speed));
    timerRef.current = setTimeout(() => {
      setCurrentIdx((prev) => {
        if (prev >= snapshots.length - 1) {
          setPlayState('stopped');
          return prev;
        }
        return prev + 1;
      });
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playState, currentIdx, snapshots.length, speed]);

  const current: Snapshot | null = snapshots[currentIdx] || null;
  const totalTime = snapshots.length > 0 ? snapshots[snapshots.length - 1].time : 0;

  return {
    loading, error,
    current, currentIdx, snapshots, events, gantt, metrics, globalMetrics, totalTime,
    playState, speed, setSpeed,
    stepBack, stepForward, play, pause, reset, goTo,
  };
}
