import type { IOTimelineEntry } from '../../types';
import { IO_PX_PER_UNIT } from './layout';

/**
 * Cola de E/S como fila histórica continua.
 *
 * Un bloque por operación, en el orden en que ocurrieron y con ancho
 * proporcional únicamente a `duration`. Al terminar una operación el bloque no
 * se mueve ni se elimina: solo cambia de color y opacidad.
 */

interface Props {
  operations: IOTimelineEntry[];
  currentTime: number;
}

function phaseOf(op: IOTimelineEntry, time: number): 'pending' | 'active' | 'done' {
  if (time < op.start) return 'pending';
  if (op.end !== null && time >= op.end) return 'done';
  return 'active';
}

export default function IOQueueRow({ operations, currentTime }: Props) {
  return (
    <div className="hv-track hv-track-io">
      {operations.length === 0 && (
        <span className="hv-empty">Sin operaciones de E/S</span>
      )}
      {operations.map((op) => (
        <div
          key={`${op.processId}-${op.start}`}
          className="hv-io"
          data-phase={phaseOf(op, currentTime)}
          style={{ width: (op.duration ?? 1) * IO_PX_PER_UNIT }}
          title={
            `${op.processId} · E/S de ${op.duration} ms` +
            `\nBloqueado en [${op.start}, ${op.end ?? '—'})` +
            `\nPrioridad ${op.priority} · CPU restante ${op.remainingCpu}`
          }
        >
          <span className="hv-io-prio">{op.priority}</span>
          <div className="hv-io-body">
            <span className="hv-io-pid">{op.processId}</span>
          </div>
          <span className="hv-io-foot">
            <span className="hv-io-rem">CPU {op.remainingCpu}</span>
            <span className="hv-io-exit">
              {op.end !== null ? `Sale en t = ${op.end}` : 'En curso'}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
