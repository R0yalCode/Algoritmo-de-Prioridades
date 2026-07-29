import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';

interface Props {
  currentIdx: number;
  total: number;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  playState: 'stopped' | 'playing' | 'paused';
  speed: number;
  onSpeedChange: (s: number) => void;
}

export default function SimulationControls({
  currentIdx, total, onStepBack, onStepForward, onPlay, onPause, onReset,
  playState, speed, onSpeedChange,
}: Props) {
  return (
    <GlassPanel>
      <div className="sim-controls">
        <div className="controls-left">
          <motion.button
            className="ctrl-btn"
            onClick={onReset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Reiniciar"
          >
            <RotateCcw size={18} />
          </motion.button>
          <motion.button
            className="ctrl-btn"
            onClick={onStepBack}
            disabled={currentIdx <= 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Paso anterior"
          >
            <SkipBack size={18} />
          </motion.button>

          {playState === 'playing' ? (
            <motion.button
              className="ctrl-btn ctrl-play"
              onClick={onPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Pausar"
            >
              <Pause size={20} />
            </motion.button>
          ) : (
            <motion.button
              className="ctrl-btn ctrl-play"
              onClick={onPlay}
              disabled={currentIdx >= total - 1}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Reproducir"
            >
              <Play size={20} />
            </motion.button>
          )}

          <motion.button
            className="ctrl-btn"
            onClick={onStepForward}
            disabled={currentIdx >= total - 1}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Paso siguiente"
          >
            <SkipForward size={18} />
          </motion.button>
        </div>

        <div className="controls-center">
          <span className="step-info">Paso {currentIdx + 1} / {total}</span>
        </div>

        <div className="controls-right">
          <label className="speed-label">Velocidad</label>
          <div className="speed-btns">
            {[0.5, 1, 2, 4].map((v) => (
              <motion.button
                key={v}
                className={`speed-btn ${speed === v ? 'active' : ''}`}
                onClick={() => onSpeedChange(v)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {v}x
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
