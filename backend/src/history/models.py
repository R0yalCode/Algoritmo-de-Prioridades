"""Modelo de dominio de la historia pedagógica.

Este modelo es independiente de los modelos del motor (`src.domain.models`):
no los importa ni los reutiliza. Solo contiene tipos primitivos, por lo que
puede describir la historia de cualquier algoritmo de planificación.

Convención temporal (docs/03_modelo_temporal.md, pasos 8 y 9): el tick `t`
ocupa el intervalo [t, t+1) y el snapshot `t+1` describe el estado al finalizar
ese tick. Todas las líneas de tiempo de este modelo están alineadas a ticks:
la observación de tick `t`, el bloque de CPU [t, t+1) y el bloque de E/S
[start, end) hablan del mismo instante.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional


class ReadyStateObservation(BaseModel):
    """Estado de un proceso durante un tick. Todo viene resuelto: el frontend
    no calcula estados, posiciones ni tiempos restantes."""

    time: int
    state: str
    active: bool = False
    priority: int = 0
    remaining_cpu: int = 0
    executed_cpu: int = 0
    fifo_order: int = 0
    ready_position: Optional[int] = None


class ReadyTimelineEntry(BaseModel):
    """Tarjeta permanente de un proceso. Aparece una sola vez, nunca cambia de
    `visual_index` y nunca desaparece: solo cambia el estado en `history`."""

    process_id: str
    priority: int
    first_appearance: int
    visual_index: int
    history: list[ReadyStateObservation] = Field(default_factory=list)


class IOTimelineEntry(BaseModel):
    """Un bloque por cada operación de E/S. Intervalo [start, end)."""

    process_id: str
    start: int
    end: Optional[int] = None
    duration: Optional[int] = None
    priority: int = 0
    remaining_cpu: int = 0
    visual_index: int = 0
    completed: bool = False

    @model_validator(mode="before")
    @classmethod
    def set_duration(cls, data: dict) -> dict:
        if isinstance(data, dict) and data.get("duration") is None:
            if data.get("start") is not None and data.get("end") is not None:
                data["duration"] = data["end"] - data["start"]
        return data


class CPUTimelineEntry(BaseModel):
    """Bloque de ocupación de CPU [start, end). `process_id` es None cuando la
    CPU estuvo ociosa; `idle` lo indica explícitamente."""

    process_id: Optional[str] = None
    start: int
    end: int
    duration: int = 0
    idle: bool = False

    @model_validator(mode="before")
    @classmethod
    def set_duration(cls, data: dict) -> dict:
        if isinstance(data, dict) and "duration" not in data:
            if "start" in data and "end" in data:
                data["duration"] = data["end"] - data["start"]
        return data


class EventTimelineEntry(BaseModel):
    time: int
    type: str
    process_id: Optional[str] = None
    description: str = ""
    reason: str = ""


ReadyTimeline = list[ReadyTimelineEntry]
IOTimeline = list[IOTimelineEntry]
CPUTimeline = list[CPUTimelineEntry]
EventTimeline = list[EventTimelineEntry]


class SimulationHistory(BaseModel):
    ready_timeline: ReadyTimeline = Field(default_factory=list)
    io_timeline: IOTimeline = Field(default_factory=list)
    cpu_timeline: CPUTimeline = Field(default_factory=list)
    event_timeline: EventTimeline = Field(default_factory=list)
