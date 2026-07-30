import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useStoredSimulation } from '../state/simulationContext';
import type { SimulationHistory } from '../types';

/**
 * Estado de la vista histórica.
 *
 * Fuente única: simulation.history. No se leen snapshots, no se reconstruye
 * nada y no se recalculan estados: el cursor es un índice sobre
 * history.eventTimeline y el tiempo actual sale del evento apuntado.
 *
 * Si el resultado ya está en el estado global (flujo normal desde "Iniciar
 * simulación") se usa directamente; si se entra por URL se pide a la API.
 */

const EMPTY: SimulationHistory = {
  readyTimeline: [],
  ioTimeline: [],
  cpuTimeline: [],
  eventTimeline: [],
};

const BASE_STEP_MS = 700;

export type PlayState = 'stopped' | 'playing' | 'paused';

export function useHistory(simId: string | undefined) {
  const stored = useStoredSimulation(simId);
  const [loading, setLoading] = useState(!stored);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SimulationHistory>(stored?.history ?? EMPTY);
  const [cursor, setCursor] = useState(0);
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!simId) return;
    if (stored) {
      setHistory(stored.history);
      setCursor(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await api.getResults(simId);
    if (!res.success || !res.data) {
      setError(res.error?.message || 'Error al cargar el historial');
      setLoading(false);
      return;
    }
    if (!res.data.history) {
      setError('La simulación no incluye historial pedagógico');
      setLoading(false);
      return;
    }
    setHistory(res.data.history);
    setCursor(0);
    setLoading(false);
  }, [simId, stored]);

  useEffect(() => { load(); }, [load]);

  const events = history.eventTimeline;
  const totalEvents = events.length;

  // El backend ya entrega readyTimeline en orden de visualIndex; se ordena una
  // sola vez para que la posición dependa exclusivamente de ese índice.
  const readyTimeline = useMemo(
    () => [...history.readyTimeline].sort((a, b) => a.visualIndex - b.visualIndex),
    [history.readyTimeline],
  );

  const totalTime = useMemo(() => {
    const cpu = history.cpuTimeline;
    return cpu.length > 0 ? cpu[cpu.length - 1].end : 0;
  }, [history.cpuTimeline]);

  const currentEvent = events[cursor] ?? null;
  const currentTime = currentEvent ? currentEvent.time : 0;

  const goTo = useCallback((idx: number) => {
    setCursor((prev) => {
      const max = totalEvents - 1;
      if (max < 0) return 0;
      const next = Math.max(0, Math.min(idx, max));
      return next === prev ? prev : next;
    });
  }, [totalEvents]);

  const stepBack = useCallback(() => {
    setPlayState('paused');
    goTo(cursor - 1);
  }, [cursor, goTo]);

  const stepForward = useCallback(() => {
    setPlayState('paused');
    goTo(cursor + 1);
  }, [cursor, goTo]);

  const play = useCallback(() => setPlayState('playing'), []);
  const pause = useCallback(() => setPlayState('paused'), []);

  const goToStart = useCallback(() => {
    setPlayState('stopped');
    goTo(0);
  }, [goTo]);

  const goToEnd = useCallback(() => {
    setPlayState('stopped');
    goTo(totalEvents - 1);
  }, [goTo, totalEvents]);

  /** Salta al primer evento del tick indicado. */
  const seekToTime = useCallback((time: number) => {
    setPlayState('paused');
    const idx = events.findIndex((e) => e.time >= time);
    goTo(idx === -1 ? totalEvents - 1 : idx);
  }, [events, goTo, totalEvents]);

  useEffect(() => {
    if (playState !== 'playing') return;
    if (cursor >= totalEvents - 1) {
      setPlayState('stopped');
      return;
    }
    const delay = Math.max(90, Math.round(BASE_STEP_MS / speed));
    const timer = setTimeout(() => setCursor((prev) => prev + 1), delay);
    timerRef.current = timer;
    return () => clearTimeout(timer);
  }, [playState, cursor, totalEvents, speed]);

  return {
    loading, error,
    readyTimeline,
    ioTimeline: history.ioTimeline,
    cpuTimeline: history.cpuTimeline,
    eventTimeline: events,
    totalTime,
    cursor, totalEvents, currentEvent, currentTime,
    playState, speed, setSpeed,
    goTo, stepBack, stepForward, play, pause, goToStart, goToEnd, seekToTime,
  };
}
