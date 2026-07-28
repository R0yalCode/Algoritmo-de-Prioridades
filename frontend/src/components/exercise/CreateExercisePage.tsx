import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Play, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import GlassButton from '../ui/GlassButton';
import ProcessTable from './ProcessTable';
import type { ProcessFormData } from '../../types';

function emptyProcess(): ProcessFormData {
  return { id: '', arrivalTime: 0, cpuBurst: 0, priority: 1, ioOperations: [] };
}

export default function CreateExercisePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initial = (location.state as any)?.loadExercise?.processes;
  const [processes, setProcesses] = useState<ProcessFormData[]>(
    initial
      ? initial.map((p: any) => ({
          id: p.id || '',
          arrivalTime: p.arrivalTime ?? 0,
          cpuBurst: p.cpuBurst ?? 10,
          priority: p.priority ?? 1,
          ioOperations: (p.ioOperations || []).map((io: any) => ({
            activationPoint: io.activationPoint ?? 0,
            duration: io.duration ?? 1,
          })),
        }))
      : [emptyProcess()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateProcess = useCallback((idx: number, p: ProcessFormData) => {
    setProcesses((prev) => {
      const copy = [...prev];
      copy[idx] = p;
      return copy;
    });
  }, []);

  const addProcess = useCallback(() => {
    setProcesses((prev) => [...prev, emptyProcess()]);
  }, []);

  const removeProcess = useCallback((idx: number) => {
    setProcesses((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    const payload = processes.map((p, i) => ({
      id: p.id || `P${i + 1}`,
      arrivalTime: p.arrivalTime,
      cpuBurst: p.cpuBurst,
      priority: p.priority,
      ioOperations: p.ioOperations,
    }));
    const res = await api.create(payload);
    if (!res.success) {
      setError(res.error?.message || 'Error al crear la simulación');
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate(`/simulation/${res.data!.simulationId}`, { state: { processes: payload } });
  };

  return (
    <motion.div
      className="create-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="create-header">
        <div className="create-header-left">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div className="create-header-text">
            <h1 className="create-title">Nuevo ejercicio</h1>
            <p className="create-desc">Defina los procesos que participarán en la simulación.</p>
          </div>
        </div>
        <GlassButton variant="primary" icon={<Plus size={16} />} onClick={addProcess}>
          Agregar proceso
        </GlassButton>
      </div>

      {error && (
        <div className="create-error glass">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <ProcessTable
        processes={processes}
        onUpdate={updateProcess}
        onDelete={removeProcess}
      />

      <div className="create-footer">
        <GlassButton variant="ghost" onClick={() => navigate(-1)}>Cancelar</GlassButton>
        <GlassButton variant="primary" icon={<Play size={16} />} onClick={handleCreate} loading={loading}>
          Iniciar simulación
        </GlassButton>
      </div>
    </motion.div>
  );
}
