"""PedagogicalHistoryBuilder: adaptador Snapshot -> SimulationHistory.

Responsabilidad única: transformar información ya calculada por el motor en una
representación histórica estable para el frontend.

NO ejecuta algoritmos, NO planifica, NO decide prioridades, NO modifica estados
y NO altera la simulación. Solo lee snapshots y eventos, y acumula copias
escalares de esa información (nunca referencias a objetos del motor).

Fuentes de cada línea de tiempo, todas lecturas directas:

  readyTimeline  colas del snapshot (READY/BLOCKED/TERMINATED) + evento
                 CPU_EXECUTION del tick (RUNNING).
  cpuTimeline    eventos CPU_EXECUTION / CPU_IDLE, un tick por evento,
                 fusionando bloques contiguos igual que el Gantt del motor.
  ioTimeline     eventos IO_START / IO_COMPLETE, un bloque por operación.
  eventTimeline  el registro de eventos completo, en orden cronológico.

Los nombres de eventos y estados son los del contrato documentado
(docs/11_eventos.md, docs/03_modelo_temporal.md) y se comparan como texto: el
paquete no importa los enums del motor.

Regla de apariciones (readyTimeline)
-------------------------------------
Un proceso puede tener varias apariciones históricas a lo largo de la
simulación. Cada aparición es una entrada independiente en `ready_timeline`,
con su propio `visual_index` y `first_appearance`, fijos mientras esa
aparición está vigente:

  Llegada (PROCESS_ARRIVAL)  abre una aparición nueva.
  Apropiación                NO abre una aparición nueva: el proceso vuelve a
                              READY dentro de la misma aparición vigente.
  Retorno de E/S (IO_COMPLETE) abre una aparición nueva. Es, junto con la
                              llegada, la única situación que crea una entrada
                              nueva.

Una aparición deja de recibir observaciones exactamente en el tick en que se
abre la siguiente aparición del mismo proceso: su último estado observado
(normalmente BLOCKED) queda fijo, y esa tarjeta permanece en la historia sin
volver a actualizarse. El frontend la sigue mostrando (nunca se elimina), solo
con apariencia "histórica" en vez de "activa".
"""

from typing import Any, Optional, Sequence

from src.history.models import (
    CPUTimelineEntry,
    EventTimelineEntry,
    IOTimelineEntry,
    ReadyStateObservation,
    ReadyTimelineEntry,
    SimulationHistory,
)
from src.history.ports import (
    EventView,
    HistoryBuilder,
    ProcessView,
    SnapshotView,
)
from src.history.tracking import (
    STATE_BLOCKED,
    STATE_READY,
    STATE_RUNNING,
    STATE_TERMINATED,
    IOBlockDraft,
    ObservationDraft,
    ProcessTrack,
)

EVENT_PROCESS_ARRIVAL = "PROCESS_ARRIVAL"
EVENT_CPU_EXECUTION = "CPU_EXECUTION"
EVENT_CPU_IDLE = "CPU_IDLE"
EVENT_IO_START = "IO_START"
EVENT_IO_COMPLETE = "IO_COMPLETE"


def _as_text(value: Any) -> str:
    """Normaliza enums del motor a texto plano, sin acoplarse a su tipo."""
    return str(getattr(value, "value", value))


