import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { ToastData } from '../../types';

interface Props {
  toast: ToastData | null;
  onDismiss: () => void;
}

const icons = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <CheckCircle2 size={18} />,
};

const colors = {
  success: { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)', icon: '#16a34a' },
  error: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', icon: '#dc2626' },
  info: { bg: 'rgba(37, 99, 235, 0.08)', border: 'rgba(37, 99, 235, 0.25)', icon: '#2563eb' },
};

export default function Toast({ toast, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ToastData | null>(null);

  useEffect(() => {
    if (toast) {
      setCurrent(toast);
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [toast, onDismiss]);

  if (!current) return null;

  const c = colors[current.type];

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 12,
              background: c.bg, border: `1px solid ${c.border}`,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              fontFamily: 'var(--font)', fontSize: '0.9rem',
              color: 'var(--text)', maxWidth: 380,
            }}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <span style={{ display: 'flex', color: c.icon, flexShrink: 0 }}>
              {icons[current.type]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{current.message}</span>
            <button
              onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, border: 'none', background: 'transparent',
                borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)',
                flexShrink: 0,
              }}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
