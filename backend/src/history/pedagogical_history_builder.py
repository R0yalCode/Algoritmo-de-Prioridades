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
from src.history.visual_index import VisualIndexRegistry

EVENT_PROCESS_ARRIVAL = "PROCESS_ARRIVAL"
EVENT_CPU_EXECUTION = "CPU_EXECUTION"
EVENT_CPU_IDLE = "CPU_IDLE"
EVENT_IO_START = "IO_START"
EVENT_IO_COMPLETE = "IO_COMPLETE"


def _as_text(value: Any) -> str:
    """Normaliza enums del motor a texto plano, sin acoplarse a su tipo."""
    return str(getattr(value, "value", value))


class PedagogicalHistoryBuilder(HistoryBuilder):
    def __init__(self, visual_index_registry: VisualIndexRegistry | None = None) -> None:
        self._registry = visual_index_registry or VisualIndexRegistry()
        self._tracks: dict[str, ProcessTrack] = {}
        self._events: list[EventTimelineEntry] = []
        self._io_blocks: list[IOBlockDraft] = []
        self._open_io: dict[str, IOBlockDraft] = {}
        self._cpu_ticks: list[tuple[int, Optional[str]]] = []
        self._observed_ticks: int = 0
        self._last_observed_time: int = 0

    def reset(self) -> None:
        self._registry.reset()
        self._tracks.clear()
        self._events.clear()
        self._io_blocks.clear()
        self._open_io.clear()
        self._cpu_ticks.clear()
        self._observed_ticks = 0
        self._last_observed_time = 0

    def observe_initial_state(self, snapshot: SnapshotView) -> None:
        # El snapshot inicial no corresponde a ningún tick: no genera
        # observaciones. Solo reserva el índice visual de un proceso que ya
        # estuviera presente antes del primer tick.
        for process in self._snapshot_processes(snapshot):
            self._track(process.id, snapshot.time)
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
        for track in self._tracks.values():
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
        return self._registry.index_of(process_id)

    def first_appearance_of(self, process_id: str) -> int | None:
        return self._registry.first_appearance_of(process_id)

    def known_process_ids(self) -> list[str]:
        return self._registry.known_processes()

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
                self._track(event.process_id, event.time)
            elif event_type == EVENT_CPU_EXECUTION:
                running_id = event.process_id
            elif event_type == EVENT_IO_START:
                self._open_io_block(event.process_id, event.time)
            elif event_type == EVENT_IO_COMPLETE:
                self._close_io_block(event.process_id, event.time)
        return running_id

    def _absorb_snapshot(
        self, snapshot: SnapshotView, tick: int, running_id: Optional[str]
    ) -> None:
        ready_positions = {p.id: i for i, p in enumerate(snapshot.ready_queue)}
        views: dict[str, ProcessView] = {}
        for process in self._snapshot_processes(snapshot):
            views[process.id] = process
            self._track(process.id, tick)
        if running_id is not None:
            self._track(running_id, tick)

        for process_id, track in self._tracks.items():
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

    def _track(self, process_id: str, time: int) -> ProcessTrack:
        visual_index = self._registry.register(process_id, time)
        track = self._tracks.get(process_id)
        if track is None:
            track = ProcessTrack(
                process_id=process_id,
                visual_index=visual_index,
                first_appearance=self._registry.first_appearance_of(process_id) or 0,
            )
            self._tracks[process_id] = track
        return track

    def _open_io_block(self, process_id: str, time: int) -> None:
        block = IOBlockDraft(
            process_id=process_id,
            source_tick=time,
            start=time + 1,
        )
        self._open_io[process_id] = block
        self._io_blocks.append(block)

    def _close_io_block(self, process_id: str, time: int) -> None:
        block = self._open_io.pop(process_id, None)
        if block is not None:
            block.close(time)

    # --- Construcción ---

    def _build_ready_timeline(self) -> list[ReadyTimelineEntry]:
        entries: list[ReadyTimelineEntry] = []
        for process_id in self._registry.known_processes():
            track = self._tracks[process_id]
            entries.append(ReadyTimelineEntry(
                process_id=process_id,
                priority=track.known_priority(),
                first_appearance=track.first_appearance,
                visual_index=track.visual_index,
                history=[self._to_observation(d) for d in track.drafts],
            ))
        return entries

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
            track = self._tracks.get(block.process_id)
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
