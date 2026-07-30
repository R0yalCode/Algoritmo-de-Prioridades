"""Acumuladores internos del builder.

Son estructuras de trabajo, no modelo público: guardan únicamente escalares
copiados del motor y saben resolver los valores que el snapshot no expone.
"""

from dataclasses import dataclass, field
from typing import Optional

STATE_NEW = "NEW"
STATE_READY = "READY"
STATE_RUNNING = "RUNNING"
STATE_BLOCKED = "BLOCKED"
STATE_TERMINATED = "TERMINATED"


@dataclass
class ObservationDraft:
    """Observación de un proceso durante un tick.

    `exact` indica que los escalares se leyeron directamente de un proceso
    presente en el snapshot. Cuando el proceso estaba en CPU no viaja en
    ninguna cola, así que los valores quedan pendientes y se resuelven después.
    """

    time: int
    state: str
    active: bool = False
    ready_position: Optional[int] = None
    ran: bool = False
    exact: bool = False
    priority: Optional[int] = None
    remaining_cpu: Optional[int] = None
    executed_cpu: Optional[int] = None
    fifo_order: Optional[int] = None

    def apply(
        self,
        priority: int,
        remaining_cpu: int,
        executed_cpu: int,
        fifo_order: int,
        exact: bool,
    ) -> None:
        self.priority = priority
        self.remaining_cpu = remaining_cpu
        self.executed_cpu = executed_cpu
        self.fifo_order = fifo_order
        self.exact = exact

    @property
    def resolved(self) -> bool:
        return self.remaining_cpu is not None and self.executed_cpu is not None


@dataclass
class ProcessTrack:
    process_id: str
    visual_index: int
    first_appearance: int
    drafts: list[ObservationDraft] = field(default_factory=list)

    def draft_at(self, time: int) -> ObservationDraft | None:
        for draft in self.drafts:
            if draft.time == time:
                return draft
        return None

    def resolve(self) -> None:
        """Completa las observaciones sin lectura exacta.

        La CPU consume exactamente una unidad por tick (MODULE-CPU-001), luego
        `executed(t) = executed(t-1) + ran(t)` y
        `executed(t) = executed(t+1) - ran(t+1)`. Ambas direcciones son
        aritmética sobre datos exactos, no una inferencia del algoritmo.
        """
        self._fill_backward()
        self._fill_forward()

    def _fill_backward(self) -> None:
        for i in range(len(self.drafts) - 2, -1, -1):
            current = self.drafts[i]
            if current.resolved:
                continue
            later = self.drafts[i + 1]
            if not later.resolved:
                continue
            step = 1 if later.ran else 0
            current.priority = later.priority
            current.fifo_order = later.fifo_order
            current.executed_cpu = later.executed_cpu - step
            current.remaining_cpu = later.remaining_cpu + step

    def _fill_forward(self) -> None:
        for i in range(1, len(self.drafts)):
            current = self.drafts[i]
            if current.resolved:
                continue
            previous = self.drafts[i - 1]
            if not previous.resolved:
                continue
            step = 1 if current.ran else 0
            current.priority = previous.priority
            current.fifo_order = previous.fifo_order
            current.executed_cpu = previous.executed_cpu + step
            current.remaining_cpu = previous.remaining_cpu - step

    def known_priority(self) -> int:
        for draft in self.drafts:
            if draft.priority is not None:
                return draft.priority
        return 0


@dataclass
class IOBlockDraft:
    """Operación de E/S observada.

    `source_tick` es el tick en el que se registró IO_START: el proceso ejecutó
    su última unidad y quedó bloqueado al cerrar ese tick, por lo que el bloqueo
    ocupa [source_tick + 1, end).
    """

    process_id: str
    source_tick: int
    start: int
    end: Optional[int] = None
    completed: bool = False

    def close(self, end: int) -> None:
        self.end = end
        self.completed = True
