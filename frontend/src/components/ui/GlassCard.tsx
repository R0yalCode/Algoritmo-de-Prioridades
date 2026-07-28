import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const paddings = { sm: 'p-3', md: 'p-5', lg: 'p-7' };

export default function GlassCard({ children, hover = false, padding = 'md', className = '', style, onClick }: Props) {
  return (
    <motion.div
      className={`glass rounded-2xl ${paddings[padding]} ${hover ? 'card-hover' : ''} ${className}`}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
