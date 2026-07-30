import {
  SkipBack, SkipForward, ChevronLeft, ChevronRight, Play, Pause,
} from 'lucide-react';
import type { EventTimelineEntry } from '../../types';
import type { PlayState } from '../../hooks/useHistory';
import { EVENT_LABEL } from './layout';

/**
 * Controles de reproducción sobre el modelo histórico: el cursor avanza y
 * retrocede exactamente un evento de `eventTimeline`.
 */

const SPEEDS = [0.5, 1, 1.5, 2, 3];

interface Props {
  cursor: number;
  totalEvents: number;
  currentTime: number;
  currentEvent: EventTimelineEntry | null;
  playState: PlayState;
  speed: number;
  onGoToStart: () => void;
  onStepBack: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onGoToEnd: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

export default function TimelineToolbar({
  cursor, totalEvents, currentTime, currentEvent, playState, speed,
  onGoToStart, onStepBack, onPlay, onPause, onStepForward, onGoToEnd,
  onSpeedChange, onSeek,
}: Props) {
  const atStart = cursor <= 0;
  const atEnd = totalEvents === 0 || cursor >= totalEvents - 1;

  return (
    <div className="hv-toolbar">
      <div className="hv-transport">
        <button
          type="button" className="hv-btn" onClick={onGoToStart} disabled={atStart}
          title="Ir al inicio" aria-label="Ir al inicio"
        >
          <SkipBack size={16} />
        </button>
        <button
          type="button" className="hv-btn" onClick={onStepBack} disabled={atStart}
          title="Evento anterior" aria-label="Evento anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button" className="hv-btn hv-btn-primary" onClick={onPlay}
          disabled={atEnd || playState === 'playing'}
          title="Reproducir" aria-label="Reproducir"
        >
          <Play size={18} />
        </button>
        <button
          type="button" className="hv-btn" onClick={onPause}
          disabled={playState !== 'playing'}
          title="Pausar" aria-label="Pausar"
        >
          <Pause size={18} />
        </button>
        <button
          type="button" className="hv-btn" onClick={onStepForward} disabled={atEnd}
          title="Evento siguiente" aria-label="Evento siguiente"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button" className="hv-btn" onClick={onGoToEnd} disabled={atEnd}
          title="Ir al final" aria-label="Ir al final"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="hv-progress">
        <input
          type="range"
          className="hv-range"
          min={0}
          max={Math.max(0, totalEvents - 1)}
          value={cursor}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Posición en el historial"
        />
        <div className="hv-progress-meta">
          <span className="hv-readout">t = {currentTime} ms</span>
          <span className="hv-event-now">
            {currentEvent
              ? `${EVENT_LABEL[currentEvent.type] ?? currentEvent.type}` +
                `${currentEvent.processId ? ` · ${currentEvent.processId}` : ''}`
              : 'Sin eventos'}
          </span>
          <span className="hv-counter">
            evento {totalEvents === 0 ? 0 : cursor + 1} / {totalEvents}
          </span>
        </div>
      </div>

      <div className="hv-speeds" role="group" aria-label="Velocidad">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className="hv-speed"
            data-active={speed === value ? 'true' : undefined}
            onClick={() => onSpeedChange(value)}
          >
            {value}x
          </button>
        ))}
      </div>
    </div>
  );
}
