import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';
import type { SnapshotProcess } from '../../types';

interface Props {
  queue: SnapshotProcess[];
}

export default function IOQueuePanel({ queue }: Props) {
  return (
    <GlassPanel title="Entrada / Salida" badge={queue.length}>
      <div className="io-queue-list">
        <AnimatePresence mode="popLayout">
          {queue.length === 0 ? (
            <motion.p
              key="empty"
              className="panel-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Sin operaciones de E/S
            </motion.p>
          ) : (
            queue.map((p, i) => (
              <motion.div
                key={`${p.id}-${i}`}
                className="io-queue-item glass"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <div className="io-queue-main">
                  <span className="io-queue-name">{p.id}</span>
                  <span className="io-queue-state">BLOQUEADO</span>
                </div>
                {p.remaining !== undefined && (
                  <div className="io-progress-bar">
                    <motion.div
                      className="io-progress-fill"
                      initial={{ width: '100%' }}
                      animate={{ width: `${Math.max(0, (p.remaining / 10) * 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </GlassPanel>
  );
}
