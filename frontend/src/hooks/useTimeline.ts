import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { Snapshot, SnapshotEvent, GanttBlock } from '../types';

export function useTimeline(simId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [events, setEvents] = useState<SnapshotEvent[]>([]);
  const [gantt, setGantt] = useState<GanttBlock[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playState, setPlayState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!simId) return;
    setLoading(true);
    const res = await api.getResults(simId);
    if (!res.success || !res.data) {
      setError(res.error?.message || 'Error al cargar resultados');
      setLoading(false);
      return;
    }
    const d = res.data;
    setSnapshots(d.snapshots);
    setEvents(d.events);
    setGantt(d.gantt);
    setCurrentIdx(0);
    setLoading(false);
  }, [simId]);

  useEffect(() => { load(); }, [load]);

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

  const goToStart = useCallback(() => {
    setPlayState('stopped');
    setCurrentIdx(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const goToEnd = useCallback(() => {
    setPlayState('stopped');
    setCurrentIdx(snapshots.length - 1);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [snapshots.length]);

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
  const totalSnapshots = snapshots.length;

  const allProcessIds = useCallback(() => {
    const ids = new Set<string>();
    snapshots.forEach((s) => {
      s.readyQueue.forEach((p) => ids.add(p.id));
      s.blockedQueue.forEach((p) => ids.add(p.id));
      s.terminatedProcesses.forEach((p) => ids.add(p.id));
      if (s.cpu?.id) ids.add(s.cpu.id);
    });
    events.forEach((e) => { if (e.processId) ids.add(e.processId); });
    return Array.from(ids).sort();
  }, [snapshots, events]);

  const getProcessState = useCallback((snapshot: Snapshot | null, pid: string): string => {
    if (!snapshot) return 'NEW';
    if (snapshot.terminatedProcesses.some((p) => p.id === pid)) return 'TERMINATED';
    if (snapshot.cpu?.id === pid) return 'RUNNING';
    if (snapshot.readyQueue.some((p) => p.id === pid)) return 'READY';
    if (snapshot.blockedQueue.some((p) => p.id === pid)) return 'BLOCKED';
    return 'NEW';
  }, []);

  return {
    loading, error,
    current, currentIdx, totalSnapshots, snapshots, events, gantt,
    playState, speed, setSpeed,
    stepBack, stepForward, play, pause, reset, goTo, goToStart, goToEnd,
    allProcessIds, getProcessState,
  };
}
