import type { CPUTimelineEntry } from '../../types';
import { PX_PER_TICK } from './layout';

/**
 * CPU como diagrama de Gantt real.
 *
 * Cada bloque se dibuja con el ancho que indica `duration`, en el orden de
 * `cpuTimeline`. Los bloques son contiguos, así que el borde izquierdo de cada
 * uno cae exactamente sobre su `start` en la escala temporal.
 */

interface Props {
  blocks: CPUTimelineEntry[];
  currentTime: number;
  totalTime: number;
  colorOf: (processId: string) => string;
}

export default function CPUGanttRow({ blocks, currentTime, totalTime, colorOf }: Props) {
  return (
    <div className="hv-track hv-track-cpu" style={{ width: totalTime * PX_PER_TICK }}>
      {blocks.map((block) => (
        <div
          key={`${block.processId ?? 'idle'}-${block.start}`}
          className="hv-gantt"
          data-idle={block.idle || undefined}
          data-current={
            block.start <= currentTime && currentTime < block.end ? 'true' : undefined
          }
          style={{
            width: block.duration * PX_PER_TICK,
            backgroundColor: block.idle ? undefined : colorOf(block.processId ?? ''),
          }}
          title={
            `${block.idle ? 'CPU ociosa' : block.processId}` +
            `\n[${block.start}, ${block.end}) · ${block.duration} ms`
          }
        >
          <span className="hv-gantt-label">
            {block.idle ? 'ociosa' : block.processId}
          </span>
        </div>
      ))}

      <div
        className="hv-playhead-band"
        style={{ left: currentTime * PX_PER_TICK, width: PX_PER_TICK }}
      />
      <div className="hv-playhead" style={{ left: currentTime * PX_PER_TICK }} />
    </div>
  );
}
