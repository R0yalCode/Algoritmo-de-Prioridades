import type { ApiResponse, ExerciseInfo, SimulationResultData } from '../types';

const BASE = 'http://localhost:8000/api/v1';

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

export const api = {
  validate(processes: unknown[]) {
    return request('POST', '/simulations/validate', { algorithm: 'PREEMPTIVE_PRIORITY', processes });
  },
  create(processes: unknown[]) {
    return request<{ simulationId: string; status: string }>('POST', '/simulations', {
      algorithm: 'PREEMPTIVE_PRIORITY', processes,
    });
  },
  execute(simId: string) {
    return request<{ status: string; totalTime: number }>('POST', `/simulations/${simId}/execute`);
  },
  getResults(simId: string) {
    return request<SimulationResultData>('GET', `/simulations/${simId}/results`);
  },
  saveExercise(name: string, processes: unknown[]) {
    return request<{ fileId: string }>('POST', '/exercises/save', {
      name, simulation: { algorithm: 'PREEMPTIVE_PRIORITY', processes },
    });
  },
  loadExercise(fileId: string) {
    return request<{ name: string; processes: unknown[] }>('GET', `/exercises/${fileId}`);
  },
  listExercises() {
    return request<{ exercises: ExerciseInfo[] }>('GET', '/exercises');
  },
  deleteExercise(fileId: string) {
    return request('DELETE', `/exercises/${fileId}`);
  },
};
