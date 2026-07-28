import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';
import GlassBadge from '../ui/GlassBadge';
import type { SnapshotProcess } from '../../types';

interface Props {
  queue: SnapshotProcess[];
  highlight?: string | null;
}

export default function CPLPanel({ queue, highlight }: Props) {
  return (
    <GlassPanel title="Cola de Procesos Listos" badge={queue.length}>
      <div className="cpl-list">
        <AnimatePresence mode="popLayout">
          {queue.length === 0 ? (
            <motion.p
              key="empty"
              className="panel-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No hay procesos listos
            </motion.p>
          ) : (
            queue.map((p, i) => (
              <motion.div
                key={`${p.id}-${i}`}
                className={`cpl-item glass ${highlight === p.id ? 'highlight' : ''}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <div className="cpl-item-main">
                  <span className="cpl-item-name">{p.id}</span>
                  <GlassBadge>{p.state}</GlassBadge>
                </div>
                <div className="cpl-item-details">
                  <span>Prioridad: {p.priority}</span>
                  {p.remaining !== undefined && <span>CPU restante: {p.remaining}</span>}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </GlassPanel>
  );
}
