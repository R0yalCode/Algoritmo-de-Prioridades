import { useCallback, useMemo, useState } from 'react';
import {
  SimulationContext, STORAGE_KEY,
  type SimulationStore, type StoredSimulation,
} from './simulationContext';

/**
 * Guarda el resultado de la simulación en memoria y lo replica en
 * sessionStorage, para que recargar la Vista Histórica no pierda el historial
 * ni los procesos necesarios para guardar el ejercicio.
 */

function readSession(): StoredSimulation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSimulation) : null;
  } catch {
    return null;
  }
}

export default function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredSimulation | null>(readSession);

  const save = useCallback((simulation: StoredSimulation) => {
    setStored(simulation);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(simulation));
    } catch {
      // Sin persistencia la vista sigue funcionando con el estado en memoria.
    }
  }, []);

  const clear = useCallback(() => {
    setStored(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin efecto
    }
  }, []);

  const value = useMemo<SimulationStore>(
    () => ({ stored, save, clear }),
    [stored, save, clear],
  );

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}