class PedagogicalHistoryBuilder(HistoryBuilder):
    def __init__(self) -> None:
        self._appearance_counter: int = 0
        # Última aparición vigente de cada proceso: la que recibe las
        # observaciones de los ticks mientras no se abra una aparición nueva.
        self._current_appearance: dict[str, ProcessTrack] = {}
        # Todas las apariciones que existieron, en el orden en que se
        # crearon. Ese orden es, por construcción, el orden visual final.
        self._all_appearances: list[ProcessTrack] = []
        self._events: list[EventTimelineEntry] = []
        self._io_blocks: list[IOBlockDraft] = []
        self._open_io: dict[str, IOBlockDraft] = {}
        self._cpu_ticks: list[tuple[int, Optional[str]]] = []
        self._observed_ticks: int = 0
        self._last_observed_time: int = 0

    def reset(self) -> None:
        self._appearance_counter = 0
        self._current_appearance.clear()
        self._all_appearances.clear()
        self._events.clear()
        self._io_blocks.clear()
        self._open_io.clear()
        self._cpu_ticks.clear()
        self._observed_ticks = 0
        self._last_observed_time = 0

    def observe_initial_state(self, snapshot: SnapshotView) -> None:
        # El snapshot inicial (t=0) se construye antes de procesar las
        # llegadas del primer tick, así que sus tres colas están siempre
        # vacías: no hay ninguna aparición que abrir todavía.
        self._last_observed_time = snapshot.time

    def observe_tick(
        self, snapshot: SnapshotView, events: Sequence[EventView]
    ) -> None:
        tick = snapshot.time - 1
        running_id = self._absorb_events(events, tick)
        self._cpu_ticks.append((tick, running_id))
        self._absorb_snapshot(snapshot, tick, running_id)
        self._observed_ticks += 1
        self._last_observed_time = snapshot.time

    def build(self) -> SimulationHistory:
        for track in self._all_appearances:
            track.resolve()
        return SimulationHistory(
            ready_timeline=self._build_ready_timeline(),
            io_timeline=self._build_io_timeline(),
            cpu_timeline=self._build_cpu_timeline(),
            event_timeline=self._build_event_timeline(),
        )

    # --- Estado interno acumulativo (consultas de solo lectura) ---

    @property
    def observed_ticks(self) -> int:
        return self._observed_ticks

    @property
    def last_observed_time(self) -> int:
        return self._last_observed_time

    @property
    def observed_event_count(self) -> int:
        return len(self._events)

    def visual_index_of(self, process_id: str) -> int | None:
        """visual_index de la aparición vigente (la más reciente) del proceso."""
        track = self._current_appearance.get(process_id)
        return track.visual_index if track else None

    def first_appearance_of(self, process_id: str) -> int | None:
        """first_appearance de la aparición vigente (la más reciente) del proceso."""
        track = self._current_appearance.get(process_id)
        return track.first_appearance if track else None

    def known_process_ids(self) -> list[str]:
        """Identificadores únicos, en el orden de su primera aparición."""
        seen: set[str] = set()
        ordered: list[str] = []
        for track in self._all_appearances:
            if track.process_id not in seen:
                seen.add(track.process_id)
                ordered.append(track.process_id)
        return ordered

    def appearance_count_of(self, process_id: str) -> int:
        return sum(1 for t in self._all_appearances if t.process_id == process_id)

    # --- Absorción ---

    def _absorb_events(
        self, events: Sequence[EventView], tick: int
    ) -> Optional[str]:
        """Registra los eventos del tick y devuelve el proceso que ocupó la CPU."""
        running_id: Optional[str] = None
        for event in events:
            event_type = _as_text(event.type)
            self._events.append(EventTimelineEntry(
                time=event.time,
                type=event_type,
                process_id=event.process_id,
                description=event.description,
                reason=getattr(event, "reason", ""),
            ))

            if event.process_id is None:
                continue
            if event_type == EVENT_PROCESS_ARRIVAL:
                self._begin_appearance(event.process_id, event.time)
            elif event_type == EVENT_CPU_EXECUTION:
                running_id = event.process_id
            elif event_type == EVENT_IO_START:
                self._open_io_block(event.process_id, event.time)
            elif event_type == EVENT_IO_COMPLETE:
                self._close_io_block(event.process_id, event.time)
                self._begin_appearance(event.process_id, event.time)
        return running_id

    def _absorb_snapshot(
        self, snapshot: SnapshotView, tick: int, running_id: Optional[str]
    ) -> None:
        ready_positions = {p.id: i for i, p in enumerate(snapshot.ready_queue)}
        views: dict[str, ProcessView] = {}
        for process in self._snapshot_processes(snapshot):
            views[process.id] = process

        for process_id, track in self._current_appearance.items():
            state = self._state_of(process_id, running_id, snapshot, ready_positions, track)
            if state is None:
                continue
            draft = ObservationDraft(
                time=tick,
                state=state,
                active=state == STATE_READY,
                ready_position=ready_positions.get(process_id),
                ran=process_id == running_id,
            )
            view = views.get(process_id)
            if view is not None:
                draft.apply(
                    priority=view.priority,
                    remaining_cpu=view.remaining_cpu,
                    executed_cpu=view.executed_cpu,
                    fifo_order=view.fifo_order,
                    exact=True,
                )
            track.drafts.append(draft)

    def _state_of(
        self,
        process_id: str,
        running_id: Optional[str],
        snapshot: SnapshotView,
        ready_positions: dict[str, int],
        track: ProcessTrack,
    ) -> Optional[str]:
        """Estado del proceso durante el tick, leído del motor.

        El orden de precedencia refleja el ciclo del tick: quien ejecutó ocupó
        la CPU durante todo el intervalo, aunque al cerrarlo pasara a BLOCKED o
        TERMINATED.
        """
        if process_id == running_id:
            return STATE_RUNNING
        if any(p.id == process_id for p in snapshot.blocked_queue):
            return STATE_BLOCKED
        if any(p.id == process_id for p in snapshot.terminated_processes):
            return STATE_TERMINATED
        if process_id in ready_positions:
            return STATE_READY
        if track.drafts:
            return track.drafts[-1].state
        return None

    def _snapshot_processes(self, snapshot: SnapshotView) -> list[ProcessView]:
        return [
            *snapshot.ready_queue,
            *snapshot.blocked_queue,
            *snapshot.terminated_processes,
        ]

    def _begin_appearance(self, process_id: str, time: int) -> ProcessTrack:
        """Abre una aparición nueva y la deja como la vigente del proceso.

        La aparición anterior (si existía) deja de recibir observaciones a
        partir de este momento: queda fija en su último estado conocido.
        """
        track = ProcessTrack(
            process_id=process_id,
            visual_index=self._appearance_counter,
            first_appearance=time,
        )
        self._appearance_counter += 1
        self._current_appearance[process_id] = track
        self._all_appearances.append(track)
        return track

    def _open_io_block(self, process_id: str, time: int) -> None:
        # La E/S nunca abre una aparición nueva: se registra contra la que
        # está vigente en este momento (docs/13_historia_pedagogica.md,
        # Caso 2 — "la aparición histórica activa termina" en el sentido
        # visual, no en el sentido de identidad de la entrada).
        track = self._current_appearance.get(process_id)
        block = IOBlockDraft(
            process_id=process_id,
            source_tick=time,
            start=time + 1,
            track=track,
        )
        self._open_io[process_id] = block
        self._io_blocks.append(block)

    def _close_io_block(self, process_id: str, time: int) -> None:
        block = self._open_io.pop(process_id, None)
        if block is not None:
            block.close(time)

    # --- Construcción ---

    def _build_ready_timeline(self) -> list[ReadyTimelineEntry]:
        return [
            ReadyTimelineEntry(
                process_id=track.process_id,
                priority=track.known_priority(),
                first_appearance=track.first_appearance,
                visual_index=track.visual_index,
                history=[self._to_observation(d) for d in track.drafts],
            )
            for track in self._all_appearances
        ]

    def _to_observation(self, draft: ObservationDraft) -> ReadyStateObservation:
        return ReadyStateObservation(
            time=draft.time,
            state=draft.state,
            active=draft.active,
            priority=draft.priority or 0,
            remaining_cpu=draft.remaining_cpu or 0,
            executed_cpu=draft.executed_cpu or 0,
            fifo_order=draft.fifo_order or 0,
            ready_position=draft.ready_position,
        )

    def _build_io_timeline(self) -> list[IOTimelineEntry]:
        entries: list[IOTimelineEntry] = []
        for block in self._io_blocks:
            track = block.track
            draft = track.draft_at(block.source_tick) if track else None
            entries.append(IOTimelineEntry(
                process_id=block.process_id,
                start=block.start,
                end=block.end,
                priority=(draft.priority if draft else None) or 0,
                remaining_cpu=(draft.remaining_cpu if draft else None) or 0,
                visual_index=track.visual_index if track else 0,
                completed=block.completed,
            ))
        entries.sort(key=lambda e: (e.start, e.visual_index))
        return entries

    def _build_cpu_timeline(self) -> list[CPUTimelineEntry]:
        blocks: list[CPUTimelineEntry] = []
        for tick, process_id in self._cpu_ticks:
            last = blocks[-1] if blocks else None
            if last is not None and last.process_id == process_id and last.end == tick:
                last.end = tick + 1
                last.duration = last.end - last.start
                continue
            blocks.append(CPUTimelineEntry(
                process_id=process_id,
                start=tick,
                end=tick + 1,
                idle=process_id is None,
            ))
        return blocks

    def _build_event_timeline(self) -> list[EventTimelineEntry]:
        return sorted(self._events, key=lambda e: e.time)
