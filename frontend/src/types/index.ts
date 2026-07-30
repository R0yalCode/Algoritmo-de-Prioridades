export interface IOOperation {
  activationPoint: number;
  duration: number;
}

export interface ProcessFormData {
  id: string;
  arrivalTime: number;
  cpuBurst: number;
  priority: number;
  ioOperations: IOOperation[];
}

export interface SnapshotCPU {
  id: string | null;
  status: string;
}

export interface SnapshotProcess {
  id: string;
  priority: number;
  state: string;
  remaining?: number;
  finishTime?: number;
}

export interface SnapshotEvent {
  time: number;
  type: string;
  processId: string;
  description: string;
}

export interface Snapshot {
  time: number;
  cpu: SnapshotCPU | null;
  readyQueue: SnapshotProcess[];
  blockedQueue: SnapshotProcess[];
  terminatedProcesses: SnapshotProcess[];
  events: SnapshotEvent[];
}

export interface GanttBlock {
  processId: string;
  start: number;
  end: number;
}

export interface Metric {
  processId: string;
  turnaroundTime: number;
  waitingTime: number;
}

export interface GlobalMetrics {
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  cpuUtilization: number;
}

/* ── Historia pedagógica (única fuente de la vista histórica) ──
   El backend entrega este modelo ya resuelto: la vista no calcula
   estados, posiciones, orden FIFO ni tiempos restantes. */

export type ProcessState = 'NEW' | 'READY' | 'RUNNING' | 'BLOCKED' | 'TERMINATED';

export interface ReadyStateObservation {
  time: number;
  state: ProcessState;
  active: boolean;
  priority: number;
  remainingCpu: number;
  executedCpu: number;
  fifoOrder: number;
  readyPosition: number | null;
}

export interface ReadyTimelineEntry {
  processId: string;
  priority: number;
  firstAppearance: number;
  visualIndex: number;
  history: ReadyStateObservation[];
}

export interface IOTimelineEntry {
  processId: string;
  start: number;
  end: number | null;
  duration: number | null;
  priority: number;
  remainingCpu: number;
  visualIndex: number;
  completed: boolean;
}

export interface CPUTimelineEntry {
  processId: string | null;
  start: number;
  end: number;
  duration: number;
  idle: boolean;
}

export interface EventTimelineEntry {
  time: number;
  type: string;
  processId: string | null;
  description: string;
  reason: string;
}

export interface SimulationHistory {
  readyTimeline: ReadyTimelineEntry[];
  ioTimeline: IOTimelineEntry[];
  cpuTimeline: CPUTimelineEntry[];
  eventTimeline: EventTimelineEntry[];
}

export interface SimulationResultData {
  simulationId: string;
  snapshots: Snapshot[];
  events: SnapshotEvent[];
  gantt: GanttBlock[];
  metrics: Metric[];
  globalMetrics: GlobalMetrics;
  history: SimulationHistory | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
}

export interface ExerciseInfo {
  id: string;
  name: string;
  createdAt?: string;
  processCount?: number;
}

export interface ExerciseDetail {
  name: string;
  processes: ProcessFormData[];
}

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type EventType =
  | 'ARRIVAL'
  | 'PREEMPTION'
  | 'CPU_ASSIGNED'
  | 'CPU_RELEASED'
  | 'IO_START'
  | 'IO_END'
  | 'TERMINATED';

export const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  ARRIVAL: { label: 'Llegada', color: '#3b82f6', icon: 'LogIn' },
  PREEMPTION: { label: 'Apropiación', color: '#f59e0b', icon: 'ArrowLeftRight' },
  CPU_ASSIGNED: { label: 'Entrada CPU', color: '#22c55e', icon: 'Cpu' },
  CPU_RELEASED: { label: 'Salida CPU', color: '#8b5cf6', icon: 'Cpu' },
  IO_START: { label: 'Inicio E/S', color: '#06b6d4', icon: 'HardDrive' },
  IO_END: { label: 'Fin E/S', color: '#10b981', icon: 'HardDrive' },
  TERMINATED: { label: 'Terminación', color: '#64748b', icon: 'CheckCircle2' },
};
