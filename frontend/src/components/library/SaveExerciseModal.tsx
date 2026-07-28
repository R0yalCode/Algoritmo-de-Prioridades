import { useState, useEffect, useCallback } from 'react';
import { Save, FileText, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import GlassModal from '../ui/GlassModal';
import GlassButton from '../ui/GlassButton';
import type { ProcessFormData, ExerciseInfo } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  processes: ProcessFormData[];
  onSaved: () => void;
}

export default function SaveExerciseModal({ open, onClose, processes, onSaved }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingNames, setExistingNames] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
      api.listExercises().then((res) => {
        if (res.success && res.data) {
          setExistingNames(res.data.exercises.map((e: ExerciseInfo) => e.name.toLowerCase()));
        }
      });
    }
  }, [open]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('El nombre es obligatorio'); return; }
    if (trimmed.length < 3) { setError('El nombre debe tener al menos 3 caracteres'); return; }
    if (trimmed.length > 50) { setError('El nombre debe tener máximo 50 caracteres'); return; }
    if (existingNames.includes(trimmed.toLowerCase())) {
      setError('Ya existe un ejercicio con ese nombre');
      return;
    }
    setSaving(true);
    setError('');
    const payload = processes.map((p, i) => ({
      id: p.id || `P${i + 1}`,
      arrivalTime: p.arrivalTime,
      cpuBurst: p.cpuBurst,
      priority: p.priority,
      ioOperations: p.ioOperations,
    }));
    const res = await api.saveExercise(trimmed, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error?.message || 'Error al guardar');
      return;
    }
    onSaved();
    onClose();
  }, [name, processes, existingNames, onSaved, onClose]);

  return (
    <GlassModal open={open} onClose={onClose} title="Guardar ejercicio" width="480px">
      <div className="modal-info">
        <span className="algo-badge">
          <FileText size={14} />
          <span style={{ marginLeft: 6 }}>Priority Scheduling (Preemptive)</span>
        </span>
      </div>

      <div className="input-wrapper">
        <label className="input-label">Nombre del ejercicio</label>
        <div className="input-container">
          <input
            className="glass-input has-icon"
            type="text"
            placeholder="Ej: Práctica 1 - Prioridades"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            maxLength={50}
            autoFocus
          />
        </div>
        <span className="input-hint">3 a 50 caracteres. El nombre debe ser único.</span>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        Se guardarán <strong>{processes.length}</strong> proceso{processes.length !== 1 ? 's' : ''}.
      </div>

      {error && (
        <div className="modal-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="modal-actions">
        <GlassButton variant="ghost" onClick={onClose}>Cancelar</GlassButton>
        <GlassButton variant="primary" icon={<Save size={16} />} onClick={handleSave} loading={saving}>
          Guardar
        </GlassButton>
      </div>
    </GlassModal>
  );
}
