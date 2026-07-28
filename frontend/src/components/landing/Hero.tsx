import { motion } from 'framer-motion';
import { Plus, Library, ArrowRight, Cpu } from 'lucide-react';
import GlassButton from '../ui/GlassButton';

interface Props {
  onNewExercise: () => void;
  onLibrary: () => void;
}

export default function Hero({ onNewExercise, onLibrary }: Props) {
  return (
    <motion.section
      className="hero-section"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="hero-badge glass">
        <Cpu size={14} />
        <span>Simulador Educativo v1.0</span>
      </div>

      <h1 className="hero-title">
        Simulador Educativo de
        <br />
        <span className="hero-highlight">Planificación de Procesos CPU</span>
      </h1>

      <p className="hero-subtitle">
        Simulación visual del algoritmo de Prioridades Apropiativo utilizada para
        apoyar el aprendizaje de Sistemas Operativos.
      </p>

      <div className="hero-actions">
        <GlassButton variant="primary" size="lg" icon={<Plus size={18} />} onClick={onNewExercise}>
          Crear nuevo ejercicio
        </GlassButton>
        <GlassButton variant="secondary" size="lg" icon={<Library size={18} />} onClick={onLibrary}>
          Biblioteca de ejercicios
        </GlassButton>
      </div>

      <div className="hero-scroll">
        <ArrowRight size={16} className="scroll-icon" />
        <span>Descubre cómo funciona</span>
      </div>
    </motion.section>
  );
}
