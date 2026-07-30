import { useMemo } from 'react';
import type { EventTimelineEntry } from '../../types';
import { EVENT_LABEL } from './layout';

/**
 * Ventana del `eventTimeline` centrada en el evento actual.
 *
 * Se muestra un tramo fijo alrededor del cursor en lugar de una lista con
 * scroll: así el evento en explicación siempre está visible y ningún scroll se
 * mueve por su cuenta.
 */

const WINDOW = 5;

interface Props {
  events: EventTimelineEntry[];
  cursor: number;
  onSelect: (index: number) => void;
}

export default function EventTimeline({ events, cursor, onSelect }: Props) {
  const from = useMemo(() => {
    const half = Math.floor(WINDOW / 2);
    return Math.max(0, Math.min(cursor - half, events.length - WINDOW));
  }, [cursor, events.length]);

  const visible = events.slice(from, from + WINDOW);

  return (
    <section className="hv-events" aria-label="Historial de eventos">
      <header className="hv-events-head">
        <h3>Eventos</h3>
        <span className="hv-events-count">{events.length} registrados</span>
      </header>
      <ol className="hv-events-list">
        {visible.map((event, i) => {
          const index = from + i;
          const isCurrent = index === cursor;
          return (
            <li key={index}>
              <button
                type="button"
                className="hv-event"
                data-current={isCurrent ? 'true' : undefined}
                data-past={index < cursor ? 'true' : undefined}
                onClick={() => onSelect(index)}
              >
                <span className="hv-event-time">t={event.time}</span>
                <span className="hv-event-type">
                  {EVENT_LABEL[event.type] ?? event.type}
                </span>
                <span className="hv-event-desc">
                  {event.description}
                  {isCurrent && event.reason && (
                    <em className="hv-event-reason">{event.reason}</em>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
