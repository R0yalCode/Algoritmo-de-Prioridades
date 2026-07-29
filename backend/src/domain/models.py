from pydantic import BaseModel, Field, model_validator
from typing import Optional
from .enums import ProcessState, CPUStatus, EventType, SimulationStatus


class IOOperation(BaseModel):
    activation_point: int = Field(..., ge=1)
    duration: int = Field(..., ge=1)


class ProcessCreate(BaseModel):
    id: str
    name: str
    arrival_time: int = Field(..., ge=0)
    cpu_burst: int = Field(..., gt=0)
    priority: int = Field(..., ge=1, le=20)
    io_operations: list[IOOperation] = []


class Process(BaseModel):
    id: str
    name: str
    arrival_time: int
    cpu_burst: int
    priority: int
    io_operations: list[IOOperation] = []

    remaining_cpu: int
    executed_cpu: int = 0
    current_state: ProcessState = ProcessState.NEW
    finish_time: Optional[int] = None
    logical_order: int = 0
    fifo_order: int = 0

    @model_validator(mode="before")
    @classmethod
    def set_remaining_cpu(cls, data: dict) -> dict:
        if "remaining_cpu" not in data:
            if "cpu_burst" in data:
                data["remaining_cpu"] = data["cpu_burst"]
        return data


class CPU(BaseModel):
    current_process: Optional[str] = None
    status: CPUStatus = CPUStatus.IDLE


class Event(BaseModel):
    id: str
    time: int
    type: EventType
    process_id: Optional[str] = None
    description: str = ""
    reason: str = ""
    metadata: dict = {}


class GanttBlock(BaseModel):
    process_id: Optional[str] = None
    start: int
    end: int


class Snapshot(BaseModel):
    time: int
    cpu: Optional[CPU] = None
    ready_queue: list[Process] = []
    blocked_queue: list[Process] = []
    terminated_processes: list[Process] = []
    events: list[Event] = []
    gantt_block: Optional[GanttBlock] = None


class Metric(BaseModel):
    process_id: str
    turnaround_time: int
    waiting_time: int


class GlobalMetrics(BaseModel):
    average_waiting_time: float = 0.0
    average_turnaround_time: float = 0.0
    cpu_utilization: float = 0.0


class SimulationInput(BaseModel):
    processes: list[ProcessCreate]


class SimulationResult(BaseModel):
    snapshots: list[Snapshot] = []
    metrics: list[Metric] = []
    global_metrics: Optional[GlobalMetrics] = None
    events: list[Event] = []
    gantt: list[GanttBlock] = []


class ValidationError(BaseModel):
    code: str
    message: str


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationError] = []
