import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import CpuChip from '../chips/CpuChip';
import DurationChip from '../chips/DurationChip';

interface Props {
  activationPoint: number;
  duration: number;
  onDelete: () => void;
}

export default function IOCard({ activationPoint, duration, onDelete }: Props) {
  return (
    <motion.div
      className="glass io-card-mini"
      layout
      initial={{ opacity: 0, x: -16, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="io-card-mini-body">
        <CpuChip value={activationPoint} />
        <DurationChip value={duration} />
      </div>
      <button className="io-card-mini-del" onClick={onDelete} aria-label="Eliminar operación">
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}
