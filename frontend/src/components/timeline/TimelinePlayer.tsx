import { motion } from 'framer-motion';
import { SkipBack, Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface Props {
  currentIdx: number;
  total: number;
  currentTime: number;
  playState: 'stopped' | 'playing' | 'paused';
  speed: number;
  onGoToStart: () => void;
  onStepBack: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onGoToEnd: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (ratio: number) => void;
}

const SPEEDS = [0.5, 1, 2, 3];

export default function TimelinePlayer({
  currentIdx, total, currentTime, playState, speed,
  onGoToStart, onStepBack, onPlay, onPause, onStepForward, onGoToEnd,
  onSpeedChange, onSeek,
}: Props) {
  const progress = total > 1 ? currentIdx / (total - 1) : 0;

  return (
    <div className="timeline-player glass">
      <div className="tl-player-controls">
        <button className="tl-ctrl-btn" onClick={onGoToStart} disabled={currentIdx <= 0} aria-label="Ir al inicio">
          <RotateCcw size={16} />
        </button>
        <button className="tl-ctrl-btn" onClick={onStepBack} disabled={currentIdx <= 0} aria-label="Paso anterior">
          <SkipBack size={18} />
        </button>
        {playState === 'playing' ? (
          <button className="tl-ctrl-btn tl-ctrl-play" onClick={onPause} aria-label="Pausar">
            <Pause size={20} />
          </button>
        ) : (
          <button className="tl-ctrl-btn tl-ctrl-play" onClick={onPlay} disabled={currentIdx >= total - 1} aria-label="Reproducir">
            <Play size={20} />
          </button>
        )}
        <button className="tl-ctrl-btn" onClick={onStepForward} disabled={currentIdx >= total - 1} aria-label="Paso siguiente">
          <SkipForward size={18} />
        </button>
        <button className="tl-ctrl-btn" onClick={onGoToEnd} disabled={currentIdx >= total - 1} aria-label="Ir al final">
          <RotateCcw size={16} style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>

      <div className="tl-player-progress">
        <div className="tl-progress-track" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek((e.clientX - rect.left) / rect.width);
        }}>
          <div className="tl-progress-rail" />
          <motion.div className="tl-progress-fill" style={{ width: `${progress * 100}%` }} layout />
          <motion.div className="tl-progress-thumb" style={{ left: `${progress * 100}%` }} layout />
        </div>
        <div className="tl-progress-info">
          <span className="tl-time">t = {currentTime} ms</span>
          <span className="tl-step">Paso {currentIdx + 1} / {total}</span>
        </div>
      </div>

      <div className="tl-player-speed">
        <span className="tl-speed-label">Vel:</span>
        <div className="tl-speed-btns">
          {SPEEDS.map((v) => (
            <button
              key={v}
              className={`tl-speed-btn ${speed === v ? 'active' : ''}`}
              onClick={() => onSpeedChange(v)}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
