import { motion } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';
import type { GanttBlock } from '../../types';

interface Props {
  blocks: GanttBlock[];
}

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#14b8a6',
];

export default function GanttChart({ blocks }: Props) {
  if (blocks.length === 0) return null;

  const total = blocks[blocks.length - 1]?.end || 1;
  const pids = [...new Set(blocks.map((b) => b.processId).filter((id) => id !== 'IDLE'))];
  const colorMap: Record<string, string> = {};
  pids.forEach((pid, i) => { colorMap[pid] = PALETTE[i % PALETTE.length]; });

  const canShowLabels = blocks.every((b) => ((b.end - b.start) / total) * 100 > 8);

  return (
    <GlassPanel title="Diagrama de Gantt">
      <div className="gantt">
        <div className="gantt-rows">
          {pids.map((pid) => (
            <div key={pid} className="gantt-row">
              <span className="gantt-row-label">{pid}</span>
              <div className="gantt-row-track">
                {blocks
                  .filter((b) => b.processId === pid)
                  .map((b, i) => {
                    const left = (b.start / total) * 100;
                    const width = ((b.end - b.start) / total) * 100;
                    return (
                      <motion.div
                        key={i}
                        className="gantt-block"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 1.5)}%`,
                          backgroundColor: colorMap[pid],
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(width, 1.5)}%` }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        title={`${pid}: ${b.start} - ${b.end} (${b.end - b.start} ms)`}
                      >
                        {canShowLabels && (
                          <span className="gantt-block-label">{b.end - b.start}</span>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className="gantt-scale">
          {[0, Math.floor(total / 2), total].map((t) => (
            <span key={t} className="gantt-scale-mark">{t}</span>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
