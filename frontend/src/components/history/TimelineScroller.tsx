import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Una línea histórica con su propio desplazamiento horizontal.
 *
 * Cada fila se desplaza de forma independiente, así que ninguna se oculta al
 * recorrer otra. La etiqueta queda fuera del área desplazable y siempre
 * visible. Los hijos comparten un único viewport: se usa para agrupar CPU y
 * escala temporal, que deben permanecer alineadas entre sí.
 *
 * Desplazamiento por barra nativa, Shift + rueda, arrastre y botones.
 * Nunca se desplaza por su cuenta: el scroll solo lo mueve el usuario.
 */

const BUTTON_STEP = 260;
const DRAG_THRESHOLD = 3;

interface Props {
  title: string;
  sub?: string;
  hint?: string;
  children: React.ReactNode;
}

export default function TimelineScroller({ title, sub, hint, children }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ pointerId: -1, startX: 0, startLeft: 0, moved: false });
  const [edges, setEdges] = useState({ start: true, end: false, overflowing: false });

  const syncEdges = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft <= 1,
      end: max <= 1 || el.scrollLeft >= max - 1,
      overflowing: max > 1,
    });
  }, []);

  useEffect(() => {
    syncEdges();
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.shiftKey ? e.deltaY || e.deltaX : e.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [syncEdges, children]);

  const nudge = useCallback((dx: number) => {
    viewportRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = viewportRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.current.moved = true;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = 'true';
    }
    el.scrollLeft = drag.current.startLeft - dx;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el || drag.current.pointerId !== e.pointerId) return;
    if (drag.current.moved && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    delete el.dataset.dragging;
    drag.current.pointerId = -1;
  }, []);

  return (
    <div className="hv-line">
      <div className="hv-row-label">
        <span className="hv-row-title">{title}</span>
        {sub && <span className="hv-row-sub">{sub}</span>}
        {hint && <span className="hv-row-hint">{hint}</span>}
      </div>

      <button
        type="button"
        className="hv-scroll-btn"
        onClick={() => nudge(-BUTTON_STEP)}
        disabled={edges.start}
        data-hidden={edges.overflowing ? undefined : 'true'}
        aria-label={`Desplazar ${title} a la izquierda`}
      >
        <ChevronLeft size={16} />
      </button>

      <div
        className="hv-viewport"
        ref={viewportRef}
        data-overflow={edges.overflowing ? 'true' : undefined}
        onScroll={syncEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="hv-tracks">{children}</div>
      </div>

      <button
        type="button"
        className="hv-scroll-btn"
        onClick={() => nudge(BUTTON_STEP)}
        disabled={edges.end}
        data-hidden={edges.overflowing ? undefined : 'true'}
        aria-label={`Desplazar ${title} a la derecha`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
