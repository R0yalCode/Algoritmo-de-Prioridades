import { createContext, useContext } from 'react';
import type {
  GanttBlock, GlobalMetrics, Metric, ProcessFormData, SimulationHistory,
} from '../types';

/**
 * Contrato del estado global de la última simulación ejecutada.
 *
 * "Iniciar simulación" ejecuta, guarda el resultado aquí y recién entonces
 * navega a la Vista Histórica, que lo consume sin volver a pedirlo al backend.
 * No se almacenan snapshots: ninguna vista actual los utiliza.
 */

export interface StoredSimulation {
  simulationId: string;
  processes: ProcessFormData[];
  history: SimulationHistory;
  gantt: GanttBlock[];
  metrics: Metric[];
  globalMetrics: GlobalMetrics | null;
}

export interface SimulationStore {
  stored: StoredSimulation | null;
  save: (simulation: StoredSimulation) => void;
  clear: () => void;
}

export const STORAGE_KEY = 'simcpu:last-simulation';

export const SimulationContext = createContext<SimulationStore | null>(null);

export function useSimulationStore(): SimulationStore {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationStore requiere SimulationProvider');
  return ctx;
}

/** Resultado almacenado solo si corresponde a la simulación pedida. */
export function useStoredSimulation(simId: string | undefined): StoredSimulation | null {
  const { stored } = useSimulationStore();
  return stored && simId && stored.simulationId === simId ? stored : null;
}
