"""Puertos (interfaces) de la historia pedagógica.

Las vistas son `Protocol`: describen la forma mínima que el builder necesita
leer de un Snapshot. El motor las satisface estructuralmente, sin que este
paquete importe nada de `src.domain` ni de `src.engine` (DIP).
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, Protocol, Sequence

from src.history.models import SimulationHistory


class ProcessView(Protocol):
    id: str
    priority: int
    remaining_cpu: int
    executed_cpu: int
    current_state: Any
    fifo_order: int


class CPUView(Protocol):
    current_process: Optional[str]
    status: Any


class EventView(Protocol):
    time: int
    type: Any
    process_id: Optional[str]
    description: str
    reason: str


class SnapshotView(Protocol):
    time: int
    cpu: Optional[CPUView]
    ready_queue: Sequence[ProcessView]
    blocked_queue: Sequence[ProcessView]
    terminated_processes: Sequence[ProcessView]


class HistoryBuilder(ABC):
    """Contrato que el motor usa para derivar la historia pedagógica.

    El motor solo conoce este contrato, nunca la implementación concreta.
    Ninguna operación puede modificar el snapshot ni los procesos recibidos.
    """

    @abstractmethod
    def reset(self) -> None:
        """Descarta el estado acumulado antes de una nueva simulación."""

    @abstractmethod
    def observe_initial_state(self, snapshot: SnapshotView) -> None:
        """Observa el snapshot inicial (t=0), previo al primer tick."""

    @abstractmethod
    def observe_tick(
        self, snapshot: SnapshotView, events: Sequence[EventView]
    ) -> None:
        """Observa el cierre de un tick.

        `snapshot` es el generado al finalizar el tick, es decir el estado en
        `t+1`; `events` son los eventos registrados durante ese tick, con marca
        temporal `t`. Por lo tanto el tick observado es `snapshot.time - 1`
        (docs/03_modelo_temporal.md, pasos 8 y 9).
        """

    @abstractmethod
    def build(self) -> SimulationHistory:
        """Construye la historia con el estado acumulado hasta el momento."""
