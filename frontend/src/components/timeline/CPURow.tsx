import type { GanttBlock } from '../../types';

interface Props {
  blocks: GanttBlock[];
  totalTime: number;
  currentTime: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const CPU_SCALE = 20;

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#14b8a6',
];

export default function CPURow({ blocks, totalTime, currentTime, scrollRef, onScroll }: Props) {
  if (blocks.length === 0) return null;

  const pids = [...new Set(blocks.map((b) => b.processId).filter((id) => id !== 'IDLE'))];
  const colorMap: Record<string, string> = {};
  pids.forEach((pid, i) => { colorMap[pid] = PALETTE[i % PALETTE.length]; });

  const totalPx = Math.max(totalTime * CPU_SCALE, 100);
  const showLabelWidth = CPU_SCALE * 2;

  const timeMarks: number[] = [];
  const step = totalTime <= 30 ? 1 : totalTime <= 60 ? 2 : 5;
  for (let t = 0; t <= totalTime; t += step) {
    timeMarks.push(t);
  }
  if (timeMarks[timeMarks.length - 1] !== totalTime) {
    timeMarks.push(totalTime);
  }

  return (
    <div className="tl-row-container tl-cpu-row-container">
      <div className="tl-row-label">CPU</div>
      <div className="tl-scroll-area" ref={scrollRef} onScroll={onScroll}>
        <div className="tl-cpu-inner" style={{ width: totalPx }}>
          <div className="tl-cpu-track">
            {blocks.map((b, i) => {
              const left = (b.start / totalTime) * totalPx;
              const w = Math.max(((b.end - b.start) / totalTime) * totalPx, 2);
              const isCurrent = b.start <= currentTime && b.end > currentTime;
              const color = b.processId === 'IDLE'
                ? '#e2e8f0'
                : (colorMap[b.processId] || '#94a3b8');
              return (
                <div
                  key={i}
                  className={`tl-cpu-block ${isCurrent ? 'current' : ''}`}
                  style={{ left, width: w, backgroundColor: color }}
                  title={`${b.processId}: ${b.start}–${b.end}`}
                >
                  {w >= showLabelWidth && (
                    <span className="tl-cpu-block-label">{b.processId}</span>
                  )}
                </div>
              );
            })}
            <div
              className="tl-cpu-now"
              style={{ left: `${(currentTime / totalTime) * totalPx}px` }}
            />
          </div>
          <div className="tl-cpu-times">
            {timeMarks.map((t) => (
              <span
                key={t}
                className="tl-cpu-mark"
                style={{ left: `${(t / totalTime) * totalPx}px` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
