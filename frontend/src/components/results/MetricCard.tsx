import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  delay?: number;
}

export default function MetricCard({ icon, label, value, color, delay = 0 }: Props) {
  return (
    <motion.div
      className="metric-card glass"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="metric-icon" style={{ backgroundColor: `${color}15`, color }}>
        {icon}
      </div>
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value}</span>
      </div>
    </motion.div>
  );
}
