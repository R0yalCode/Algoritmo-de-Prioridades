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

export default function ResultsGantt({ blocks }: Props) {
  if (blocks.length === 0) return null;

  const total = blocks[blocks.length - 1]?.end || 1;
  const pids = [...new Set(blocks.map((b) => b.processId).filter((id) => id !== 'IDLE'))];
  const colorMap: Record<string, string> = {};
  pids.forEach((pid, i) => { colorMap[pid] = PALETTE[i % PALETTE.length]; });

  return (
    <GlassPanel title="Diagrama de Gantt">
      <div className="gantt-results">
        <div className="gantt-header">
          <span className="gantt-header-label">Proceso</span>
          <div className="gantt-header-scale">
            {Array.from({ length: Math.min(total + 1, 11) }, (_, i) => {
              const t = Math.round((i * total) / Math.min(total, 10));
              return <span key={t} className="gantt-header-time">{t}</span>;
            })}
          </div>
        </div>
        {pids.map((pid) => {
          const procBlocks = blocks.filter((b) => b.processId === pid);
          return (
            <div key={pid} className="gantt-row">
              <span className="gantt-row-label">{pid}</span>
              <div className="gantt-row-track">
                {procBlocks.map((b, i) => {
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
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      title={`${pid}: ${b.start} - ${b.end} (${b.end - b.start} ms)`}
                    >
                      <span className="gantt-block-label">{b.end - b.start}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="gantt-footer">
          <span className="gantt-footer-start">0</span>
          <span className="gantt-footer-end">{total}</span>
        </div>
      </div>
    </GlassPanel>
  );
}
