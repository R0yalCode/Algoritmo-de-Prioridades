import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Search, SlidersHorizontal, LayoutGrid,
  CheckSquare, Trash2, X, Check,
} from 'lucide-react';
import { api } from '../services/api';
import ExerciseCard from '../components/library/ExerciseCard';
import GlassButton from '../components/ui/GlassButton';
import GlassDialog from '../components/ui/GlassDialog';
import Toast from '../components/ui/Toast';
import type { ExerciseInfo, ProcessFormData, ToastData } from '../types';

type SortMode = 'name' | 'nameDesc' | 'newest' | 'oldest';

const sortLabels: Record<SortMode, string> = {
  name: 'Nombre A-Z',
  nameDesc: 'Nombre Z-A',
  newest: 'Más recientes',
  oldest: 'Más antiguos',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Library() {
  const [exercises, setExercises] = useState<ExerciseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const navigate = useNavigate();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewDataRef = useRef<Map<string, ProcessFormData[]>>(new Map());
  const previewLoadingRef = useRef<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 200);

  const filteredAndSorted = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let result = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : [...exercises];

    switch (sort) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'nameDesc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
      case 'oldest':
        result.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        break;
    }
    return result;
  }, [exercises, debouncedSearch, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.listExercises();
    if (res.success && res.data) {
      setExercises(res.data.exercises);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = useCallback(async (id: string) => {
    const res = await api.loadExercise(id);
    if (res.success && res.data) {
      navigate('/create', { state: { loadExercise: res.data } });
    }
  }, [navigate]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const res = await api.deleteExercise(deleteTarget);
    setExercises((prev) => prev.filter((e) => e.id !== deleteTarget));
    setSelected((prev) => { const next = new Set(prev); next.delete(deleteTarget); return next; });
    previewDataRef.current.delete(deleteTarget);
    setDeleteTarget(null);
    if (!res.success) {
      setToast({ id: 'del-err', message: 'Error al eliminar el ejercicio', type: 'error' });
    }
  }, [deleteTarget]);

  const handleBulkDelete = useCallback(() => {
    if (selected.size === 0) return;
    (async () => {
      for (const id of selected) {
        await api.deleteExercise(id);
      }
      setExercises((prev) => prev.filter((e) => !selected.has(e.id)));
      selected.forEach((id) => previewDataRef.current.delete(id));
      setSelected(new Set());
      setToast({ id: 'bulk-del', message: `${selected.size} ejercicio${selected.size !== 1 ? 's' : ''} eliminado${selected.size !== 1 ? 's' : ''}`, type: 'success' });
    })();
  }, [selected]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === filteredAndSorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredAndSorted.map((e) => e.id)));
    }
  }, [filteredAndSorted, selected]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelected(new Set());
      return !prev;
    });
  }, []);

  const loadPreview = useCallback(async (id: string) => {
    if (previewDataRef.current.has(id) || previewLoadingRef.current.has(id)) return;
    previewLoadingRef.current.add(id);
    const res = await api.loadExercise(id);
    previewLoadingRef.current.delete(id);
    if (res.success && res.data) {
      const processes: ProcessFormData[] = (res.data as any).processes.map((p: any) => ({
        id: p.id || '',
        arrivalTime: p.arrivalTime ?? 0,
        cpuBurst: p.cpuBurst ?? 0,
        priority: p.priority ?? 1,
        ioOperations: (p.ioOperations || []).map((io: any) => ({
          activationPoint: io.activationPoint ?? 0,
          duration: io.duration ?? 1,
        })),
      }));
      previewDataRef.current.set(id, processes);
    }
  }, []);

  const handleHover = useCallback((id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredId(id);
      loadPreview(id);
    }, 350);
  }, [loadPreview]);

  const handleHoverEnd = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredId(null);
  }, []);

  const showCount = filteredAndSorted.length;
  const totalCount = exercises.length;
  const hasSelection = selected.size > 0;

  return (
    <motion.div
      className="library-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="library-header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="library-header-info">
          <BookOpen size={20} />
          <h2>Biblioteca de ejercicios</h2>
        </div>
      </div>

      {/* Search + Sort + Selection bar */}
      <div className="lib-toolbar glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="lib-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {loading ? '...' : <><strong>{showCount}</strong> de {totalCount}</>}
          </span>
          <div className="lib-search-wrap" style={{ position: 'relative', flex: 1, minWidth: 140 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="glass-input has-icon"
              type="text"
              placeholder="Buscar ejercicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: '0.85rem' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="lib-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="lib-sort-wrap" style={{ position: 'relative' }}>
            <SlidersHorizontal size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="glass-input has-icon"
              style={{ paddingLeft: 30, paddingRight: 8, fontSize: '0.82rem', cursor: 'pointer', appearance: 'auto' }}
              aria-label="Ordenar por"
            >
              {Object.entries(sortLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <GlassButton
            variant={selectionMode ? 'secondary' : 'ghost'}
            size="sm"
            icon={selectionMode ? <CheckSquare size={14} /> : <LayoutGrid size={14} />}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Salir selección' : 'Seleccionar'}
          </GlassButton>
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            className="glass"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              marginBottom: 16, borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(37,99,235,0.2)',
              background: 'rgba(37,99,235,0.04)',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <button
              onClick={selectAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: 0, fontFamily: 'var(--font)' }}
            >
              <span style={{ display: 'flex', width: 18, height: 18, borderRadius: 4, border: '2px solid var(--border)', alignItems: 'center', justifyContent: 'center', background: selected.size === filteredAndSorted.length && filteredAndSorted.length > 0 ? 'var(--primary)' : 'transparent', borderColor: selected.size === filteredAndSorted.length && filteredAndSorted.length > 0 ? 'var(--primary)' : undefined }}>
                {selected.size === filteredAndSorted.length && filteredAndSorted.length > 0 && <Check size={12} color="white" />}
              </span>
              {selected.size === filteredAndSorted.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
            </span>

            <div style={{ flex: 1 }} />

            {hasSelection && (
              <GlassButton
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={handleBulkDelete}
              >
                Eliminar ({selected.size})
              </GlassButton>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="library-loading">
          <div className="spinner-lg" />
        </div>
      ) : exercises.length === 0 ? (
        <motion.div
          className="glass library-empty"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: 'rgba(37,99,235,0.06)', color: 'var(--primary)', marginBottom: 8 }}>
            <BookOpen size={32} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Biblioteca vacía</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Aún no has guardado ningún ejercicio.<br />
            Simula un algoritmo y guarda los resultados para comenzar tu colección.
          </p>
          <GlassButton variant="primary" onClick={() => navigate('/create')}>Crear ejercicio</GlassButton>
        </motion.div>
      ) : filteredAndSorted.length === 0 ? (
        <motion.div
          className="glass library-empty"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Sin resultados</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            No se encontraron ejercicios que coincidan con "<strong>{search}</strong>".
          </p>
          <GlassButton variant="ghost" onClick={() => setSearch('')}>Limpiar búsqueda</GlassButton>
        </motion.div>
      ) : (
        <div className="library-grid">
          <AnimatePresence mode="popLayout">
            {filteredAndSorted.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                selected={selected.has(ex.id)}
                selectionMode={selectionMode}
                previewData={previewDataRef.current.get(ex.id) || null}
                loadingPreview={previewLoadingRef.current.has(ex.id)}
                previewVisible={hoveredId === ex.id}
                onOpen={() => handleOpen(ex.id)}
                onDelete={() => setDeleteTarget(ex.id)}
                onToggleSelect={() => toggleSelect(ex.id)}
                onHover={() => handleHover(ex.id)}
                onHoverEnd={handleHoverEnd}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <GlassDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar ejercicio"
        message="¿Está seguro de eliminar este ejercicio? Esta acción no puede deshacerse."
        confirmLabel="Eliminar"
        variant="danger"
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </motion.div>
  );
}
