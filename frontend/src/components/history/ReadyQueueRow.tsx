import type { ReadyTimelineEntry, ReadyStateObservation } from '../../types';
import { READY_CARD_W, STATE_LABEL } from './layout';

/**
 * Cola de listos como fila histórica permanente.
 *
 * Una tarjeta por CADA APARICIÓN histórica (no por proceso): un mismo proceso
 * puede tener varias tarjetas si regresó de E/S más de una vez, una por cada
 * regreso. `visualIndex` identifica la aparición de forma única y permanente
 * en su posición; nunca se reordena, nunca se elimina y nunca se funde con
 * otra tarjeta del mismo proceso. La apropiación no genera una tarjeta nueva
 * (el proceso vuelve a READY dentro de la misma aparición); solo el regreso
 * desde E/S abre una aparición — y por lo tanto una tarjeta — nueva.
 */

interface Props {
  entries: ReadyTimelineEntry[];
  currentTime: number;
}

/** Acceso directo por posición: history[] es contigua desde firstAppearance. */
function observationAt(
  entry: ReadyTimelineEntry,
  time: number,
): ReadyStateObservation | null {
  const idx = time - entry.firstAppearance;
  if (idx < 0) return null;
  return entry.history[Math.min(idx, entry.history.length - 1)] ?? null;
}

export default function ReadyQueueRow({ entries, currentTime }: Props) {
  return (
    <div className="hv-track" style={{ width: entries.length * READY_CARD_W }}>
      {entries.map((entry) => {
        const obs = observationAt(entry, currentTime);
        const state = obs ? obs.state : 'NEW';
        return (
          <div
            key={entry.visualIndex}
            className="hv-card"
            data-state={state}
            style={{ width: READY_CARD_W }}
            title={
              `${entry.processId} · ${STATE_LABEL[state]}` +
              `\nPrioridad ${entry.priority}` +
              (obs
                ? `\nCPU ejecutada ${obs.executedCpu} · restante ${obs.remainingCpu}` +
                  `\nOrden FIFO ${obs.fifoOrder}` +
                  (obs.readyPosition !== null
                    ? `\nPosición en CPL ${obs.readyPosition}`
                    : '')
                : `\nLlega en t = ${entry.firstAppearance}`)
            }
          >
            <span className="hv-card-prio">{entry.priority}</span>
            <div className="hv-card-body">
              <span className="hv-card-pid">{entry.processId}</span>
              <span className="hv-card-index">#{entry.visualIndex}</span>
            </div>
            <span className="hv-card-rem">{obs ? obs.remainingCpu : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
