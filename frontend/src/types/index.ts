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

export interface SimulationResultData {
  simulationId: string;
  snapshots: Snapshot[];
  events: SnapshotEvent[];
  gantt: GanttBlock[];
  metrics: Metric[];
  globalMetrics: GlobalMetrics;
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
