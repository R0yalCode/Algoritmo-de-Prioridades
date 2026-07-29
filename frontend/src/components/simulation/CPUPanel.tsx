import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';
import type { SnapshotCPU } from '../../types';

interface Props {
  cpu: SnapshotCPU | null | undefined;
}

export default function CPUPanel({ cpu }: Props) {
  const isIdle = !cpu || !cpu.id;
  return (
    <GlassPanel title="CPU" accent={!isIdle}>
      <div className={`cpu-display ${isIdle ? 'idle' : 'busy'}`}>
        {isIdle ? (
          <motion.div
            className="cpu-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key="idle"
          >
            <Cpu size={32} className="cpu-icon-dim" />
            <span className="cpu-idle-text">IDLE</span>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              className="cpu-busy"
              key={cpu.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
            >
              <Cpu size={24} className="cpu-icon-active" />
              <span className="cpu-process-name">{cpu.id}</span>
              <span className="cpu-status">{cpu.status}</span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </GlassPanel>
  );
}
