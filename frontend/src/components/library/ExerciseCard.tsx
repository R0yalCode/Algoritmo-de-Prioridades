import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Trash2, Copy, Check, FileText, Loader2 } from 'lucide-react';
import type { ExerciseInfo, ProcessFormData } from '../../types';

interface Props {
  exercise: ExerciseInfo;
  selected: boolean;
  selectionMode: boolean;
  previewData: ProcessFormData[] | null;
  loadingPreview: boolean;
  previewVisible: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onToggleSelect: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

const pastels = [
  { bg: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' },
  { bg: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed' },
  { bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2' },
  { bg: 'rgba(34, 197, 94, 0.08)', color: '#16a34a' },
  { bg: 'rgba(245, 158, 11, 0.08)', color: '#d97706' },
  { bg: 'rgba(236, 72, 153, 0.08)', color: '#db2777' },
];

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExerciseCard({
  exercise, selected, selectionMode, previewData, loadingPreview, previewVisible,
  onOpen, onDelete, onDuplicate, onToggleSelect, onHover, onHoverEnd,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    if (previewVisible && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPopoverPos(spaceBelow < 320 ? 'top' : 'bottom');
    }
  }, [previewVisible]);

  const colorIdx = hashCode(exercise.id || exercise.name) % pastels.length;
  const pastel = pastels[colorIdx];

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: 'relative' }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <motion.div
        className={`glass rounded-2xl p-5 ${selected ? 'ring-2 ring-primary' : ''}`}
        style={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: selected ? '0 8px 32px rgba(37,99,235,0.10)' : undefined,
          borderColor: selected ? 'rgba(37,99,235,0.3)' : undefined,
        }}
        whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.07)' }}
        onClick={selectionMode ? onToggleSelect : onOpen}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 6, border: '2px solid var(--border)',
                background: selected ? 'var(--primary)' : 'transparent',
                borderColor: selected ? 'var(--primary)' : undefined,
                flexShrink: 0, marginTop: 2,
              }}
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            >
              {selected && <Check size={14} color="white" />}
            </motion.div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 12,
                  background: pastel.bg, color: pastel.color,
                  flexShrink: 0,
                }}
              >
                <FolderOpen size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exercise.name}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <span
                className="badge badge-default"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <FileText size={11} />
                {exercise.processCount ?? '?'} proceso{exercise.processCount !== 1 ? 's' : ''}
              </span>
              {exercise.createdAt && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDate(exercise.createdAt)}
                </span>
              )}
            </div>

            <div
              className="exercise-card-actions"
              style={{ marginTop: 14, justifyContent: 'flex-start', gap: 6 }}
            >
              <motion.button
                className="ex-action-btn open"
                onClick={(e) => { e.stopPropagation(); onOpen(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Abrir ejercicio"
              >
                <FolderOpen size={13} />
                <span>Abrir</span>
              </motion.button>
              {onDuplicate && (
                <motion.button
                  className="ex-action-btn dup"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Duplicar"
                >
                  <Copy size={13} />
                </motion.button>
              )}
              <motion.button
                className="ex-action-btn del"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Eliminar ejercicio"
              >
                <Trash2 size={13} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {previewVisible && (
        <div
          style={{
            position: 'absolute',
            [popoverPos === 'bottom' ? 'top' : 'bottom']: '100%',
            left: '50%', transform: 'translateX(-50%)',
            [popoverPos === 'bottom' ? 'marginTop' : 'marginBottom']: 8,
            zIndex: 100, minWidth: 340, maxWidth: 400,
          }}
        >
          <motion.div
            className="glass"
            style={{
              padding: 16, borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.96)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
            }}
            initial={{ opacity: 0, y: popoverPos === 'bottom' ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>
              {exercise.name}
            </div>

            {loadingPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={16} className="spinning" />
                <span>Cargando...</span>
              </div>
            ) : previewData && previewData.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.7rem' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Proceso</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 500 }}>Llegada</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 500 }}>Ráfaga</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 500 }}>Prioridad</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 500 }}>E/S</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((p, i) => (
                    <tr key={p.id || i} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '6px 6px', fontWeight: 600, color: 'var(--text)' }}>{p.id || `P${i + 1}`}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{p.arrivalTime}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{p.cpuBurst}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{p.priority}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {p.ioOperations.length > 0 ? `${p.ioOperations.length}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 5 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        +{previewData.length - 5} proceso{previewData.length - 5 !== 1 ? 's' : ''} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Sin datos disponibles
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
