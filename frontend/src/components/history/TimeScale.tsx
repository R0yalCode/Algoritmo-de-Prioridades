import { useMemo } from 'react';
import { PX_PER_TICK } from './layout';

/**
 * Escala temporal alineada con el Gantt: usa la misma unidad (PX_PER_TICK) y
 * el mismo origen, por lo que cada marca cae sobre el borde exacto del bloque.
 */

interface Props {
  totalTime: number;
  currentTime: number;
}

export default function TimeScale({ totalTime, currentTime }: Props) {
  const marks = useMemo(
    () => Array.from({ length: totalTime + 1 }, (_, t) => t),
    [totalTime],
  );

  return (
    <div className="hv-track hv-track-scale" style={{ width: totalTime * PX_PER_TICK }}>
      {marks.map((t) => (
        <div
          key={t}
          className="hv-mark"
          data-current={t === currentTime ? 'true' : undefined}
          style={{ left: t * PX_PER_TICK }}
        >
          <span className="hv-mark-line" />
          <span className="hv-mark-value">{t}</span>
        </div>
      ))}
    </div>
  );
}
