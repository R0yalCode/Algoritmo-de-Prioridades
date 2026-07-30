/** Constantes de trazado compartidas por las tres líneas históricas.
 *  El Gantt y la escala temporal usan la misma unidad, por eso quedan
 *  perfectamente alineados sin ningún cálculo adicional. */

export const PX_PER_TICK = 46;      // CPU y escala temporal
export const IO_PX_PER_UNIT = 52;   // ancho proporcional a duration de E/S
export const READY_CARD_W = 96;     // todas las tarjetas miden igual
export const LABEL_W = 132;         // canal fijo de etiquetas de cada fila

/** Colores por proceso para el Gantt, asignados por visualIndex. */
const PROCESS_PALETTE = [
  '#2563eb', '#7c3aed', '#0e7490', '#b45309',
  '#be123c', '#15803d', '#4338ca', '#a16207',
];

export function processColor(visualIndex: number): string {
  return PROCESS_PALETTE[visualIndex % PROCESS_PALETTE.length];
}

export const STATE_LABEL: Record<string, string> = {
  NEW: 'Sin llegar',
  READY: 'Listo',
  RUNNING: 'Ejecutando',
  BLOCKED: 'Bloqueado',
  TERMINATED: 'Terminado',
};

export const EVENT_LABEL: Record<string, string> = {
  PROCESS_ARRIVAL: 'Llegada',
  CPU_DISPATCH: 'Entrada a CPU',
  CPU_EXECUTION: 'Ejecución',
  CPU_COMPLETION: 'Finalización',
  IO_START: 'Inicio E/S',
  IO_COMPLETE: 'Fin E/S',
  PREEMPTION: 'Apropiación',
  CPU_IDLE: 'CPU ociosa',
  CONTEXT_SWITCH: 'Cambio de contexto',
};
